#!/usr/bin/env node

/**
 * Recovery Script: Reconstruct pool database from blockchain data
 *
 * Strategy: Rebuild into a SIDE database, then swap with production.
 *
 * Usage:
 *   node scripts/recover-from-blockchain.js [options]
 *
 * Options:
 *   --dry-run           Print what would be inserted without writing to DB (default: true)
 *   --write             Actually write to the database
 *   --pool-address      Pool's minting address (required, or set POOL_MINTING_ADDRESS env)
 *   --payment-address   Pool's payment address (required, or set POOL_PAYMENT_ADDRESS env)
 *   --from-block        Start block for scanning (default: 0)
 *   --to-block          End block for scanning (default: latest)
 *   --network           "etica" or "crucible" (default: etica)
 *   --rpc-url           RPC endpoint (default: https://eticamainnet.eticascan.org)
 *   --mongodb-uri       MongoDB URI (default: mongodb://localhost:27017)
 *   --db-name           Target rebuild DB name (default: tokenpool_rebuild)
 *   --use-eticascan     Use eticascan API instead of RPC for TX lookups
 *   --eticascan-url     Eticascan API base URL (default: https://eticascan.org/apiv1)
 *   --swap              After rebuild, swap rebuild DB with production (interactive confirm)
 *   --production-db     Production DB name for swap (default: tokenpool_production)
 *   --copy-live-shares  Copy live share data from production into rebuild before swap
 *
 * Workflow:
 *   1. Restore last year's backup into tokenpool_rebuild (manual: mongorestore --db tokenpool_rebuild)
 *   2. Run this script with --write --from-block <backup-block> --db-name tokenpool_rebuild
 *   3. Script rebuilds pool_mints, balance_payments, transactions, minerData into side DB
 *   4. Run with --swap --copy-live-shares to copy live shares from production and rename DBs
 *   5. Restart pool
 *
 * What this script recovers:
 *   1. pool_mints         - From Mint events on the EticaRelease contract
 *   2. all_eti_mints      - All Mint events (pool + other miners)
 *   3. balance_payments   - From decoded multisend() TX input data on BatchedPayments contract
 *   4. transactions       - From payment TX receipts
 *   5. minerData balances - Recomputed: alltimeTokenBalance = sum(blockchain payments) + pending unpaid
 *
 * What it does NOT recover (ephemeral, rebuilt by pool automatically):
 *   - miner_shares, miner_pendingshares, miner_challengediff (live share data)
 *   - queued_shares_list (processing queue)
 *   - These are copied from production with --copy-live-shares
 */

import Web3 from 'web3';
import Mongodb from 'mongodb';
import https from 'https';
import http from 'http';
import readline from 'readline';

// ─── Contract addresses ───
const CONTRACTS = {
  etica: {
    EticaRelease: '0x34c61EA91bAcdA647269d4e310A86b875c09946f',
    BatchedPayments: '0xC4d3Eab6CB085882f85363e606daAF15bcdfC6f8'
  },
  crucible: {
    EticaRelease: '0x558593Bc92E6F242a604c615d93902fc98efcA82',
    BatchedPayments: '0xFD181e8c485D60c3F2b03B0eF91501589F191E48'
  }
};

// ─── Mint event ABI ───
const MINT_EVENT_ABI = {
  anonymous: false,
  inputs: [
    { indexed: true, name: 'from', type: 'address' },
    { indexed: false, name: 'blockreward', type: 'uint256' },
    { indexed: false, name: 'epochCount', type: 'uint256' },
    { indexed: false, name: 'newChallengeNumber', type: 'bytes32' }
  ],
  name: 'Mint',
  type: 'event'
};

// ─── multisend function ABI ───
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

// ─── Collections that hold live ephemeral data (copy from production during swap) ───
const LIVE_SHARE_COLLECTIONS = [
  'miner_shares',
  'miner_pendingshares',
  'miner_challengediff',
  'queued_shares_list',
  'totaldiff_challengenumber'
];

