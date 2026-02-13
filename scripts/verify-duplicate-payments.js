#!/usr/bin/env node

/**
 * Verify duplicate balance_payments in the database against on-chain data.
 *
 * Finds (batchedPaymentUuid, minerEthAddress) combos with count > 1,
 * then decodes the actual multisend() call on-chain to see how many times
 * that miner really appears in the dests array.
 *
 * READ-ONLY — does not modify the database.
 *
 * Usage:
 *   node scripts/verify-duplicate-payments.js [options]
 *
 * Options:
 *   --mongodb-uri    MongoDB URI (default: mongodb://localhost:27017)
 *   --db-name        Database name (default: tokenpool_rebuild)
 *   --eticascan-url  Eticascan API base (default: https://eticascan.org/apiv1)
 *   --limit          Max number of duplicate groups to check (default: 20)
 */

import abiModule from 'web3-eth-abi';
const abiCoder = abiModule.default || abiModule;
import https from 'https';
import http from 'http';

const MULTISEND_ABI = {
  name: 'multisend',
  type: 'function',
  inputs: [
    { name: '_tokenAddr', type: 'address' },
    { name: 'paymentId', type: 'bytes32' },
    { name: 'dests', type: 'address[]' },
    { name: 'values', type: 'uint256[]' }
  ]
};

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.POOL_DB_NAME || 'tokenpool_rebuild',
    eticascanUrl: 'https://eticascan.org/apiv1',
    limit: 20
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--mongodb-uri': opts.mongodbUri = args[++i]; break;
      case '--db-name': opts.dbName = args[++i]; break;
      case '--eticascan-url': opts.eticascanUrl = args[++i]; break;
      case '--limit': opts.limit = parseInt(args[++i]); break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }
  return opts;
}

function eticascanFetch(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint}`;
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const opts = parseArgs();

  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Verify Duplicate balance_payments vs On-Chain   ║');
  console.log('║   READ-ONLY — no changes to database              ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`  DB:           ${opts.dbName}`);
  console.log(`  Eticascan:    ${opts.eticascanUrl}`);
  console.log(`  Sample size:  ${opts.limit} duplicate groups`);

  const Mongodb = (await import('mongodb')).default;
  const mongoClient = await Mongodb.MongoClient.connect(opts.mongodbUri, {
    useUnifiedTopology: true
  });
  const dbo = mongoClient.db(opts.dbName);

  // Find duplicate (uuid, miner) combos
  console.log('\n  Finding duplicate (batchedPaymentUuid, minerEthAddress) groups...');
  const duplicates = await dbo.collection('balance_payments').aggregate([
    {
      $group: {
        _id: { uuid: '$batchedPaymentUuid', miner: '$minerEthAddress' },
        count: { $sum: 1 },
        amounts: { $push: '$amountToPay' },
        txHashes: { $addToSet: '$txHash' }
      }
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: opts.limit }
  ], { allowDiskUse: true }).toArray();

  console.log(`  Found ${duplicates.length} duplicate groups\n`);

  if (duplicates.length === 0) {
    console.log('  No duplicates found.');
    await mongoClient.close();
    return;
  }

  // For each group, check on-chain
  const multisendSig = abiCoder.encodeFunctionSignature(MULTISEND_ABI);
  const txCache = {};
  let totalFalsePositives = 0;
  let totalLegitimate = 0;
  let totalUnverified = 0;
  let totalExtraRecords = 0;
  let totalMissingRecords = 0;

  for (let i = 0; i < duplicates.length; i++) {
    const dup = duplicates[i];
    const uuid = dup._id.uuid;
    const miner = dup._id.miner;
    const dbCount = dup.count;
    const txHash = dup.txHashes[0];

    console.log(`  ─── Group ${i + 1}/${duplicates.length} ───`);
    console.log(`  UUID:      ${uuid}`);
    console.log(`  Miner:     ${miner}`);
    console.log(`  DB count:  ${dbCount}`);
    console.log(`  DB amounts:  ${dup.amounts.map(a => (Number(a) / 1e18).toFixed(4)).join(', ')} ETI`);
    console.log(`  TX hash:   ${txHash}`);

    // Decode on-chain TX (cached per txHash)
    if (!txCache[txHash]) {
      const txResp = await eticascanFetch(opts.eticascanUrl, `/tx/${txHash}`);
      if (txResp && txResp.querysuccess && txResp.result && txResp.result.input) {
        const input = txResp.result.input;
        const selector = input.slice(0, 10);
        if (selector === multisendSig) {
          const decoded = abiCoder.decodeParameters(
            MULTISEND_ABI.inputs,
            '0x' + input.slice(10)
          );
          txCache[txHash] = {
            dests: decoded.dests.map(d => d.toLowerCase()),
            values: decoded.values.map(v => v.toString())
          };
        } else {
          console.log(`  WARNING: selector ${selector} != multisend`);
          txCache[txHash] = null;
        }
      } else {
        console.log(`  WARNING: Could not fetch TX from eticascan`);
        txCache[txHash] = null;
      }
      await sleep(800);
    }

    const txData = txCache[txHash];
    if (!txData) {
      console.log(`  On-chain:  COULD NOT VERIFY`);
      console.log(`  RESULT:    UNVERIFIED\n`);
      totalUnverified++;
      continue;
    }

    // Count how many times this miner appears in on-chain dests
    let onChainCount = 0;
    const onChainAmounts = [];
    for (let j = 0; j < txData.dests.length; j++) {
      if (txData.dests[j] === miner) {
        onChainCount++;
        onChainAmounts.push(Number(txData.values[j]));
      }
    }

    console.log(`  On-chain:  ${onChainCount} payment(s) to this miner`);
    console.log(`  On-chain amounts: ${onChainAmounts.map(a => (a / 1e18).toFixed(4)).join(', ')} ETI`);

    if (dbCount > onChainCount) {
      const excess = dbCount - onChainCount;
      console.log(`  RESULT:    FALSE POSITIVE — ${excess} extra record(s) in DB`);
      totalFalsePositives++;
      totalExtraRecords += excess;
    } else if (dbCount === onChainCount) {
      console.log(`  RESULT:    LEGITIMATE — miner paid ${onChainCount} time(s) on-chain`);
      totalLegitimate++;
    } else {
      const missing = onChainCount - dbCount;
      console.log(`  RESULT:    MISSING — DB has ${dbCount} but on-chain has ${onChainCount} (${missing} missing)`);
      totalMissingRecords += missing;
    }

    console.log('');
  }

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Groups checked:          ${duplicates.length}`);
  console.log(`  Legitimate (DB=on-chain): ${totalLegitimate}`);
  console.log(`  False positives (DB>on-chain): ${totalFalsePositives} (${totalExtraRecords} extra records)`);
  console.log(`  Missing (DB<on-chain):   ${totalMissingRecords} missing records`);
  console.log(`  Unverified:              ${totalUnverified}`);

  await mongoClient.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
