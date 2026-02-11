#!/usr/bin/env node

/**
 * Find Recovery Start Point — Query a restored backup DB to find where to resume
 *
 * Inspects pool_mints, balance_payments, transactions, and all_eti_mints to find
 * the highest block number across all collections, then suggests the --from-block
 * value for recover-from-blockchain.js.
 *
 * Usage:
 *   node scripts/find-recovery-start.js [options]
 *
 * Options:
 *   --mongodb-uri   MongoDB URI (default: mongodb://localhost:27017)
 *   --db-name       Database name to inspect (default: tokenpool_rebuild)
 *
 * Example workflow:
 *   1. mongorestore --db tokenpool_rebuild /path/to/backup/tokenpool_production
 *   2. node scripts/find-recovery-start.js --db-name tokenpool_rebuild
 *   3. Use the printed --from-block value with recover-from-blockchain.js
 */

import { MongoClient } from 'mongodb';

const args = process.argv.slice(2);
let mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
let dbName = 'tokenpool_rebuild';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--mongodb-uri') mongodbUri = args[++i];
  else if (args[i] === '--db-name') dbName = args[++i];
  else if (args[i] === '--help') {
    console.log('Usage: node scripts/find-recovery-start.js [--mongodb-uri URI] [--db-name NAME]');
    process.exit(0);
  }
}