// ─── Parse CLI arguments ───
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    dryRun: true,
    poolAddress: process.env.POOL_MINTING_ADDRESS || '',
    paymentAddress: process.env.POOL_PAYMENT_ADDRESS || '',
    fromBlock: 0,
    toBlock: 'latest',
    network: 'etica',
    rpcUrl: 'https://eticamainnet.eticascan.org',
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.POOL_DB_NAME || 'tokenpool_rebuild',
    useEticascan: false,
    eticascanUrl: 'https://eticascan.org/apiv1',
    swap: false,
    productionDb: 'tokenpool_production',
    copyLiveShares: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run': opts.dryRun = true; break;
      case '--write': opts.dryRun = false; break;
      case '--pool-address': opts.poolAddress = args[++i]; break;
      case '--payment-address': opts.paymentAddress = args[++i]; break;
      case '--from-block': opts.fromBlock = parseInt(args[++i]); break;
      case '--to-block': opts.toBlock = args[++i] === 'latest' ? 'latest' : parseInt(args[++i]); break;
      case '--network': opts.network = args[++i]; break;
      case '--rpc-url': opts.rpcUrl = args[++i]; break;
      case '--mongodb-uri': opts.mongodbUri = args[++i]; break;
      case '--db-name': opts.dbName = args[++i]; break;
      case '--use-eticascan': opts.useEticascan = true; break;
      case '--eticascan-url': opts.eticascanUrl = args[++i]; break;
      case '--swap': opts.swap = true; break;
      case '--production-db': opts.productionDb = args[++i]; break;
      case '--copy-live-shares': opts.copyLiveShares = true; break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!opts.swap) {
    if (!opts.poolAddress) {
      console.error('ERROR: --pool-address is required (pool minting address)');
      console.error('  This is the address that mines/mints blocks (mintingConfig.publicAddress)');
      process.exit(1);
    }
    if (!opts.paymentAddress) {
      console.error('ERROR: --payment-address is required (pool payment address)');
      console.error('  This is the address that sends batched payments (paymentsConfig.publicAddress)');
      process.exit(1);
    }
    opts.poolAddress = opts.poolAddress.toLowerCase();
    opts.paymentAddress = opts.paymentAddress.toLowerCase();
  }

  return opts;
}

