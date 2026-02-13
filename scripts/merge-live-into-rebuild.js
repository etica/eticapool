#!/usr/bin/env node

/**
 * Merge live pool data (tokenpool_production) into the rebuilt database (tokenpool_rebuild).
 *
 * The rebuilt DB has complete historical balance_payments and minerData balances
 * from the backup + blockchain recovery. The live pool has operational state
 * (current challenge, pending shares, PPLNS rewards) and recent payments made
 * since the hack incident.
 *
 * This script:
 *   1. Appends transactions & balance_payments from live pool that are NEWER
 *      than what the rebuild already has (block > cutoff)
 *   2. Replaces operational singleton collections (poolStatus, miningContractData, etc.)
 *   3. Replaces operational multi-doc collections (ppnls_rewards, miner_pendingshares, etc.)
 *   4. Merges minerData: rebuild's historical totals + live pool's recent payments + live operational fields
 *
 * Usage:
 *   node scripts/merge-live-into-rebuild.js [options]
 *
 * Options:
 *   --mongodb-uri    MongoDB URI (default: mongodb://localhost:27017)
 *   --rebuild-db     Rebuilt database name (default: tokenpool_rebuild)
 *   --live-db        Live pool database name (default: tokenpool_production)
 *   --dry-run        Show what would be done without writing (default)
 *   --write          Actually write to database
 */

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    rebuildDb: 'tokenpool_rebuild',
    liveDb: 'tokenpool_production',
    dryRun: true
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--mongodb-uri': opts.mongodbUri = args[++i]; break;
      case '--rebuild-db': opts.rebuildDb = args[++i]; break;
      case '--live-db': opts.liveDb = args[++i]; break;
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
  console.log('║   Merge live pool data into rebuilt database      ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`  Rebuild DB:   ${opts.rebuildDb}`);
  console.log(`  Live DB:      ${opts.liveDb}`);
  console.log(`  Mode:         ${opts.dryRun ? 'DRY RUN (use --write to apply)' : 'LIVE WRITE'}`);

  const Mongodb = (await import('mongodb')).default;
  const mongoClient = await Mongodb.MongoClient.connect(opts.mongodbUri, {
    useUnifiedTopology: true
  });
  const rebuildDbo = mongoClient.db(opts.rebuildDb);
  const liveDbo = mongoClient.db(opts.liveDb);

  // ─── Find the cutoff block (max block in rebuild's transactions) ───
  const maxTxInRebuild = await rebuildDbo.collection('transactions')
    .find({ txType: 'batched_payment' })
    .sort({ block: -1 })
    .limit(1)
    .toArray();

  const cutoffBlock = maxTxInRebuild.length > 0 ? maxTxInRebuild[0].block : 0;
  console.log(`\n  Rebuild max transaction block: ${cutoffBlock}`);

  // ═══════════════════════════════════════════════════
  // STEP 1: Append new transactions (block > cutoff)
  // ═══════════════════════════════════════════════════
  console.log('\n─── Step 1: Append new transactions ───');
  const newTxs = await liveDbo.collection('transactions')
    .find({ txType: 'batched_payment', block: { $gt: cutoffBlock } })
    .toArray();
  console.log(`  Live transactions above block ${cutoffBlock}: ${newTxs.length}`);

  if (!opts.dryRun && newTxs.length > 0) {
    const result = await rebuildDbo.collection('transactions')
      .insertMany(newTxs.map(tx => {
        const { _id, ...rest } = tx;
        return rest;
      }), { ordered: false });
    console.log(`  Inserted: ${result.insertedCount} transactions`);
  } else if (opts.dryRun) {
    console.log(`  [DRY RUN] Would insert ${newTxs.length} transactions`);
  }

  // ═══════════════════════════════════════════════════
  // STEP 2: Append new balance_payments (block > cutoff)
  // ═══════════════════════════════════════════════════
  console.log('\n─── Step 2: Append new balance_payments ───');
  const newPayments = await liveDbo.collection('balance_payments')
    .find({ block: { $gt: cutoffBlock } })
    .toArray();
  console.log(`  Live balance_payments above block ${cutoffBlock}: ${newPayments.length}`);

  if (!opts.dryRun && newPayments.length > 0) {
    const result = await rebuildDbo.collection('balance_payments')
      .insertMany(newPayments.map(p => {
        const { _id, ...rest } = p;
        return rest;
      }), { ordered: false });
    console.log(`  Inserted: ${result.insertedCount} balance_payments`);
  } else if (opts.dryRun) {
    console.log(`  [DRY RUN] Would insert ${newPayments.length} balance_payments`);
  }

  // ═══════════════════════════════════════════════════
  // STEP 3: Replace operational singleton collections
  // ═══════════════════════════════════════════════════
  console.log('\n─── Step 3: Replace operational singletons ───');
  const singletons = [
    'miningContractData',
    'poolStatus',
    'ethBlockNumber',
    'poolAccountBalances',
    'lastFullPayoutTime',
    'poolGlobalMetrics',
    'transactionsMetrics'
  ];

  for (const collName of singletons) {
    const liveDocs = await liveDbo.collection(collName).find({}).toArray();
    const rebuildCount = await rebuildDbo.collection(collName).find({}).count();

    if (liveDocs.length === 0) {
      console.log(`  ${collName}: SKIP (empty in live DB)`);
      continue;
    }

    if (!opts.dryRun) {
      await rebuildDbo.collection(collName).deleteMany({});
      await rebuildDbo.collection(collName).insertMany(
        liveDocs.map(d => { const { _id, ...rest } = d; return rest; })
      );
      console.log(`  ${collName}: replaced ${rebuildCount} → ${liveDocs.length} docs`);
    } else {
      console.log(`  ${collName}: [DRY RUN] would replace ${rebuildCount} → ${liveDocs.length} docs`);
    }
  }

  // ═══════════════════════════════════════════════════
  // STEP 4: Replace operational multi-doc collections
  // ═══════════════════════════════════════════════════
  console.log('\n─── Step 4: Replace operational collections ───');
  const operationalCollections = [
    'ppnls_rewards',
    'totaldiff_challengenumber',
    'miner_pendingshares',
    'miner_challengediff',
    'stats_payment',
    'poolStatsRecords',
    'networkStatsRecords'
  ];

  for (const collName of operationalCollections) {
    const liveCount = await liveDbo.collection(collName).find({}).count();
    const rebuildCount = await rebuildDbo.collection(collName).find({}).count();

    if (liveCount === 0) {
      console.log(`  ${collName}: SKIP (empty in live DB)`);
      continue;
    }

    if (!opts.dryRun) {
      await rebuildDbo.collection(collName).deleteMany({});

      // Insert in batches for large collections
      const BATCH = 5000;
      let inserted = 0;
      const cursor = liveDbo.collection(collName).find({});
      let batch = [];

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        const { _id, ...rest } = doc;
        batch.push(rest);

        if (batch.length >= BATCH) {
          const result = await rebuildDbo.collection(collName).insertMany(batch, { ordered: false });
          inserted += result.insertedCount;
          batch = [];
        }
      }
      if (batch.length > 0) {
        const result = await rebuildDbo.collection(collName).insertMany(batch, { ordered: false });
        inserted += result.insertedCount;
      }

      console.log(`  ${collName}: replaced ${rebuildCount} → ${inserted} docs`);
    } else {
      console.log(`  ${collName}: [DRY RUN] would replace ${rebuildCount} → ${liveCount} docs`);
    }
  }

  // ═══════════════════════════════════════════════════
  // STEP 5: Merge minerData
  // ═══════════════════════════════════════════════════
  console.log('\n─── Step 5: Merge minerData ───');
  console.log('  Strategy: rebuild historical totals + NEW live payments (block > cutoff) + live operational fields');

  // Get all live minerData (152 docs — small enough for memory)
  const liveMiners = await liveDbo.collection('minerData').find({}).toArray();
  console.log(`  Live minerData records: ${liveMiners.length}`);

  // Calculate per-miner totals ONLY from live pool payments ABOVE the cutoff block.
  // Payments at or below cutoffBlock are already included in the rebuild's totals.
  // Using the full live pool totals would double-count the overlap zone.
  const newPaymentTotals = {};
  const newLivePayments = await liveDbo.collection('balance_payments')
    .find({ confirmed: true, block: { $gt: cutoffBlock } }).toArray();

  console.log(`  Live payments above cutoff (block > ${cutoffBlock}): ${newLivePayments.length}`);

  for (const p of newLivePayments) {
    const addr = p.minerEthAddress.toLowerCase();
    if (!newPaymentTotals[addr]) newPaymentTotals[addr] = { total: BigInt(0), count: 0 };
    newPaymentTotals[addr].total += BigInt(p.amountToPay);
    newPaymentTotals[addr].count++;
  }

  let merged = 0, liveOnly = 0, unchanged = 0;

  for (const liveMiner of liveMiners) {
    const addr = liveMiner.minerEthAddress;
    const lookupAddr = addr.toLowerCase();

    const rebuildMiner = await rebuildDbo.collection('minerData').findOne({
      minerEthAddress: addr
    });

    // How much was this miner paid in the NEW (non-overlap) live payments?
    const newPaid = newPaymentTotals[lookupAddr] ? Number(newPaymentTotals[lookupAddr].total) : 0;

    if (!opts.dryRun) {
      if (rebuildMiner) {
        // Merge: rebuild's historical totals + only NEW live payments (above cutoff)
        const rebuildAlltime = Number(rebuildMiner.alltimeTokenBalance || 0);
        const rebuildAwarded = Number(rebuildMiner.tokensAwarded || 0);
        const rebuildReceived = Number(rebuildMiner.tokensReceived || 0);

        await rebuildDbo.collection('minerData').updateOne(
          { minerEthAddress: addr },
          { $set: {
            // Historical totals + ONLY new payments (no double-counting overlap)
            alltimeTokenBalance: rebuildAlltime + newPaid,
            tokensAwarded: rebuildAwarded + newPaid,
            tokensReceived: rebuildReceived + newPaid,
            // Operational fields from live pool (current state)
            tokenBalance: liveMiner.tokenBalance || 0,
            shareCredits: liveMiner.shareCredits || 0,
            avgHashrate: liveMiner.avgHashrate || 0,
            lastSubmittedSolutionTime: liveMiner.lastSubmittedSolutionTime || 0,
            validSubmittedSolutionsCount: (rebuildMiner.validSubmittedSolutionsCount || 0) + (liveMiner.validSubmittedSolutionsCount || 0),
            minerport: liveMiner.minerport || rebuildMiner.minerport || 8081
          }}
        );
        merged++;
      } else {
        // Miner only exists in live pool (new miner since hack, or worker-suffixed address)
        const { _id, ...rest } = liveMiner;
        await rebuildDbo.collection('minerData').updateOne(
          { minerEthAddress: addr },
          { $set: rest },
          { upsert: true }
        );
        liveOnly++;
      }
    } else {
      if (rebuildMiner) {
        merged++;
        if (newPaid > 0) {
          console.log(`    ${addr}: +${(newPaid / 1e18).toFixed(4)} ETI from new payments`);
        }
      } else {
        liveOnly++;
      }
    }
  }

  if (opts.dryRun) {
    console.log(`  [DRY RUN] Would merge ${merged} miners, insert ${liveOnly} live-only miners`);
  } else {
    console.log(`  Merged: ${merged} miners (rebuild history + live activity)`);
    console.log(`  Live-only: ${liveOnly} miners (new since hack)`);
  }

  // ═══════════════════════════════════════════════════
  // STEP 6: Copy pool_mints that are newer
  // ═══════════════════════════════════════════════════
  console.log('\n─── Step 6: Append new pool_mints ───');
  const maxMintInRebuild = await rebuildDbo.collection('pool_mints')
    .find({})
    .sort({ block: -1 })
    .limit(1)
    .toArray();
  const mintCutoff = maxMintInRebuild.length > 0 ? maxMintInRebuild[0].block : 0;

  const newMints = await liveDbo.collection('pool_mints')
    .find({ block: { $gt: mintCutoff } })
    .toArray();
  console.log(`  Live pool_mints above block ${mintCutoff}: ${newMints.length}`);

  if (!opts.dryRun && newMints.length > 0) {
    const result = await rebuildDbo.collection('pool_mints')
      .insertMany(newMints.map(m => { const { _id, ...rest } = m; return rest; }), { ordered: false });
    console.log(`  Inserted: ${result.insertedCount} pool_mints`);
  } else if (opts.dryRun) {
    console.log(`  [DRY RUN] Would insert ${newMints.length} pool_mints`);
  }

  // ═══════════════════════════════════════════════════
  // STEP 7: Copy all_eti_mints that are newer
  // ═══════════════════════════════════════════════════
  console.log('\n─── Step 7: Append new all_eti_mints ───');
  const maxEtiMintInRebuild = await rebuildDbo.collection('all_eti_mints')
    .find({})
    .sort({ block: -1 })
    .limit(1)
    .toArray();
  const etiMintCutoff = maxEtiMintInRebuild.length > 0 ? maxEtiMintInRebuild[0].block : 0;

  const newEtiMints = await liveDbo.collection('all_eti_mints')
    .find({ block: { $gt: etiMintCutoff } })
    .toArray();
  console.log(`  Live all_eti_mints above block ${etiMintCutoff}: ${newEtiMints.length}`);

  if (!opts.dryRun && newEtiMints.length > 0) {
    const result = await rebuildDbo.collection('all_eti_mints')
      .insertMany(newEtiMints.map(m => { const { _id, ...rest } = m; return rest; }), { ordered: false });
    console.log(`  Inserted: ${result.insertedCount} all_eti_mints`);
  } else if (opts.dryRun) {
    console.log(`  [DRY RUN] Would insert ${newEtiMints.length} all_eti_mints`);
  }

  // ═══════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════
  const finalPayments = await rebuildDbo.collection('balance_payments').find({}).count();
  const finalTxs = await rebuildDbo.collection('transactions').find({ txType: 'batched_payment' }).count();
  const finalMiners = await rebuildDbo.collection('minerData').find({}).count();

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  balance_payments:   ${finalPayments}`);
  console.log(`  transactions:       ${finalTxs}`);
  console.log(`  minerData:          ${finalMiners}`);
  console.log(`  New TXs appended:   ${newTxs.length}`);
  console.log(`  New payments appended: ${newPayments.length}`);
  console.log(`  minerData merged:   ${merged} (+ ${liveOnly} live-only)`);

  await mongoClient.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
