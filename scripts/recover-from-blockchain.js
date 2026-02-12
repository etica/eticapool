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
 *   --use-eticascan     Use eticascan API for TX detail lookups (optional, RPC is default and more reliable)
 *   --eticascan-url     Eticascan API base URL (default: https://eticascan.org/apiv1)
 *   --swap              After rebuild, swap rebuild DB with production (interactive confirm)
 *   --production-db     Production DB name for swap (default: tokenpool_production)
 *   --copy-live-shares  Copy live share data from production into rebuild before swap
 *   --verify-mint <tx>  Verify a single pool mint by TX hash (spot-check mode)
 *   --verify-mint-block <n>  Verify pool mints in a specific block number
 *   --verify-payment <tx>  Verify a payment TX: decode all miners + amounts (spot-check mode)
 *   --steps <1,2,3>        Run only specific steps (default: all). 1=mints, 2=payments, 3=balances
 *                           Example: --steps 2,3  (skip mints, only recover payments + recompute balances)
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

// Lightweight imports for ABI decoding (loads instantly)
import abiModule from 'web3-eth-abi';
const abiCoder = abiModule.default || abiModule;

// Heavy imports (Web3, Mongodb) loaded dynamically only when needed
let Web3, Mongodb;

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
    copyLiveShares: false,
    verifyMint: null,
    verifyMintBlock: null,
    verifyPayment: null,
    steps: null  // null = all steps; or comma-separated: "1", "2", "3", "1,2", "2,3"
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run': opts.dryRun = true; break;
      case '--write': opts.dryRun = false; break;
      case '--pool-address': opts.poolAddress = args[++i]; break;
      case '--payment-address': opts.paymentAddress = args[++i]; break;
      case '--from-block': opts.fromBlock = parseInt(args[++i]); break;
      case '--to-block': { const v = args[++i]; opts.toBlock = v === 'latest' ? 'latest' : parseInt(v); break; }
      case '--network': opts.network = args[++i]; break;
      case '--rpc-url': opts.rpcUrl = args[++i]; break;
      case '--mongodb-uri': opts.mongodbUri = args[++i]; break;
      case '--db-name': opts.dbName = args[++i]; break;
      case '--use-eticascan': opts.useEticascan = true; break;
      case '--eticascan-url': opts.eticascanUrl = args[++i]; break;
      case '--swap': opts.swap = true; break;
      case '--production-db': opts.productionDb = args[++i]; break;
      case '--copy-live-shares': opts.copyLiveShares = true; break;
      case '--verify-mint': opts.verifyMint = args[++i]; break;
      case '--verify-mint-block': opts.verifyMintBlock = parseInt(args[++i]); break;
      case '--verify-payment': opts.verifyPayment = args[++i]; break;
      case '--steps': opts.steps = args[++i].split(',').map(s => parseInt(s.trim())); break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  const isVerifyMode = opts.verifyMint || opts.verifyMintBlock || opts.verifyPayment;

  if (!opts.swap && !isVerifyMode) {
    const needsPool = !opts.steps || opts.steps.includes(1);
    const needsPayment = !opts.steps || opts.steps.includes(2);
    if (needsPool && !opts.poolAddress) {
      console.error('ERROR: --pool-address is required (pool minting address)');
      console.error('  This is the address that mines/mints blocks (mintingConfig.publicAddress)');
      process.exit(1);
    }
    if (needsPayment && !opts.paymentAddress) {
      console.error('ERROR: --payment-address is required (pool payment address)');
      console.error('  This is the address that sends batched payments (paymentsConfig.publicAddress)');
      process.exit(1);
    }
  }
  if (opts.poolAddress) opts.poolAddress = opts.poolAddress.toLowerCase();
  if (opts.paymentAddress) opts.paymentAddress = opts.paymentAddress.toLowerCase();

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
// Returns null on non-JSON responses (rate limiting, server errors) instead of throwing.
// Throws only on network-level errors (DNS, connection refused, timeout).
function eticascanFetch(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint}`;
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Non-2xx status → return null (let caller fall back to RPC)
        if (res.statusCode < 200 || res.statusCode >= 300) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          // HTML error page or other non-JSON → return null (rate limited / server error)
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    )
  ]);
}

// ─── Step 1: Recover pool_mints from Mint events (RPC scan + eticascan details) ───
async function recoverPoolMints(web3, opts, dbo) {
  console.log('\n═══ Step 1: Recovering pool_mints (scanning Mint events via RPC) ═══');

  const contracts = CONTRACTS[opts.network];
  const tokenContract = new web3.eth.Contract([MINT_EVENT_ABI], contracts.EticaRelease);
  let allPoolMints = [];
  let allEtiMints = [];

  let toBlock = opts.toBlock;
  if (toBlock === 'latest') {
    const latest = await web3.eth.getBlock('latest');
    toBlock = latest.number;
    console.log(`  Latest block: ${toBlock}`);
  }

  const CHUNK_SIZE = 10000;
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
          epochCount: epochCount
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
      const existing = await dbo.collection('pool_mints').findOne({ transactionhash: mint.transactionhash });
      if (!existing) {
        await dbo.collection('pool_mints').insertOne(mint);
        inserted++;
      } else {
        skipped++;
      }
      if ((inserted + skipped) % 500 === 0) {
        process.stdout.write(`\r  pool_mints progress: ${inserted + skipped}/${allPoolMints.length} (${inserted} new, ${skipped} existing)`);
      }
    }
    console.log(`\n  pool_mints: ${inserted} inserted, ${skipped} skipped (already exist)`);

    console.log('  Writing all_eti_mints to database...');
    inserted = 0; skipped = 0;
    for (const mint of allEtiMints) {
      const existing = await dbo.collection('all_eti_mints').findOne({ transactionhash: mint.transactionhash });
      if (!existing) {
        await dbo.collection('all_eti_mints').insertOne(mint);
        inserted++;
      } else {
        skipped++;
      }
      if ((inserted + skipped) % 500 === 0) {
        process.stdout.write(`\r  all_eti_mints progress: ${inserted + skipped}/${allEtiMints.length} (${inserted} new, ${skipped} existing)`);
      }
    }
    console.log(`\n  all_eti_mints: ${inserted} inserted, ${skipped} skipped (already exist)`);
  } else if (opts.dryRun) {
    console.log(`  [DRY RUN] Would insert ${allPoolMints.length} pool_mints, ${allEtiMints.length} all_eti_mints`);
  }

  return allPoolMints;
}

// ─── Step 2: Recover balance_payments from BatchedPayments TXs ───
// Hybrid approach: RPC for full TX discovery (by nonce), eticascan for fast TX detail decoding.
// The payment EOA sends TXs with nonces 0..N-1. We iterate every nonce, get the TX hash via
// eth_getTransactionByNonce (not available) — actually we use eth_getTransactionCount to get
// the total nonce, then for each nonce we fetch the TX by scanning. Since there's no
// eth_getTransactionByNonce in standard web3, we use getPastLogs on Transfer events FROM
// the payment address to discover all TX hashes, then decode each via eticascan.
async function recoverPayments(web3, opts, dbo) {
  console.log('\n═══ Step 2: Recovering balance_payments from BatchedPayments TXs ═══');

  const contracts = CONTRACTS[opts.network];
  const batchedPaymentsAddress = contracts.BatchedPayments.toLowerCase();
  const multisendSig = abiCoder.encodeFunctionSignature(MULTISEND_ABI);
  console.log(`  multisend selector: ${multisendSig}`);
  console.log(`  BatchedPayments:   ${contracts.BatchedPayments}`);
  console.log(`  Payment address:   ${opts.paymentAddress}`);

  if (!web3) {
    console.error('  ERROR: Web3 is required for full history scanning.');
    return { allPayments: [], allTransactions: [] };
  }

  let paymentTxHashes = [];

  // ─── Discover ALL payment TX hashes via RPC getPastLogs ───
  // The BatchedPayments contract itself emits NO logs. It calls transferFrom()
  // on the EticaRelease token, which emits Transfer(from, to, value) events.
  // In these Transfer events, `from` = BatchedPayments contract address (it holds
  // the allowance), and `to` = each miner receiving payment.
  //
  // Strategy: scan for Transfer events on the EticaRelease token contract
  // where topic[1] (from) = BatchedPayments contract address padded to 32 bytes.
  // Each unique transactionHash from matched logs is one multisend() call.
  const transferSig = web3.utils.sha3('Transfer(address,address,uint256)');
  const batchedPadded = '0x' + batchedPaymentsAddress.slice(2).padStart(64, '0');
  console.log(`  Scanning for ERC20 Transfer events FROM BatchedPayments contract (full history via RPC)...`);

  let toBlock = opts.toBlock;
  if (toBlock === 'latest') {
    const latest = await web3.eth.getBlock('latest');
    toBlock = latest.number;
    console.log(`  Latest block: ${toBlock}`);
  }

  const CHUNK = 10000;
  const seenTxHashes = new Set();

  for (let from = opts.fromBlock; from <= toBlock; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, toBlock);
    process.stdout.write(`  Scanning blocks ${from} - ${to}...`);

    try {
      const logs = await web3.eth.getPastLogs({
        fromBlock: from,
        toBlock: to,
        address: contracts.EticaRelease, // Transfer events on the token contract
        topics: [transferSig, batchedPadded] // from = BatchedPayments contract
      });

      let newCount = 0;
      for (const log of logs) {
        if (!seenTxHashes.has(log.transactionHash)) {
          seenTxHashes.add(log.transactionHash);
          paymentTxHashes.push(log.transactionHash);
          newCount++;
        }
      }

      console.log(` ${logs.length} logs, ${newCount} new TXs (${paymentTxHashes.length} total)`);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
      // Retry with smaller chunk on error
      if (CHUNK > 1000) {
        console.log(`  Retrying with smaller chunks...`);
        const SMALL_CHUNK = 2000;
        for (let sf = from; sf <= to; sf += SMALL_CHUNK) {
          const st = Math.min(sf + SMALL_CHUNK - 1, to);
          try {
            const logs2 = await web3.eth.getPastLogs({
              fromBlock: sf,
              toBlock: st,
              address: contracts.EticaRelease,
              topics: [transferSig, batchedPadded]
            });
            for (const log of logs2) {
              if (!seenTxHashes.has(log.transactionHash)) {
                seenTxHashes.add(log.transactionHash);
                paymentTxHashes.push(log.transactionHash);
              }
            }
          } catch (err2) {
            console.log(`    Sub-chunk ${sf}-${st} ERROR: ${err2.message}`);
          }
          await sleep(200);
        }
      }
    }

    await sleep(200);
  }

  console.log(`\n  Total payment TXs found: ${paymentTxHashes.length}`);

  // ─── Decode each payment TX (via eticascan API for speed, RPC fallback) ───
  let allPayments = [];
  let allTransactions = [];
  let useEticascanForDetails = opts.useEticascan;
  let consecutiveEticascanFails = 0;
  let rpcFallbackCount = 0;
  let failedTxHashes = [];

  // ─── Helper: decode a single TX hash, return true on success ───
  async function decodeTx(txHash, label) {
    process.stdout.write(`  ${label}: ${txHash.slice(0, 16)}...`);

    try {
      let txInput, txBlockNumber, txFrom, txTo, txStatus, txGas;

      if (useEticascanForDetails) {
        // Fast path: fetch TX details from eticascan API (with retry + backoff)
        let txResp = null;
        const MAX_RETRIES = 2;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          txResp = await eticascanFetch(opts.eticascanUrl, `/tx/${txHash}`);
          if (txResp && txResp.querysuccess && txResp.result) break;
          // null = rate limited / HTML response. Back off before retrying.
          if (attempt < MAX_RETRIES) {
            const backoff = (attempt + 1) * 2000; // 2s, 4s
            process.stdout.write(` retry ${attempt + 1}...`);
            await sleep(backoff);
          }
          txResp = null;
        }

        if (!txResp) {
          // Eticascan is failing for this TX → fall back to RPC
          consecutiveEticascanFails++;
          rpcFallbackCount++;
          process.stdout.write(' RPC fallback...');
          const tx = await web3.eth.getTransaction(txHash);
          if (!tx) {
            console.log(' SKIP (TX not found on-chain)');
            return true; // not retryable — TX doesn't exist
          }
          const receipt = await web3.eth.getTransactionReceipt(txHash);
          txInput = tx.input;
          txBlockNumber = tx.blockNumber;
          txFrom = tx.from;
          txTo = tx.to;
          txStatus = (receipt && receipt.status) ? 'success' : 'reverted';
          txGas = receipt ? receipt.gasUsed : 0;

          // If eticascan fails 20+ times in a row, switch to RPC-only permanently
          if (consecutiveEticascanFails >= 20) {
            console.log('\n  WARNING: Eticascan failing consistently — switching to RPC-only mode');
            useEticascanForDetails = false;
          }
        } else {
          consecutiveEticascanFails = 0; // reset on success
          const tx = txResp.result;
          txInput = tx.input;
          txBlockNumber = tx.blockNumber;
          txFrom = tx.from;
          txTo = tx.to;
          txStatus = tx.status === 1 ? 'success' : 'reverted';
          txGas = tx.gas;
        }
      } else {
        // RPC-only path
        const tx = await web3.eth.getTransaction(txHash);
        if (!tx) {
          console.log(' SKIP (TX not found on-chain)');
          return true; // not retryable
        }
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        txInput = tx.input;
        txBlockNumber = tx.blockNumber;
        txFrom = tx.from;
        txTo = tx.to;
        txStatus = (receipt && receipt.status) ? 'success' : 'reverted';
        txGas = receipt ? receipt.gasUsed : 0;
      }

      if (!txInput || txInput.length < 10) {
        console.log(' SKIP (no input data)');
        return true;
      }

      if (opts.fromBlock > 0 && txBlockNumber < opts.fromBlock) {
        console.log(` SKIP (block ${txBlockNumber} < fromBlock ${opts.fromBlock})`);
        return true;
      }

      const selector = txInput.slice(0, 10);
      if (selector !== multisendSig) {
        console.log(` SKIP (selector ${selector} != ${multisendSig})`);
        return true;
      }

      const decoded = abiCoder.decodeParameters(
        MULTISEND_ABI.inputs,
        '0x' + txInput.slice(10)
      );

      const paymentId = decoded.paymentId;
      const dests = decoded.dests;
      const values = decoded.values;

      console.log(` ${txStatus} | UUID=${paymentId.slice(0, 16)}... | ${dests.length} payments`);

      allTransactions.push({
        block: txBlockNumber,
        txType: 'batched_payment',
        txData: {
          uuid: paymentId,
          payments: dests.map((dest, idx) => ({
            minerEthAddress: dest,
            amountToPay: values[idx].toString()
          }))
        },
        txHash: txHash,
        status: txStatus
      });

      for (let j = 0; j < dests.length; j++) {
        allPayments.push({
          minerEthAddress: dests[j].toLowerCase(),
          amountToPay: Number(values[j]),
          block: txBlockNumber,
          batchedPaymentUuid: paymentId,
          txHash: txHash,
          confirmed: txStatus === 'success',
          broadcastedAt: null
        });
      }

      return true; // success
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
      return false; // failed — retryable
    }
  }

  // ─── Main decoding loop ───
  for (let i = 0; i < paymentTxHashes.length; i++) {
    const ok = await decodeTx(paymentTxHashes[i], `Decoding TX ${i + 1}/${paymentTxHashes.length}`);
    if (!ok) {
      failedTxHashes.push(paymentTxHashes[i]);
    }

    // Adaptive delay: slower when eticascan is struggling, faster for RPC-only
    const baseDelay = useEticascanForDetails ? 500 : 300;
    const extraDelay = consecutiveEticascanFails > 5 ? 2000 : 0;
    await sleep(baseDelay + extraDelay);
  }

  // ─── Retry failed TXs (RPC-only, longer delay) ───
  if (failedTxHashes.length > 0) {
    console.log(`\n  Retrying ${failedTxHashes.length} failed TXs (RPC-only, 1s delay)...`);
    useEticascanForDetails = false; // force RPC for retries
    const stillFailed = [];

    for (let i = 0; i < failedTxHashes.length; i++) {
      const ok = await decodeTx(failedTxHashes[i], `Retry ${i + 1}/${failedTxHashes.length}`);
      if (!ok) {
        stillFailed.push(failedTxHashes[i]);
      }
      await sleep(1000);
    }

    failedTxHashes = stillFailed;
  }

  console.log(`\n  Total individual payments decoded: ${allPayments.length}`);
  console.log(`  Total transaction records: ${allTransactions.length}`);
  if (failedTxHashes.length > 0) {
    console.log(`  Failed (could not decode): ${failedTxHashes.length} TXs`);
    for (const h of failedTxHashes) {
      console.log(`    ${h}`);
    }
  }
  if (rpcFallbackCount > 0) {
    console.log(`  RPC fallback used for: ${rpcFallbackCount} TXs (eticascan was rate-limited)`);
  }

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
    console.log(`  transactions: ${inserted} inserted, ${skipped} skipped`);

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
      if ((inserted + skipped) % 500 === 0) {
        process.stdout.write(`\r  balance_payments progress: ${inserted + skipped}/${allPayments.length} (${inserted} new, ${skipped} existing)`);
      }
    }
    console.log(`\n  balance_payments: ${inserted} inserted, ${skipped} skipped`);
  } else if (opts.dryRun) {
    console.log(`  [DRY RUN] Would insert ${allTransactions.length} transactions, ${allPayments.length} balance_payments`);
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
      const totalPaidNum = Number(data.totalPaid);
      const existing = await dbo.collection('minerData').findOne({ minerEthAddress: addr });

      if (existing) {
        const currentAlltime = Number(existing.alltimeTokenBalance || 0);
        const currentAwarded = Number(existing.tokensAwarded || 0);
        const currentReceived = Number(existing.tokensReceived || 0);

        if (totalPaidNum > currentAlltime) {
          // Blockchain shows more paid than backup — update to blockchain truth
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
          // Backup alltimeTokenBalance is fine, just update tokensReceived
          await dbo.collection('minerData').updateOne(
            { minerEthAddress: addr },
            { $set: { tokensReceived: totalPaidNum } }
          );
          updated++;
        } else {
          unchanged++;
        }
      } else {
        // Miner not in backup — create with original field structure
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
    console.log(`\n  [DRY RUN] Would update/create minerData for ${miners.length} addresses`);
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

// ─── Verify a single pool mint TX or block (via eticascan API) ───
async function verifyMint(opts) {
  const contracts = CONTRACTS[opts.network];
  const eticascanUrl = opts.eticascanUrl;

  if (opts.verifyMint) {
    const txHash = opts.verifyMint;
    console.log(`\n═══ Verify Mint TX: ${txHash} ═══\n`);

    console.log('  Fetching TX from eticascan...');
    const resp = await eticascanFetch(eticascanUrl, `/tx/${txHash}`);
    if (!resp || !resp.querysuccess || !resp.result) {
      console.log('  ERROR: Transaction not found on eticascan');
      return;
    }
    const tx = resp.result;
    const blockTimestamp = tx.block ? tx.block.timestamp : null;

    console.log(`  Block:       ${tx.blockNumber}`);
    if (blockTimestamp) console.log(`  Timestamp:   ${new Date(blockTimestamp * 1000).toISOString()}`);
    console.log(`  From:        ${tx.from}`);
    console.log(`  To:          ${tx.to}`);
    console.log(`  Status:      ${tx.status === 1 ? 'SUCCESS' : 'REVERTED'}`);
    console.log(`  Gas:         ${tx.gas}`);

    // Check if this TX is to the EticaRelease contract (mint TX)
    const isToEticaRelease = tx.to && tx.to.toLowerCase() === contracts.EticaRelease.toLowerCase();
    if (!isToEticaRelease) {
      console.log(`\n  WARNING: TX target ${tx.to} is NOT the EticaRelease contract (${contracts.EticaRelease})`);
    }

    // Check transfers for mint data
    const transfers = tx.transfers || [];
    if (transfers.length === 0 && !tx.eticatransf) {
      console.log('\n  No ETI transfers found in this transaction.');
      console.log('  This TX may not be a mining/minting transaction.');
      return;
    }

    // For a mint TX, the minter is tx.from and the transfer shows the block reward
    const minter = tx.from.toLowerCase();
    const isPoolMint = opts.poolAddress ? (minter === opts.poolAddress) : null;

    // eticatransf field contains the ETI transfer amount if any
    const transferAmount = tx.eticatransf || (transfers.length > 0 ? transfers[0].amount : '0');
    const rewardETI = Number(BigInt(transferAmount)) / 1e18;

    console.log(`\n  ┌─ Mint Analysis ────────────────────────────────────`);
    console.log(`  │ Minter:         ${tx.from}`);
    if (isPoolMint !== null) {
      console.log(`  │ Is pool mint:   ${isPoolMint ? 'YES' : 'NO (different address)'}`);
      if (!isPoolMint) {
        console.log(`  │   Pool address: ${opts.poolAddress}`);
      }
    } else {
      console.log(`  │ Is pool mint:   (use --pool-address to check)`);
    }
    console.log(`  │ ETI transferred: ${transferAmount} wei (${rewardETI.toFixed(8)} ETI)`);

    if (transfers.length > 0) {
      console.log(`  │`);
      console.log(`  │ Transfers in this TX:`);
      for (const t of transfers) {
        const amt = Number(BigInt(t.amount)) / 1e18;
        console.log(`  │   ${t.from} → ${t.to}: ${amt.toFixed(8)} ETI`);
      }
    }

    console.log(`  └────────────────────────────────────────────────────`);
  }

  if (opts.verifyMintBlock) {
    const blockNum = opts.verifyMintBlock;
    console.log(`\n═══ Verify Mints in Block: ${blockNum} ═══\n`);

    console.log('  Fetching block with TXs from eticascan...');
    const resp = await eticascanFetch(eticascanUrl, `/blockwithtxs/${blockNum}`);
    if (!resp || !resp.data) {
      console.log('  ERROR: Block not found on eticascan');
      return;
    }
    const block = resp.data;
    console.log(`  Block:       ${block.number}`);
    console.log(`  Timestamp:   ${new Date(block.timestamp * 1000).toISOString()}`);

    const txs = block.etransactions || [];
    console.log(`  TX count:    ${txs.length}`);

    // Filter TXs that target the EticaRelease contract (potential mint TXs)
    const mintTxs = txs.filter(tx =>
      tx.to && tx.to.toLowerCase() === contracts.EticaRelease.toLowerCase()
    );

    if (mintTxs.length === 0) {
      console.log('\n  No transactions to the EticaRelease contract found in this block.');
      return;
    }

    console.log(`\n  Found ${mintTxs.length} transaction(s) to EticaRelease contract:\n`);

    // For each TX, fetch full details from /tx/{hash} to get transfer amounts
    let poolMintCount = 0;
    for (const mintTx of mintTxs) {
      console.log(`  Fetching details for TX ${mintTx.hash.slice(0, 20)}...`);
      const txResp = await eticascanFetch(eticascanUrl, `/tx/${mintTx.hash}`);
      if (!txResp || !txResp.querysuccess || !txResp.result) {
        console.log(`  ┌─ TX: ${mintTx.hash.slice(0, 24)}... ──`);
        console.log(`  │ Could not fetch TX details`);
        console.log(`  └────────────────────────────────────────────────`);
        continue;
      }

      const fullTx = txResp.result;
      const minter = fullTx.from.toLowerCase();
      const isPoolMint = opts.poolAddress ? (minter === opts.poolAddress) : null;
      if (isPoolMint) poolMintCount++;

      const transferAmount = fullTx.eticatransf || '0';
      const rewardETI = transferAmount !== '0' ? Number(BigInt(transferAmount)) / 1e18 : 0;

      console.log(`  ┌─ TX: ${fullTx.hash.slice(0, 24)}... ──`);
      console.log(`  │ Minter:         ${fullTx.from}`);
      if (isPoolMint !== null) {
        console.log(`  │ Is pool mint:   ${isPoolMint ? 'YES' : 'NO'}`);
      }
      if (transferAmount !== '0') {
        console.log(`  │ ETI transferred: ${transferAmount} wei (${rewardETI.toFixed(8)} ETI)`);
      }

      const transfers = fullTx.transfers || [];
      if (transfers.length > 0) {
        for (const t of transfers) {
          const amt = Number(BigInt(t.amount)) / 1e18;
          console.log(`  │   ${t.from} → ${t.to}: ${amt.toFixed(8)} ETI`);
        }
      }
      console.log(`  └────────────────────────────────────────────────`);
    }

    if (opts.poolAddress) {
      console.log(`\n  Summary: ${poolMintCount} pool mint(s) out of ${mintTxs.length} EticaRelease TX(s) in block ${blockNum}`);
    }
  }
}

// ─── Verify a single payment TX (via eticascan API) ───
async function verifyPayment(opts) {
  const txHash = opts.verifyPayment;
  const contracts = CONTRACTS[opts.network];
  const batchedPaymentsAddress = contracts.BatchedPayments.toLowerCase();
  const multisendSig = abiCoder.encodeFunctionSignature(MULTISEND_ABI);
  const eticascanUrl = opts.eticascanUrl;

  console.log(`\n═══ Verify Payment TX: ${txHash} ═══\n`);

  console.log('  Fetching TX from eticascan...');
  const resp = await eticascanFetch(eticascanUrl, `/tx/${txHash}`);
  if (!resp || !resp.querysuccess || !resp.result) {
    console.log('  ERROR: Transaction not found on eticascan');
    return;
  }
  const tx = resp.result;
  const blockTimestamp = tx.block ? tx.block.timestamp : null;

  console.log(`  Block:       ${tx.blockNumber}`);
  if (blockTimestamp) console.log(`  Timestamp:   ${new Date(blockTimestamp * 1000).toISOString()}`);
  console.log(`  From:        ${tx.from}`);
  console.log(`  To:          ${tx.to}`);
  console.log(`  Status:      ${tx.status === 1 ? 'SUCCESS' : 'REVERTED'}`);
  console.log(`  Gas:         ${tx.gas}`);

  // Check if this is a BatchedPayments TX
  const toAddr = (tx.to || '').toLowerCase();
  if (toAddr !== batchedPaymentsAddress) {
    console.log(`\n  WARNING: TX target ${tx.to} is NOT the BatchedPayments contract (${contracts.BatchedPayments})`);
    console.log('  This may not be a pool payment transaction.');
  }

  if (!tx.input || tx.input.length < 10) {
    console.log('\n  ERROR: No input data — this is not a contract call');
    return;
  }

  const selector = tx.input.slice(0, 10);
  if (selector !== multisendSig) {
    console.log(`\n  ERROR: Function selector ${selector} does not match multisend() (${multisendSig})`);
    console.log('  This is not a multisend payment transaction.');
    return;
  }

  console.log('  Decoding multisend() input data...');

  // Decode the multisend call (local — no RPC needed)
  const decoded = abiCoder.decodeParameters(
    MULTISEND_ABI.inputs,
    '0x' + tx.input.slice(10)
  );

  const paymentId = decoded.paymentId;
  const dests = decoded.dests;
  const values = decoded.values;
  const txStatus = tx.status === 1 ? 'success' : 'reverted';

  console.log(`\n  Payment UUID:  ${paymentId}`);
  console.log(`  TX status:     ${txStatus}`);
  console.log(`  Recipients:    ${dests.length}`);

  // Calculate totals
  let totalAmount = BigInt(0);
  const minerPayments = [];

  for (let i = 0; i < dests.length; i++) {
    const amount = BigInt(values[i]);
    totalAmount += amount;
    minerPayments.push({
      address: dests[i].toLowerCase(),
      amountWei: values[i].toString(),
      amountETI: Number(amount) / 1e18
    });
  }

  // Sort by amount descending for display
  minerPayments.sort((a, b) => b.amountETI - a.amountETI);

  const totalETI = Number(totalAmount) / 1e18;
  console.log(`  Total paid:    ${totalAmount.toString()} wei (${totalETI.toFixed(8)} ETI)`);

  console.log(`\n  ┌─ Miner Payments (${minerPayments.length} recipients) ──────────────`);
  console.log(`  │`);
  console.log(`  │  #   Address                                      Amount (ETI)         Amount (wei)`);
  console.log(`  │  ─── ──────────────────────────────────────────── ──────────────────── ─────────────────────────`);

  for (let i = 0; i < minerPayments.length; i++) {
    const p = minerPayments[i];
    const num = String(i + 1).padStart(3);
    const etiStr = p.amountETI.toFixed(8).padStart(20);
    console.log(`  │  ${num} ${p.address}  ${etiStr} ${p.amountWei}`);
  }

  console.log(`  │`);
  console.log(`  │  TOTAL: ${totalETI.toFixed(8)} ETI across ${minerPayments.length} miners`);
  console.log(`  └──────────────────────────────────────────────────────────────────`);

  // Cross-check with eticascan transfers
  const transfers = tx.transfers || [];
  if (transfers.length > 0) {
    console.log(`\n  ┌─ Eticascan Transfer Cross-Check ─────────────────`);
    console.log(`  │  Eticascan recorded ${transfers.length} ETI transfer(s) for this TX:`);
    for (const t of transfers) {
      const amt = Number(BigInt(t.amount)) / 1e18;
      console.log(`  │    ${t.from} → ${t.to}: ${amt.toFixed(8)} ETI`);
    }
    console.log(`  └──────────────────────────────────────────────────`);
  }

  // Show what the recovery script would do for each miner
  console.log(`\n  ┌─ Recovery Impact Per Miner ──────────────────────`);
  console.log(`  │`);
  console.log(`  │  What the recovery script would record for each miner:`);
  console.log(`  │`);

  if (txStatus === 'success') {
    console.log(`  │  For each miner above, this confirmed TX would:`);
    console.log(`  │    - Add to balance_payments: { minerEthAddress, amountToPay, confirmed: true }`);
    console.log(`  │    - Increment their alltimeTokenBalance by the amount`);
    console.log(`  │    - Increment their tokensAwarded by the amount`);
    console.log(`  │    - Set tokensReceived = sum of all confirmed blockchain payments`);
    console.log(`  │`);
    console.log(`  │  Example for top recipient:`);
    const top = minerPayments[0];
    console.log(`  │    ${top.address}`);
    console.log(`  │    alltimeTokenBalance += ${top.amountWei} (${top.amountETI.toFixed(8)} ETI)`);
    console.log(`  │    tokensAwarded       += ${top.amountWei}`);
    console.log(`  │    tokensReceived      += ${top.amountWei}`);
  } else {
    console.log(`  │  TX was REVERTED — no balance changes would be applied.`);
    console.log(`  │  Payments would be recorded with confirmed: false`);
  }

  console.log(`  │`);
  console.log(`  └──────────────────────────────────────────────────`);

  // Show the transaction record that would be created
  console.log(`\n  ┌─ Transaction Record ─────────────────────────────`);
  console.log(`  │  txType:       batched_payment`);
  console.log(`  │  status:       ${txStatus}`);
  console.log(`  │  txHash:       ${txHash}`);
  console.log(`  │  blockNumber:  ${tx.blockNumber}`);
  console.log(`  │  from:         ${tx.from}`);
  console.log(`  │  to:           ${tx.to}`);
  console.log(`  │  gas:          ${tx.gas}`);
  console.log(`  │  uuid:         ${paymentId}`);
  console.log(`  │  payments:     ${dests.length}`);
  console.log(`  └──────────────────────────────────────────────────`);
}