// ─── Prompt for confirmation ───
function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question + ' (yes/no): ', answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// ─── Eticascan API helper ───
function eticascanFetch(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint}`;
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Step 1: Recover pool_mints from Mint events ───
async function recoverPoolMints(web3, opts, dbo) {
  console.log('\n═══ Step 1: Recovering pool_mints from Mint events ═══');

  const contracts = CONTRACTS[opts.network];
  const tokenContract = new web3.eth.Contract([MINT_EVENT_ABI], contracts.EticaRelease);

  let toBlock = opts.toBlock;
  if (toBlock === 'latest') {
    const latest = await web3.eth.getBlock('latest');
    toBlock = latest.number;
    console.log(`  Latest block: ${toBlock}`);
  }

  const CHUNK_SIZE = 10000;
  let allPoolMints = [];
  let allEtiMints = [];

  for (let from = opts.fromBlock; from <= toBlock; from += CHUNK_SIZE) {
    const to = Math.min(from + CHUNK_SIZE - 1, toBlock);
    process.stdout.write(`  Scanning blocks ${from} - ${to}...`);

    try {
      const events = await tokenContract.getPastEvents('Mint', {
        fromBlock: from,
        toBlock: to
      });

      let poolCount = 0;
      for (const event of events) {
        const mintFrom = event.returnValues.from.toLowerCase();
        const epochCount = (parseInt(event.returnValues.epochCount) - 1).toString();
        const mintData = {
          transactionhash: event.transactionHash,
          from: event.returnValues.from,
          blockreward: event.returnValues.blockreward,
          epochCount: epochCount,
          blockNumber: event.blockNumber
        };

        if (mintFrom === opts.poolAddress) {
          allPoolMints.push({ ...mintData, poolstatus: 2 });
          allEtiMints.push({ ...mintData, status: 1 });
          poolCount++;
        } else {
          allEtiMints.push({ ...mintData, status: 2 });
        }
      }

      console.log(` ${events.length} mints found (${poolCount} pool)`);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
    }

    await sleep(200);
  }

  console.log(`\n  Total pool mints found: ${allPoolMints.length}`);
  console.log(`  Total ETI mints found: ${allEtiMints.length}`);

  if (!opts.dryRun && allPoolMints.length > 0) {
    console.log('  Writing pool_mints to database...');
    let inserted = 0, skipped = 0;
    for (const mint of allPoolMints) {
      const existing = await dbo.collection('pool_mints').findOne({ epochCount: mint.epochCount });
      if (!existing) {
        await dbo.collection('pool_mints').insertOne(mint);
        inserted++;
      } else {
        skipped++;
      }
    }
    console.log(`  Inserted: ${inserted}, Skipped (already exist): ${skipped}`);

    console.log('  Writing all_eti_mints to database...');
    inserted = 0; skipped = 0;
    for (const mint of allEtiMints) {
      const existing = await dbo.collection('all_eti_mints').findOne({ epochCount: mint.epochCount });
      if (!existing) {
        await dbo.collection('all_eti_mints').insertOne(mint);
        inserted++;
      } else {
        skipped++;
      }
    }
    console.log(`  Inserted: ${inserted}, Skipped (already exist): ${skipped}`);
  } else if (opts.dryRun) {
    console.log('  [DRY RUN] Would insert pool_mints:');
    for (const mint of allPoolMints.slice(0, 5)) {
      console.log(`    epoch=${mint.epochCount} tx=${mint.transactionhash} reward=${mint.blockreward}`);
    }
    if (allPoolMints.length > 5) console.log(`    ... and ${allPoolMints.length - 5} more`);
  }

  return allPoolMints;
}

// ─── Step 2: Recover balance_payments from BatchedPayments TXs ───
async function recoverPayments(web3, opts, dbo) {
  console.log('\n═══ Step 2: Recovering balance_payments from BatchedPayments TXs ═══');

  const contracts = CONTRACTS[opts.network];
  const batchedPaymentsAddress = contracts.BatchedPayments.toLowerCase();
  const multisendSig = web3.eth.abi.encodeFunctionSignature(MULTISEND_ABI);
  console.log(`  multisend selector: ${multisendSig}`);

  let paymentTxs = [];

  if (opts.useEticascan) {
    console.log(`  Using eticascan API to fetch TXs from ${opts.paymentAddress}...`);
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const data = await eticascanFetch(
          opts.eticascanUrl,
          `/transactions?address=${opts.paymentAddress}&page=${page}&limit=100`
        );

        if (!data || !data.data || data.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const tx of data.data) {
          const toAddr = (tx.to || '').toLowerCase();
          if (toAddr === batchedPaymentsAddress) {
            paymentTxs.push(tx.hash || tx.txHash);
          }
        }

        console.log(`  Page ${page}: ${data.data.length} TXs, ${paymentTxs.length} payment TXs so far`);
        if (data.data.length < 100) hasMore = false;
        page++;
        await sleep(500);
      } catch (err) {
        console.error(`  API error on page ${page}: ${err.message}`);
        hasMore = false;
      }
    }
  } else {
    console.log(`  Using RPC to find payment TXs (this may be slow)...`);
    console.log(`  Tip: Use --use-eticascan for faster scanning via API`);

    let toBlock = opts.toBlock;
    if (toBlock === 'latest') {
      const latest = await web3.eth.getBlock('latest');
      toBlock = latest.number;
    }

    const transferEventSig = web3.utils.sha3('Transfer(address,address,uint256)');
    const CHUNK = 10000;

    for (let from = opts.fromBlock; from <= toBlock; from += CHUNK) {
      const to = Math.min(from + CHUNK - 1, toBlock);
      process.stdout.write(`  Scanning blocks ${from} - ${to}...`);

      try {
        const logs = await web3.eth.getPastLogs({
          fromBlock: from,
          toBlock: to,
          address: contracts.EticaRelease,
          topics: [
            transferEventSig,
            web3.utils.padLeft(opts.paymentAddress, 64)
          ]
        });

        const txHashes = [...new Set(logs.map(l => l.transactionHash))];
        for (const txHash of txHashes) {
          const tx = await web3.eth.getTransaction(txHash);
          if (tx && tx.to && tx.to.toLowerCase() === batchedPaymentsAddress) {
            paymentTxs.push(txHash);
          }
        }

        console.log(` ${logs.length} logs, ${paymentTxs.length} payment TXs so far`);
      } catch (err) {
        console.log(` ERROR: ${err.message}`);
      }

      await sleep(200);
    }
  }

  // Filter by block range (eticascan may return TXs outside our range)
  console.log(`\n  Total payment TXs found: ${paymentTxs.length}`);

  // Decode each payment TX
  let allPayments = [];
  let allTransactions = [];

  for (let i = 0; i < paymentTxs.length; i++) {
    const txHash = paymentTxs[i];
    process.stdout.write(`  Decoding TX ${i + 1}/${paymentTxs.length}: ${txHash.slice(0, 16)}...`);

    try {
      const tx = await web3.eth.getTransaction(txHash);
      const receipt = await web3.eth.getTransactionReceipt(txHash);

      if (!tx || !tx.input || tx.input.length < 10) {
        console.log(' SKIP (no input data)');
        continue;
      }

      // Skip if outside our block range
      if (opts.fromBlock > 0 && tx.blockNumber < opts.fromBlock) {
        console.log(` SKIP (block ${tx.blockNumber} < fromBlock ${opts.fromBlock})`);
        continue;
      }

      const selector = tx.input.slice(0, 10);
      if (selector !== multisendSig) {
        console.log(` SKIP (selector ${selector} != ${multisendSig})`);
        continue;
      }

      const decoded = web3.eth.abi.decodeParameters(
        MULTISEND_ABI.inputs,
        '0x' + tx.input.slice(10)
      );

      const paymentId = decoded.paymentId;
      const dests = decoded.dests;
      const values = decoded.values;
      const txStatus = receipt.status ? 'success' : 'reverted';

      console.log(` ${txStatus} | UUID=${paymentId.slice(0, 16)}... | ${dests.length} payments`);

      allTransactions.push({
        txType: 'batched_payment',
        status: txStatus,
        txHash: txHash,
        txData: {
          uuid: paymentId,
          payments: dests.map((dest, idx) => ({
            minerEthAddress: dest,
            amountToPay: values[idx].toString()
          }))
        },
        blockNumber: tx.blockNumber,
        from: tx.from,
        to: tx.to,
        gasUsed: receipt.gasUsed,
        recoveredFromBlockchain: true
      });

      for (let j = 0; j < dests.length; j++) {
        allPayments.push({
          minerEthAddress: dests[j].toLowerCase(),
          amountToPay: values[j].toString(),
          block: tx.blockNumber,
          batchedPaymentUuid: paymentId,
          txHash: txHash,
          confirmed: txStatus === 'success',
          broadcastedAt: null,
          recoveredFromBlockchain: true
        });
      }
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
    }

    await sleep(300);
  }

  console.log(`\n  Total individual payments decoded: ${allPayments.length}`);
  console.log(`  Total transaction records: ${allTransactions.length}`);

  if (!opts.dryRun && allPayments.length > 0) {
    console.log('  Writing transactions to database...');
    let inserted = 0, skipped = 0;
    for (const tx of allTransactions) {
      const existing = await dbo.collection('transactions').findOne({ txHash: tx.txHash });
      if (!existing) {
        await dbo.collection('transactions').insertOne(tx);
        inserted++;
      } else {
        skipped++;
      }
    }
    console.log(`  Transactions - Inserted: ${inserted}, Skipped: ${skipped}`);

    console.log('  Writing balance_payments to database...');
    inserted = 0; skipped = 0;
    for (const payment of allPayments) {
      const existing = await dbo.collection('balance_payments').findOne({
        batchedPaymentUuid: payment.batchedPaymentUuid,
        minerEthAddress: payment.minerEthAddress
      });
      if (!existing) {
        await dbo.collection('balance_payments').insertOne(payment);
        inserted++;
      } else {
        skipped++;
      }
    }
    console.log(`  Balance payments - Inserted: ${inserted}, Skipped: ${skipped}`);
  } else if (opts.dryRun) {
    console.log('  [DRY RUN] Would insert transactions:');
    for (const tx of allTransactions.slice(0, 5)) {
      console.log(`    ${tx.status} tx=${tx.txHash.slice(0, 20)}... uuid=${tx.txData.uuid.slice(0, 16)}... ${tx.txData.payments.length} payments`);
    }
    console.log('  [DRY RUN] Would insert balance_payments:');
    for (const p of allPayments.slice(0, 5)) {
      console.log(`    ${p.minerEthAddress.slice(0, 12)}... amount=${p.amountToPay} confirmed=${p.confirmed}`);
    }
    if (allPayments.length > 5) console.log(`    ... and ${allPayments.length - 5} more`);
  }

  return { allPayments, allTransactions };
}

// ─── Step 3: Recompute minerData balances ───
// alltimeTokenBalance = sum of all confirmed blockchain payments for this miner
// (fee is deducted BEFORE alltimeTokenBalance is incremented in the pool code,
//  so blockchain payment amounts ARE the post-fee amounts = alltimeTokenBalance)
async function recomputeMinerBalances(allPayments, opts, dbo) {
  console.log('\n═══ Step 3: Recomputing minerData balances from blockchain payments ═══');
  console.log('  (alltimeTokenBalance = sum of confirmed payments, since fee is pre-deducted)');

  // Sum all confirmed payments per miner base address
  const minerTotals = {};

  for (const payment of allPayments) {
    if (!payment.confirmed) continue;

    const baseAddress = payment.minerEthAddress.slice(0, 42).toLowerCase();
    const amount = BigInt(payment.amountToPay);

    if (!minerTotals[baseAddress]) {
      minerTotals[baseAddress] = { totalPaid: BigInt(0), paymentCount: 0 };
    }
    minerTotals[baseAddress].totalPaid += amount;
    minerTotals[baseAddress].paymentCount++;
  }

  const miners = Object.entries(minerTotals).sort((a, b) =>
    Number(b[1].totalPaid - a[1].totalPaid)
  );

  console.log(`  Found ${miners.length} unique miner addresses with confirmed payments`);
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
      const totalPaidStr = data.totalPaid.toString();
      const existing = await dbo.collection('minerData').findOne({ minerEthAddress: addr });

      if (existing) {
        // Existing miner from backup. blockchain total = floor for alltimeTokenBalance.
        // If backup has HIGHER value, keep it (covers pending unpaid balance).
        // If backup has LOWER value, update to blockchain value (backup was stale/corrupted).
        const currentAlltime = BigInt(existing.alltimeTokenBalance || '0');
        const currentAwarded = BigInt(existing.tokensAwarded || '0');
        const blockchainTotal = data.totalPaid;

        if (blockchainTotal > currentAlltime) {
          // Blockchain shows more was paid than backup knows about.
          // Set alltimeTokenBalance = blockchainTotal (minimum proven amount)
          // Set tokensAwarded = blockchainTotal (all has been paid out)
          await dbo.collection('minerData').updateOne(
            { minerEthAddress: addr },
            { $set: {
              alltimeTokenBalance: Number(blockchainTotal),
              tokensAwarded: Number(blockchainTotal),
              tokensReceived: totalPaidStr,
              recoveryNote: `Blockchain recovery: alltimeTokenBalance updated from ${currentAlltime} to ${blockchainTotal}`
            }}
          );
          updated++;
        } else {
          // Backup value is >= blockchain total. That's expected (includes pending unpaid).
          // Just update tokensReceived to match actual blockchain payments.
          const currentReceived = BigInt(existing.tokensReceived || '0');
          if (blockchainTotal > currentReceived) {
            await dbo.collection('minerData').updateOne(
              { minerEthAddress: addr },
              { $set: { tokensReceived: totalPaidStr } }
            );
            updated++;
          } else {
            unchanged++;
          }
        }
      } else {
        // Miner not in backup at all — create from blockchain data
        await dbo.collection('minerData').insertOne({
          minerEthAddress: addr,
          minerEthAddressBase: addr,
          alltimeTokenBalance: Number(data.totalPaid),
          tokensAwarded: Number(data.totalPaid),
          tokensReceived: totalPaidStr,
          tokenBalance: 0,
          hashRate: 0,
          lastSubmittedSolutionTime: 0,
          sharecount: 0,
          recoveredFromBlockchain: true
        });
        created++;
      }
    }

    console.log(`  Updated: ${updated}, Created: ${created}, Unchanged: ${unchanged}`);
  } else {
    console.log('\n  [DRY RUN] Would update/create minerData for each address');
  }

  return minerTotals;
}

// ─── Step 4: Copy live share data from production ───
async function copyLiveShares(mongoClient, opts) {
  console.log('\n═══ Step 4: Copying live share data from production ═══');

  const prodDb = mongoClient.db(opts.productionDb);
  const rebuildDb = mongoClient.db(opts.dbName);

  for (const collName of LIVE_SHARE_COLLECTIONS) {
    process.stdout.write(`  Copying ${collName}...`);

    try {
      const count = await prodDb.collection(collName).countDocuments();
      if (count === 0) {
        console.log(' empty, skipping');
        continue;
      }

      // Drop existing in rebuild (stale backup data)
      await rebuildDb.collection(collName).drop().catch(() => {});

      // Copy all docs
      const cursor = prodDb.collection(collName).find();
      const batch = [];
      let total = 0;

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        delete doc._id; // Let MongoDB generate new _ids
        batch.push(doc);

        if (batch.length >= 1000) {
          await rebuildDb.collection(collName).insertMany(batch);
          total += batch.length;
          batch.length = 0;
        }
      }

      if (batch.length > 0) {
        await rebuildDb.collection(collName).insertMany(batch);
        total += batch.length;
      }

      console.log(` ${total} documents`);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
    }
  }

  // Also copy miningContractData (needed for pool to continue mining)
  for (const extraColl of ['miningContractData', 'allminingContracts', 'stats', 'lastFullPayoutTime']) {
    process.stdout.write(`  Copying ${extraColl}...`);
    try {
      const count = await prodDb.collection(extraColl).countDocuments();
      if (count === 0) {
        console.log(' empty, skipping');
        continue;
      }
      // For these, upsert rather than replace (backup may have historical data)
      const docs = await prodDb.collection(extraColl).find().toArray();
      let upserted = 0;
      for (const doc of docs) {
        const id = doc._id;
        delete doc._id;
        await rebuildDb.collection(extraColl).replaceOne(
          { _id: id },
          doc,
          { upsert: true }
        );
        upserted++;
      }
      console.log(` ${upserted} documents`);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
    }
  }
}

// ─── Step 5: Swap databases ───
async function swapDatabases(mongoClient, opts) {
  console.log('\n═══ Step 5: Swapping databases ═══');
  console.log(`  ${opts.productionDb} → tokenpool_old`);
  console.log(`  ${opts.dbName} → ${opts.productionDb}`);

  const confirmed = await confirm(
    '\n  WARNING: This will rename the production database.\n' +
    '  Make sure the pool is STOPPED before proceeding.\n' +
    '  Continue?'
  );

  if (!confirmed) {
    console.log('  Swap cancelled.');
    return false;
  }

  const admin = mongoClient.db('admin');

  // Rename production → old
  console.log(`  Renaming ${opts.productionDb} → tokenpool_old...`);
  try {
    // MongoDB doesn't have native rename. We use copyDatabase + dropDatabase approach.
    // Actually, we can use admin.command with renameCollection for each collection.
    const prodDb = mongoClient.db(opts.productionDb);
    const collections = await prodDb.listCollections().toArray();

    for (const coll of collections) {
      if (coll.name.startsWith('system.')) continue;
      try {
        await admin.command({
          renameCollection: `${opts.productionDb}.${coll.name}`,
          to: `tokenpool_old.${coll.name}`,
          dropTarget: true
        });
      } catch (err) {
        console.log(`    WARN: Could not rename ${coll.name}: ${err.message}`);
      }
    }
    console.log('  Done.');
  } catch (err) {
    console.error(`  ERROR renaming production: ${err.message}`);
    console.error('  ABORTING swap. No data was lost.');
    return false;
  }

  // Rename rebuild → production
  console.log(`  Renaming ${opts.dbName} → ${opts.productionDb}...`);
  try {
    const rebuildDb = mongoClient.db(opts.dbName);
    const collections = await rebuildDb.listCollections().toArray();

    for (const coll of collections) {
      if (coll.name.startsWith('system.')) continue;
      try {
        await admin.command({
          renameCollection: `${opts.dbName}.${coll.name}`,
          to: `${opts.productionDb}.${coll.name}`,
          dropTarget: true
        });
      } catch (err) {
        console.log(`    WARN: Could not rename ${coll.name}: ${err.message}`);
      }
    }
    console.log('  Done.');
  } catch (err) {
    console.error(`  ERROR renaming rebuild: ${err.message}`);
    console.error('  WARNING: Production DB may be in tokenpool_old. Check manually!');
    return false;
  }

  console.log('\n  Swap complete!');
  console.log('  Old production data is in: tokenpool_old');
  console.log('  You can drop it later with: db.getSiblingDB("tokenpool_old").dropDatabase()');
  return true;
}

// ─── Summary report ───
function generateReport(poolMints, payments, transactions, minerTotals, opts) {
  console.log('\n═══════════════════════════════════════════════');
  console.log('         RECOVERY SUMMARY REPORT');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Network:           ${opts.network}`);
  console.log(`  Pool address:      ${opts.poolAddress}`);
  console.log(`  Payment address:   ${opts.paymentAddress}`);
  console.log(`  Block range:       ${opts.fromBlock} → ${opts.toBlock}`);
  console.log(`  Target DB:         ${opts.dbName}`);
  console.log(`  Mode:              ${opts.dryRun ? 'DRY RUN (no writes)' : 'LIVE WRITE'}`);
  console.log('');
  console.log(`  Pool mints found:        ${poolMints.length}`);
  console.log(`  Payment TXs decoded:     ${transactions.length}`);
  console.log(`  Individual payments:     ${payments.length}`);

  const confirmedPayments = payments.filter(p => p.confirmed);
  const revertedPayments = payments.filter(p => !p.confirmed);
  console.log(`    Confirmed:             ${confirmedPayments.length}`);
  console.log(`    Reverted:              ${revertedPayments.length}`);

  const totalPaid = confirmedPayments.reduce((sum, p) => sum + BigInt(p.amountToPay), BigInt(0));
  console.log(`  Total ETI paid:          ${(Number(totalPaid) / 1e18).toFixed(4)} ETI`);

  const uniqueMiners = Object.keys(minerTotals).length;
  console.log(`  Unique miners paid:      ${uniqueMiners}`);

  if (poolMints.length > 0) {
    const epochs = poolMints.map(m => parseInt(m.epochCount)).sort((a, b) => a - b);
    console.log(`  Epoch range:             ${epochs[0]} → ${epochs[epochs.length - 1]}`);
  }

  console.log('\n═══════════════════════════════════════════════');

  if (opts.dryRun) {
    console.log('  To apply these changes, run again with --write');
    console.log('  To swap with production after rebuild, run with --swap --copy-live-shares');
  }
}