async function main() {
  console.log(`Connecting to ${mongodbUri}, database: ${dbName}\n`);

  const client = await MongoClient.connect(mongodbUri, { useUnifiedTopology: true });
  const db = client.db(dbName);

  // List all collections
  const collections = await db.listCollections().toArray();
  const collNames = collections.map(c => c.name).sort();
  console.log(`Collections in ${dbName}: ${collNames.length}`);
  for (const name of collNames) {
    const count = await db.collection(name).estimatedDocumentCount();
    console.log(`  ${name.padEnd(30)} ${count.toLocaleString()} docs`);
  }

  console.log('\n─── Finding latest block numbers ───\n');

  // 1. pool_mints — blockNumber field
  let poolMintsMax = null;
  let poolMintsCount = 0;
  if (collNames.includes('pool_mints')) {
    poolMintsCount = await db.collection('pool_mints').countDocuments();
    const latest = await db.collection('pool_mints')
      .find({})
      .sort({ blockNumber: -1 })
      .limit(1)
      .toArray();
    if (latest.length > 0) {
      poolMintsMax = latest[0].blockNumber;
      console.log(`  pool_mints:         ${poolMintsCount} docs, latest block: ${poolMintsMax}`);
      console.log(`    Last TX: ${latest[0].transactionhash}`);
      console.log(`    Epoch:   ${latest[0].epochCount}`);
      console.log(`    Reward:  ${latest[0].blockreward} wei`);
    }
  } else {
    console.log('  pool_mints:         (collection not found)');
  }

  // 2. all_eti_mints — blockNumber field
  let allMintsMax = null;
  if (collNames.includes('all_eti_mints')) {
    const count = await db.collection('all_eti_mints').countDocuments();
    const latest = await db.collection('all_eti_mints')
      .find({})
      .sort({ blockNumber: -1 })
      .limit(1)
      .toArray();
    if (latest.length > 0) {
      allMintsMax = latest[0].blockNumber;
      console.log(`  all_eti_mints:      ${count} docs, latest block: ${allMintsMax}`);
    }
  } else {
    console.log('  all_eti_mints:      (collection not found)');
  }

  // 3. balance_payments — block field
  let paymentsMax = null;
  let paymentsCount = 0;
  if (collNames.includes('balance_payments')) {
    paymentsCount = await db.collection('balance_payments').countDocuments();
    const latest = await db.collection('balance_payments')
      .find({ block: { $exists: true, $ne: null } })
      .sort({ block: -1 })
      .limit(1)
      .toArray();
    if (latest.length > 0) {
      paymentsMax = latest[0].block;
      console.log(`  balance_payments:   ${paymentsCount} docs, latest block: ${paymentsMax}`);
      console.log(`    Last miner: ${latest[0].minerEthAddress}`);
      console.log(`    Amount:     ${latest[0].amountToPay} wei`);
      if (latest[0].txHash) console.log(`    TX hash:    ${latest[0].txHash}`);
    }
  } else {
    console.log('  balance_payments:   (collection not found)');
  }

  // 4. transactions — block field (queue time) or blockNumber (recovery)
  let txMax = null;
  if (collNames.includes('transactions')) {
    const count = await db.collection('transactions').countDocuments();
    // Check both 'block' and 'blockNumber' fields
    const latestByBlock = await db.collection('transactions')
      .find({ block: { $exists: true, $type: 'number' } })
      .sort({ block: -1 })
      .limit(1)
      .toArray();
    const latestByBlockNumber = await db.collection('transactions')
      .find({ blockNumber: { $exists: true, $type: 'number' } })
      .sort({ blockNumber: -1 })
      .limit(1)
      .toArray();

    const b1 = latestByBlock.length > 0 ? latestByBlock[0].block : 0;
    const b2 = latestByBlockNumber.length > 0 ? latestByBlockNumber[0].blockNumber : 0;
    txMax = Math.max(b1, b2) || null;
    if (txMax) {
      console.log(`  transactions:       ${count} docs, latest block: ${txMax}`);
    } else {
      console.log(`  transactions:       ${count} docs (no block numbers found)`);
    }
  } else {
    console.log('  transactions:       (collection not found)');
  }

  // 5. minerData — check count and sample
  if (collNames.includes('minerData')) {
    const count = await db.collection('minerData').countDocuments();
    console.log(`  minerData:          ${count} miners`);
  }

  // Find the overall maximum block
  const allBlocks = [poolMintsMax, allMintsMax, paymentsMax, txMax].filter(b => b != null);

  console.log('\n─── Recovery Recommendation ───\n');

  if (allBlocks.length === 0) {
    console.log('  No block numbers found in any collection.');
    console.log('  You should run the full recovery from block 0.');
    console.log('\n  Command:');
    console.log('    node scripts/recover-from-blockchain.js \\');
    console.log('      --pool-address <POOL_ADDRESS> \\');
    console.log('      --payment-address <PAYMENT_ADDRESS> \\');
    console.log('      --use-eticascan --dry-run');
  } else {
    const maxBlock = Math.max(...allBlocks);
    // Start a few blocks BEFORE the max to ensure overlap (catch any missed TXs)
    const safeStart = Math.max(0, maxBlock - 100);

    console.log(`  Highest block in backup:    ${maxBlock}`);
    console.log(`  Safe starting block:        ${safeStart} (100-block overlap for safety)`);
    console.log(`  Pool mints in backup:       ${poolMintsCount}`);
    console.log(`  Payments in backup:         ${paymentsCount}`);
    console.log('');
    console.log('  The recovery script uses upsert/skip logic, so overlapping blocks are safe');
    console.log('  (duplicate records will be detected by transactionhash/uuid and skipped).');
    console.log('');
    console.log('  Suggested command (dry-run first):');
    console.log('    node scripts/recover-from-blockchain.js \\');
    console.log(`      --pool-address <POOL_ADDRESS> \\`);
    console.log(`      --payment-address <PAYMENT_ADDRESS> \\`);
    console.log(`      --from-block ${safeStart} \\`);
    console.log(`      --db-name ${dbName} \\`);
    console.log('      --use-eticascan --dry-run');
    console.log('');
    console.log('  After verifying dry-run output, run with --write to apply:');
    console.log('    node scripts/recover-from-blockchain.js \\');
    console.log(`      --pool-address <POOL_ADDRESS> \\`);
    console.log(`      --payment-address <PAYMENT_ADDRESS> \\`);
    console.log(`      --from-block ${safeStart} \\`);
    console.log(`      --db-name ${dbName} \\`);
    console.log('      --use-eticascan --write');
  }

  // Check approximate date of backup by looking at _id timestamps
  console.log('\n─── Backup Date Estimation ───\n');
  try {
    // MongoDB ObjectIds encode their creation timestamp
    if (collNames.includes('pool_mints') && poolMintsCount > 0) {
      const lastDoc = await db.collection('pool_mints')
        .find({})
        .sort({ _id: -1 })
        .limit(1)
        .toArray();
      if (lastDoc.length > 0 && lastDoc[0]._id) {
        const ts = lastDoc[0]._id.getTimestamp();
        console.log(`  Latest pool_mints _id timestamp:       ${ts.toISOString()}`);
      }
    }
    if (collNames.includes('balance_payments') && paymentsCount > 0) {
      const lastDoc = await db.collection('balance_payments')
        .find({})
        .sort({ _id: -1 })
        .limit(1)
        .toArray();
      if (lastDoc.length > 0 && lastDoc[0]._id) {
        const ts = lastDoc[0]._id.getTimestamp();
        console.log(`  Latest balance_payments _id timestamp:  ${ts.toISOString()}`);
      }
    }
    if (collNames.includes('transactions')) {
      const lastDoc = await db.collection('transactions')
        .find({})
        .sort({ _id: -1 })
        .limit(1)
        .toArray();
      if (lastDoc.length > 0 && lastDoc[0]._id) {
        const ts = lastDoc[0]._id.getTimestamp();
        console.log(`  Latest transactions _id timestamp:      ${ts.toISOString()}`);
      }
    }
  } catch (e) {
    console.log(`  Could not estimate backup date: ${e.message}`);
  }

  await client.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