// ─── Main ───
async function main() {
  const opts = parseArgs();

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   EticaPool Database Recovery from Blockchain  ║');
  console.log('╚════════════════════════════════════════════════╝');

  // Verify (spot-check) mode — uses eticascan API, no RPC or heavy imports needed
  if (opts.verifyMint || opts.verifyMintBlock || opts.verifyPayment) {
    console.log('  Mode: VERIFICATION (spot-check via eticascan)');
    console.log(`  Network:         ${opts.network}`);
    console.log(`  Eticascan:       ${opts.eticascanUrl}`);
    if (opts.poolAddress) console.log(`  Pool address:    ${opts.poolAddress}`);

    if (opts.verifyMint || opts.verifyMintBlock) {
      await verifyMint(opts);
    }
    if (opts.verifyPayment) {
      await verifyPayment(opts);
    }
    return;
  }

  // ─── Heavy imports: only load what's needed ───
  // Swap mode needs Mongodb only.
  // Rebuild mode ALWAYS needs Web3 (RPC scanning for full history).
  // --use-eticascan only affects TX detail lookups (faster), but discovery is always via RPC.
  const needsWeb3 = !opts.swap;
  const needsMongo = !opts.dryRun || opts.swap;

  if (needsWeb3) {
    console.log('  Loading Web3 driver (this may take a moment)...');
    Web3 = (await import('web3')).default;
  }
  if (needsMongo) {
    console.log('  Loading MongoDB driver...');
    Mongodb = (await import('mongodb')).default;
  }

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
  const stepNames = { 1: 'pool_mints', 2: 'balance_payments', 3: 'minerData balances' };
  console.log(`  Network:         ${opts.network}`);
  if (opts.poolAddress) console.log(`  Pool address:    ${opts.poolAddress}`);
  if (opts.paymentAddress) console.log(`  Payment address: ${opts.paymentAddress}`);
  console.log(`  MongoDB:         ${opts.mongodbUri}`);
  console.log(`  Target DB:       ${opts.dbName} (side rebuild DB)`);
  console.log(`  Mode:            ${opts.dryRun ? 'DRY RUN' : 'LIVE WRITE'}`);
  console.log(`  Steps:           ${opts.steps ? opts.steps.map(s => `${s} (${stepNames[s] || '?'})`).join(', ') : 'all (1, 2, 3)'}`);
  console.log(`  Data source:     RPC (${opts.rpcUrl})${opts.useEticascan ? ' + Eticascan API (' + opts.eticascanUrl + ') for TX details' : ' (RPC-only, use --use-eticascan to add eticascan API)'}`);

  // Connect to Web3 (always needed for rebuild — RPC scanning for full history)
  let web3 = null;
  web3 = new Web3(opts.rpcUrl);
  try {
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`  Connected to RPC. Current block: ${blockNumber}`);
  } catch (err) {
    console.error(`  ERROR: Cannot connect to RPC at ${opts.rpcUrl}: ${err.message}`);
    process.exit(1);
  }

  // If using eticascan for TX details, test connectivity
  if (opts.useEticascan) {
    console.log('  Testing eticascan connectivity...');
    try {
      const blockResp = await eticascanFetch(opts.eticascanUrl, '/lastblock');
      if (!blockResp || !blockResp.querysuccess) throw new Error('bad response');
      console.log(`  Eticascan OK. Latest block: ${blockResp.result.number}`);
    } catch (err) {
      console.error(`  WARNING: Cannot reach eticascan API at ${opts.eticascanUrl}: ${err.message}`);
      console.error('  Will use RPC for TX details instead (slower).');
      opts.useEticascan = false;
    }
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

  const runStep = (n) => !opts.steps || opts.steps.includes(n);

  try {
    let poolMints = [];
    let allPayments = [];
    let allTransactions = [];
    let minerTotals = {};

    if (runStep(1)) {
      poolMints = await recoverPoolMints(web3, opts, dbo);
    } else {
      console.log('\n  Skipping Step 1 (pool_mints) — not in --steps');
    }

    if (runStep(2)) {
      const result = await recoverPayments(web3, opts, dbo);
      allPayments = result.allPayments;
      allTransactions = result.allTransactions;
    } else {
      console.log('  Skipping Step 2 (balance_payments) — not in --steps');
    }

    if (runStep(3)) {
      minerTotals = await recomputeMinerBalances(allPayments, opts, dbo);
    } else {
      console.log('  Skipping Step 3 (minerData balances) — not in --steps');
    }

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