// ─── Main ───
async function main() {
  const opts = parseArgs();

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   EticaPool Database Recovery from Blockchain  ║');
  console.log('╚════════════════════════════════════════════════╝');

  // Swap-only mode
  if (opts.swap) {
    console.log('  Mode: DATABASE SWAP');
    console.log(`  Rebuild DB:     ${opts.dbName}`);
    console.log(`  Production DB:  ${opts.productionDb}`);

    const mongoClient = await Mongodb.MongoClient.connect(opts.mongodbUri, {
      useUnifiedTopology: true
    });

    try {
      if (opts.copyLiveShares) {
        await copyLiveShares(mongoClient, opts);
      }
      await swapDatabases(mongoClient, opts);
    } finally {
      await mongoClient.close();
    }
    return;
  }

  // Rebuild mode
  console.log(`  Network:         ${opts.network}`);
  console.log(`  Pool address:    ${opts.poolAddress}`);
  console.log(`  Payment address: ${opts.paymentAddress}`);
  console.log(`  RPC:             ${opts.rpcUrl}`);
  console.log(`  MongoDB:         ${opts.mongodbUri}`);
  console.log(`  Target DB:       ${opts.dbName} (side rebuild DB)`);
  console.log(`  Mode:            ${opts.dryRun ? 'DRY RUN' : 'LIVE WRITE'}`);
  console.log(`  Eticascan:       ${opts.useEticascan ? 'Yes' : 'No'}`);

  // Connect to Web3
  const web3 = new Web3(opts.rpcUrl);
  try {
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`  Connected to RPC. Current block: ${blockNumber}`);
  } catch (err) {
    console.error(`  ERROR: Cannot connect to RPC at ${opts.rpcUrl}: ${err.message}`);
    process.exit(1);
  }

  // Connect to MongoDB
  let dbo = null;
  let mongoClient = null;
  if (!opts.dryRun) {
    try {
      mongoClient = await Mongodb.MongoClient.connect(opts.mongodbUri, {
        useUnifiedTopology: true
      });
      dbo = mongoClient.db(opts.dbName);
      console.log(`  Connected to MongoDB: ${opts.dbName}`);

      // Safety check: warn if writing to production
      if (opts.dbName === opts.productionDb) {
        const ok = await confirm(
          `  WARNING: You are writing directly to ${opts.productionDb}!\n` +
          '  It is safer to use a side DB (--db-name tokenpool_rebuild).\n' +
          '  Continue anyway?'
        );
        if (!ok) {
          console.log('  Aborted.');
          process.exit(0);
        }
      }
    } catch (err) {
      console.error(`  ERROR: Cannot connect to MongoDB at ${opts.mongodbUri}: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log('  [DRY RUN] Skipping MongoDB connection');
  }

  try {
    const poolMints = await recoverPoolMints(web3, opts, dbo);
    const { allPayments, allTransactions } = await recoverPayments(web3, opts, dbo);
    const minerTotals = await recomputeMinerBalances(allPayments, opts, dbo);
    generateReport(poolMints, allPayments, allTransactions, minerTotals, opts);
  } catch (err) {
    console.error('\nFATAL ERROR:', err);
    process.exit(1);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
