#!/usr/bin/env node

/**
 * Rebuild balance_payments and minerData from the transactions collection.
 *
 * The transactions collection (already populated by recover-from-blockchain.js)
 * contains decoded multisend() data with all payment details. This script:
 *
 *   1. Reads all transactions with txType=batched_payment from DB
 *   2. Expands txData.payments into balance_payments records (bulk insert)
 *   3. Recomputes minerData balances from the expanded payments
 *
 * No RPC or eticascan calls needed — everything comes from DB.
 *
 * Usage:
 *   node scripts/rebuild-from-transactions.js [options]
 *
 * Options:
 *   --mongodb-uri    MongoDB URI (default: mongodb://localhost:27017)
 *   --db-name        Database name (default: tokenpool_rebuild)
 *   --from-block     Only process transactions from this block onward (default: 0)
 *   --dry-run        Show what would be done without writing (default)
 *   --write          Actually write to database
 */

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.POOL_DB_NAME || 'tokenpool_rebuild',
    fromBlock: 0,
    dryRun: true
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--mongodb-uri': opts.mongodbUri = args[++i]; break;
      case '--db-name': opts.dbName = args[++i]; break;
      case '--from-block': opts.fromBlock = parseInt(args[++i]); break;
      case '--dry-run': opts.dryRun = true; break;
      case '--write': opts.dryRun = false; break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs();

  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Rebuild balance_payments from transactions      ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`  DB:           ${opts.dbName}`);
  console.log(`  From block:   ${opts.fromBlock}`);
  console.log(`  Mode:         ${opts.dryRun ? 'DRY RUN (use --write to apply)' : 'LIVE WRITE'}`);

  const Mongodb = (await import('mongodb')).default;
  const mongoClient = await Mongodb.MongoClient.connect(opts.mongodbUri, {
    useUnifiedTopology: true
  });
  const dbo = mongoClient.db(opts.dbName);

  // ─── Step 1: Read transactions from DB ───
  const query = { txType: 'batched_payment' };
  if (opts.fromBlock > 0) {
    query.block = { $gte: opts.fromBlock };
  }

  console.log('\n  Reading transactions from DB...');
  const transactions = await dbo.collection('transactions').find(query).toArray();
  console.log(`  Found ${transactions.length} batched_payment transactions`);

  if (transactions.length === 0) {
    console.log('  No transactions found. Run recover-from-blockchain.js --steps 2 first.');
    await mongoClient.close();
    return;
  }

  // ─── Step 2: Expand into balance_payments ───
  console.log('  Expanding txData.payments into balance_payments...');
  const allPayments = [];
  let skippedNoData = 0;

  for (const tx of transactions) {
    if (!tx.txData || !tx.txData.payments || tx.txData.payments.length === 0) {
      skippedNoData++;
      continue;
    }

    for (const payment of tx.txData.payments) {
      allPayments.push({
        minerEthAddress: payment.minerEthAddress.toLowerCase(),
        amountToPay: Number(payment.amountToPay),
        block: tx.block,
        batchedPaymentUuid: tx.txData.uuid,
        txHash: tx.txHash,
        confirmed: tx.status === 'success',
        broadcastedAt: null
      });
    }
  }

  console.log(`  Expanded to ${allPayments.length} balance_payment records`);
  if (skippedNoData > 0) {
    console.log(`  Skipped ${skippedNoData} transactions with no payment data`);
  }

  // ─── Step 3: Bulk insert balance_payments ───
  if (!opts.dryRun && allPayments.length > 0) {
    console.log(`  Inserting ${allPayments.length} balance_payments (bulk)...`);
    let inserted = 0;
    const BATCH = 1000;
    for (let i = 0; i < allPayments.length; i += BATCH) {
      const batch = allPayments.slice(i, i + BATCH);
      try {
        const result = await dbo.collection('balance_payments').insertMany(batch, { ordered: false });
        inserted += result.insertedCount;
      } catch (err) {
        console.log(`\n  ERROR in batch: ${err.message}`);
      }
      process.stdout.write(`\r  balance_payments progress: ${Math.min(i + BATCH, allPayments.length)}/${allPayments.length} (${inserted} inserted)`);
    }
    console.log(`\n  balance_payments: ${inserted} inserted`);
  } else if (opts.dryRun) {
    console.log(`  [DRY RUN] Would insert ${allPayments.length} balance_payments`);
  }

  // ─── Step 4: Recompute minerData balances ───
  console.log('\n  Recomputing minerData balances from payments...');

  const minerTotals = {};
  for (const payment of allPayments) {
    if (!payment.confirmed) continue;

    const addr = payment.minerEthAddress.slice(0, 42).toLowerCase();
    const amount = BigInt(payment.amountToPay);

    if (!minerTotals[addr]) {
      minerTotals[addr] = { totalPaid: BigInt(0), paymentCount: 0 };
    }
    minerTotals[addr].totalPaid += amount;
    minerTotals[addr].paymentCount++;
  }

  const miners = Object.entries(minerTotals).sort((a, b) =>
    Number(b[1].totalPaid - a[1].totalPaid)
  );

  console.log(`  Found ${miners.length} unique miners with confirmed payments`);
  console.log('\n  Top miners by total paid:');
  for (const [addr, data] of miners.slice(0, 10)) {
    const etiAmount = Number(data.totalPaid) / 1e18;
    console.log(`    ${addr}: ${etiAmount.toFixed(4)} ETI (${data.paymentCount} payments)`);
  }
  if (miners.length > 10) console.log(`    ... and ${miners.length - 10} more`);

  if (!opts.dryRun) {
    console.log('\n  Updating minerData records...');
    let updated = 0, created = 0, unchanged = 0;

    for (const [addr, data] of miners) {
      const totalPaidNum = Number(data.totalPaid);
      const existing = await dbo.collection('minerData').findOne({ minerEthAddress: addr });

      if (existing) {
        const currentAlltime = Number(existing.alltimeTokenBalance || 0);
        const currentReceived = Number(existing.tokensReceived || 0);

        if (totalPaidNum > currentAlltime) {
          await dbo.collection('minerData').updateOne(
            { minerEthAddress: addr },
            { $set: {
              alltimeTokenBalance: totalPaidNum,
              tokensAwarded: totalPaidNum,
              tokensReceived: totalPaidNum
            }}
          );
          updated++;
        } else if (totalPaidNum > currentReceived) {
          await dbo.collection('minerData').updateOne(
            { minerEthAddress: addr },
            { $set: { tokensReceived: totalPaidNum } }
          );
          updated++;
        } else {
          unchanged++;
        }
      } else {
        await dbo.collection('minerData').insertOne({
          minerEthAddress: addr,
          shareCredits: 0,
          tokenBalance: 0,
          alltimeTokenBalance: totalPaidNum,
          tokensAwarded: totalPaidNum,
          tokensReceived: totalPaidNum,
          validSubmittedSolutionsCount: 0,
          lastSubmittedSolutionTime: 0,
          avgHashrate: 0,
          minerport: 8081
        });
        created++;
      }

      const total = updated + created + unchanged;
      if (total % 100 === 0) {
        process.stdout.write(`\r  minerData progress: ${total}/${miners.length} (${updated} updated, ${created} created, ${unchanged} unchanged)`);
      }
    }

    console.log(`\n  minerData: ${updated} updated, ${created} created, ${unchanged} unchanged`);
  } else {
    console.log(`\n  [DRY RUN] Would update/create minerData for ${miners.length} miners`);
  }

  // ─── Summary ───
  const confirmedPayments = allPayments.filter(p => p.confirmed);
  const totalPaid = confirmedPayments.reduce((sum, p) => sum + BigInt(p.amountToPay), BigInt(0));

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Transactions read:       ${transactions.length}`);
  console.log(`  Payments expanded:       ${allPayments.length}`);
  console.log(`  Confirmed payments:      ${confirmedPayments.length}`);
  console.log(`  Total ETI paid:          ${(Number(totalPaid) / 1e18).toFixed(4)} ETI`);
  console.log(`  Unique miners:           ${miners.length}`);

  await mongoClient.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
