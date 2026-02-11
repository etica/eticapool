#!/usr/bin/env node

/**
 * Verify Recovery Sample — Test the recovery logic on a small sample
 *
 * Uses ONLY the eticascan API (no RPC, no Web3 import, instant startup).
 * Scans a narrow range of recent pool activity and shows what the
 * recovery script would detect + insert.
 *
 * Usage:
 *   node scripts/verify-recovery-sample.js --pool-address <addr> --payment-address <addr> [options]
 *
 * Options:
 *   --pool-address      Pool minting address (required)
 *   --payment-address   Pool payment/batched-payments sender address (required)
 *   --network           "etica" or "crucible" (default: etica)
 *   --eticascan-url     Eticascan API base URL (default: https://eticascan.org/apiv1)
 *   --mint-count        Number of recent pool mints to verify (default: 5)
 *   --payment-count     Number of recent payment TXs to verify (default: 3)
 */

import abiModule from 'web3-eth-abi';
const abiCoder = abiModule.default || abiModule;

import https from 'https';
import http from 'http';

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

const multisendSig = abiCoder.encodeFunctionSignature(MULTISEND_ABI);

// ─── Parse CLI arguments ───
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    poolAddress: '',
    paymentAddress: '',
    network: 'etica',
    eticascanUrl: 'https://eticascan.org/apiv1',
    mintCount: 5,
    paymentCount: 3
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--pool-address': opts.poolAddress = args[++i]; break;
      case '--payment-address': opts.paymentAddress = args[++i]; break;
      case '--network': opts.network = args[++i]; break;
      case '--eticascan-url': opts.eticascanUrl = args[++i]; break;
      case '--mint-count': opts.mintCount = parseInt(args[++i]); break;
      case '--payment-count': opts.paymentCount = parseInt(args[++i]); break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!opts.poolAddress) {
    console.error('ERROR: --pool-address is required');
    process.exit(1);
  }
  if (!opts.paymentAddress) {
    console.error('ERROR: --payment-address is required');
    process.exit(1);
  }

  opts.poolAddress = opts.poolAddress.toLowerCase();
  opts.paymentAddress = opts.paymentAddress.toLowerCase();
  return opts;
}

// ─── Eticascan API helper ───
function eticascanFetch(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint}`;
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 15000 }, (res) => {
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

// ─── Step 1: Verify pool mints detection ───
async function verifyPoolMints(opts) {
  const contracts = CONTRACTS[opts.network];
  const eticaReleaseAddr = contracts.EticaRelease.toLowerCase();

  console.log('\n═══ Step 1: Verifying pool mint detection ═══');
  console.log(`  Fetching last ${opts.mintCount * 3} TXs from pool address...`);

  // Fetch enough TXs to find mintCount mints (some TXs may not be mints)
  const fetchCount = Math.min(opts.mintCount * 3, 100);
  const resp = await eticascanFetch(
    opts.eticascanUrl,
    `/etransactions/address/${opts.poolAddress}/${fetchCount}`
  );

  if (!resp || !resp.querysuccess || !resp.result) {
    console.log('  ERROR: Could not fetch transactions from eticascan');
    return { mints: [], blocks: [] };
  }

  // Filter mint TXs (to EticaRelease contract with ETI transfer)
  const allTxs = resp.result;
  console.log(`  Got ${allTxs.length} TXs from eticascan`);

  const mintTxs = allTxs.filter(tx =>
    tx.to && tx.to.toLowerCase() === eticaReleaseAddr
  );

  console.log(`  Found ${mintTxs.length} TXs to EticaRelease contract`);

  const sampled = mintTxs.slice(0, opts.mintCount);
  const mints = [];

  console.log(`\n  Verifying ${sampled.length} mint TX(s) in detail:\n`);

  for (let i = 0; i < sampled.length; i++) {
    const mintTx = sampled[i];
    process.stdout.write(`  [${i + 1}/${sampled.length}] Fetching TX ${mintTx.hash.slice(0, 20)}...`);

    const txResp = await eticascanFetch(opts.eticascanUrl, `/tx/${mintTx.hash}`);
    if (!txResp || !txResp.querysuccess || !txResp.result) {
      console.log(' FAILED to fetch');
      continue;
    }

    const tx = txResp.result;
    const transferAmount = tx.eticatransf || '0';
    const rewardETI = transferAmount !== '0' ? Number(BigInt(transferAmount)) / 1e18 : 0;
    const blockTimestamp = tx.block ? tx.block.timestamp : 0;

    console.log(` OK`);

    const mintRecord = {
      transactionhash: tx.hash,
      from: tx.from,
      blockreward: transferAmount,
      blockNumber: tx.blockNumber,
      poolstatus: 2,
      timestamp: blockTimestamp
    };
    mints.push(mintRecord);

    const ts = blockTimestamp ? new Date(blockTimestamp * 1000).toISOString() : '?';
    console.log(`       Block: ${tx.blockNumber} | ${ts}`);
    console.log(`       Reward: ${rewardETI.toFixed(8)} ETI (${transferAmount} wei)`);

    // Cross-check: transfers should show EticaRelease → pool address
    const transfers = tx.transfers || [];
    if (transfers.length > 0) {
      const t = transfers[0];
      const fromOk = t.from.toLowerCase() === eticaReleaseAddr;
      const toOk = t.to.toLowerCase() === opts.poolAddress;
      const amountOk = t.amount === transferAmount;
      const allOk = fromOk && toOk && amountOk;
      console.log(`       Cross-check: ${allOk ? 'PASS' : 'MISMATCH'} (from=${fromOk ? 'ok' : 'FAIL'} to=${toOk ? 'ok' : 'FAIL'} amount=${amountOk ? 'ok' : 'FAIL'})`);
    }
    console.log('');

    await sleep(300); // Rate limit
  }

  // Summary
  const totalReward = mints.reduce((sum, m) => sum + BigInt(m.blockreward), BigInt(0));
  const totalETI = Number(totalReward) / 1e18;
  console.log(`  ┌─ Pool Mints Summary ────────────────────────────`);
  console.log(`  │ Mints verified:     ${mints.length}`);
  console.log(`  │ Total block reward: ${totalETI.toFixed(8)} ETI`);
  if (mints.length > 0) {
    console.log(`  │ Block range:        ${mints[mints.length - 1].blockNumber} → ${mints[0].blockNumber}`);
  }
  console.log(`  │`);
  console.log(`  │ What recover-from-blockchain.js would insert:`);
  console.log(`  │   pool_mints:    ${mints.length} documents`);
  console.log(`  │   all_eti_mints: ${mints.length} documents (status: 1)`);
  console.log(`  └────────────────────────────────────────────────`);

  return { mints, blockRange: mints.length > 0 ? [mints[mints.length - 1].blockNumber, mints[0].blockNumber] : null };
}

// ─── Step 2: Verify payment TX detection ───
async function verifyPayments(opts) {
  const contracts = CONTRACTS[opts.network];
  const batchedPaymentsAddr = contracts.BatchedPayments.toLowerCase();

  console.log('\n═══ Step 2: Verifying payment TX detection ═══');
  console.log(`  Fetching last TXs from payment address ${opts.paymentAddress}...`);

  // Fetch TXs from the payment address
  const fetchCount = Math.min(opts.paymentCount * 5, 200);
  const resp = await eticascanFetch(
    opts.eticascanUrl,
    `/etransactions/address/${opts.paymentAddress}/${fetchCount}`
  );

  if (!resp || !resp.querysuccess || !resp.result) {
    console.log('  ERROR: Could not fetch transactions from eticascan');
    return { payments: [], transactions: [] };
  }

  const allTxs = resp.result;
  console.log(`  Got ${allTxs.length} TXs from eticascan`);

  // Filter TXs to BatchedPayments contract
  const paymentTxs = allTxs.filter(tx =>
    tx.to && tx.to.toLowerCase() === batchedPaymentsAddr
  );

  console.log(`  Found ${paymentTxs.length} TXs to BatchedPayments contract`);

  if (paymentTxs.length === 0) {
    console.log('  No payment TXs found. Is the --payment-address correct?');
    console.log(`  Payment address: ${opts.paymentAddress}`);
    console.log(`  BatchedPayments: ${contracts.BatchedPayments}`);

    // Show what addresses the TXs went to
    const uniqueTos = [...new Set(allTxs.map(tx => tx.to).filter(Boolean))];
    console.log(`  TXs sent to these addresses instead:`);
    for (const addr of uniqueTos.slice(0, 10)) {
      const count = allTxs.filter(tx => tx.to === addr).length;
      console.log(`    ${addr} (${count} TXs)`);
    }
    return { payments: [], transactions: [] };
  }

  const sampled = paymentTxs.slice(0, opts.paymentCount);
  const allPayments = [];
  const allTransactions = [];

  console.log(`\n  Decoding ${sampled.length} payment TX(s) in detail:\n`);

  for (let i = 0; i < sampled.length; i++) {
    const payTx = sampled[i];
    process.stdout.write(`  [${i + 1}/${sampled.length}] Fetching TX ${payTx.hash.slice(0, 20)}...`);

    const txResp = await eticascanFetch(opts.eticascanUrl, `/tx/${payTx.hash}`);
    if (!txResp || !txResp.querysuccess || !txResp.result) {
      console.log(' FAILED to fetch');
      continue;
    }

    const tx = txResp.result;
    console.log(` OK`);

    const blockTimestamp = tx.block ? tx.block.timestamp : 0;
    const ts = blockTimestamp ? new Date(blockTimestamp * 1000).toISOString() : '?';
    const txStatus = tx.status === 1 ? 'success' : 'reverted';

    // Check input data
    if (!tx.input || tx.input.length < 10) {
      console.log(`       SKIP: No input data`);
      continue;
    }

    const selector = tx.input.slice(0, 10);
    if (selector !== multisendSig) {
      console.log(`       SKIP: selector ${selector} != multisend ${multisendSig}`);
      continue;
    }

    // Decode multisend
    let decoded;
    try {
      decoded = abiCoder.decodeParameters(
        MULTISEND_ABI.inputs,
        '0x' + tx.input.slice(10)
      );
    } catch (err) {
      console.log(`       DECODE ERROR: ${err.message}`);
      continue;
    }

    const paymentId = decoded.paymentId;
    const dests = decoded.dests;
    const values = decoded.values;

    let totalAmount = BigInt(0);
    const payments = [];
    for (let j = 0; j < dests.length; j++) {
      const amount = BigInt(values[j]);
      totalAmount += amount;
      payments.push({
        minerEthAddress: dests[j].toLowerCase(),
        amountToPay: values[j].toString(),
        block: tx.blockNumber,
        batchedPaymentUuid: paymentId,
        txHash: tx.hash,
        confirmed: txStatus === 'success',
        recoveredFromBlockchain: true
      });
    }

    const totalETI = Number(totalAmount) / 1e18;

    const txRecord = {
      txType: 'batched_payment',
      status: txStatus,
      txHash: tx.hash,
      txData: {
        uuid: paymentId,
        payments: dests.map((d, idx) => ({
          minerEthAddress: d,
          amountToPay: values[idx].toString()
        }))
      },
      blockNumber: tx.blockNumber,
      from: tx.from,
      to: tx.to,
      gasUsed: tx.gas,
      recoveredFromBlockchain: true
    };

    allPayments.push(...payments);
    allTransactions.push(txRecord);

    console.log(`       Block: ${tx.blockNumber} | ${ts} | ${txStatus}`);
    console.log(`       UUID:  ${paymentId.slice(0, 20)}...`);
    console.log(`       Recipients: ${dests.length} | Total: ${totalETI.toFixed(8)} ETI`);

    // Show first 5 recipients
    const sortedPayments = [...payments].sort((a, b) =>
      Number(BigInt(b.amountToPay) - BigInt(a.amountToPay))
    );
    const showCount = Math.min(5, sortedPayments.length);
    for (let j = 0; j < showCount; j++) {
      const p = sortedPayments[j];
      const eti = Number(BigInt(p.amountToPay)) / 1e18;
      console.log(`         ${p.minerEthAddress}  ${eti.toFixed(8)} ETI`);
    }
    if (sortedPayments.length > showCount) {
      console.log(`         ... and ${sortedPayments.length - showCount} more`);
    }

    // Cross-check with eticascan transfers
    const transfers = tx.transfers || [];
    if (transfers.length > 0) {
      // Sum transfer amounts from eticascan
      const eticascanTotal = transfers.reduce((s, t) => s + BigInt(t.amount), BigInt(0));
      const eticascanETI = Number(eticascanTotal) / 1e18;
      const amountMatch = eticascanTotal === totalAmount;
      const countMatch = transfers.length === dests.length;
      console.log(`       Cross-check vs eticascan transfers:`);
      console.log(`         Count: decoded=${dests.length} eticascan=${transfers.length} ${countMatch ? 'PASS' : 'MISMATCH'}`);
      console.log(`         Total: decoded=${totalETI.toFixed(8)} eticascan=${eticascanETI.toFixed(8)} ${amountMatch ? 'PASS' : 'MISMATCH'}`);
    }
    console.log('');

    await sleep(300);
  }

  // Summary
  const grandTotal = allPayments.reduce((s, p) => s + BigInt(p.amountToPay), BigInt(0));
  const grandETI = Number(grandTotal) / 1e18;
  const confirmedPayments = allPayments.filter(p => p.confirmed);
  const revertedPayments = allPayments.filter(p => !p.confirmed);

  console.log(`  ┌─ Payments Summary ──────────────────────────────`);
  console.log(`  │ Payment TXs decoded:    ${allTransactions.length}`);
  console.log(`  │ Individual payments:    ${allPayments.length}`);
  console.log(`  │   Confirmed:            ${confirmedPayments.length}`);
  console.log(`  │   Reverted:             ${revertedPayments.length}`);
  console.log(`  │ Total ETI paid:         ${grandETI.toFixed(8)} ETI`);

  // Unique miners
  const uniqueMiners = [...new Set(allPayments.map(p => p.minerEthAddress.slice(0, 42)))];
  console.log(`  │ Unique miners:          ${uniqueMiners.length}`);

  console.log(`  │`);
  console.log(`  │ What recover-from-blockchain.js would insert:`);
  console.log(`  │   transactions:      ${allTransactions.length} documents`);
  console.log(`  │   balance_payments:  ${allPayments.length} documents`);
  console.log(`  └────────────────────────────────────────────────`);

  return { payments: allPayments, transactions: allTransactions };
}

// ─── Step 3: Simulate minerData balance recomputation ───
function simulateMinerBalances(allPayments) {
  console.log('\n═══ Step 3: Simulating minerData balance recomputation ═══');

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

  console.log(`  Unique miners with confirmed payments: ${miners.length}\n`);

  console.log(`  ┌─ minerData Updates (what recovery would set) ───`);
  console.log(`  │`);
  console.log(`  │  Address                                      Payments  Total ETI            alltimeTokenBalance (wei)`);
  console.log(`  │  ──────────────────────────────────────────── ──────── ──────────────────── ─────────────────────────`);

  for (const [addr, data] of miners) {
    const etiAmount = Number(data.totalPaid) / 1e18;
    const payments = String(data.paymentCount).padStart(8);
    const etiStr = etiAmount.toFixed(8).padStart(20);
    console.log(`  │  ${addr} ${payments} ${etiStr} ${data.totalPaid.toString()}`);
  }

  console.log(`  │`);

  const grandTotal = miners.reduce((s, [, d]) => s + d.totalPaid, BigInt(0));
  const grandETI = Number(grandTotal) / 1e18;
  console.log(`  │  TOTAL: ${miners.length} miners, ${grandETI.toFixed(8)} ETI`);
  console.log(`  │`);
  console.log(`  │  For each miner, recovery would set:`);
  console.log(`  │    alltimeTokenBalance = totalPaid (if > current value)`);
  console.log(`  │    tokensAwarded       = totalPaid (if > current value)`);
  console.log(`  │    tokensReceived      = totalPaid.toString()`);
  console.log(`  └────────────────────────────────────────────────`);
}

// ─── Main ───
async function main() {
  const opts = parseArgs();

  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   EticaPool Recovery Verification (Sample Test)   ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`  Network:         ${opts.network}`);
  console.log(`  Pool address:    ${opts.poolAddress}`);
  console.log(`  Payment address: ${opts.paymentAddress}`);
  console.log(`  Eticascan:       ${opts.eticascanUrl}`);
  console.log(`  Sample size:     ${opts.mintCount} mints, ${opts.paymentCount} payment TXs`);

  try {
    // Test eticascan connectivity
    console.log('\n  Testing eticascan connectivity...');
    const blockResp = await eticascanFetch(opts.eticascanUrl, '/lastblock');
    if (!blockResp || !blockResp.querysuccess) {
      console.error('  ERROR: Cannot reach eticascan API');
      process.exit(1);
    }
    console.log(`  Eticascan OK. Latest block: ${blockResp.result.number}`);

    const { mints } = await verifyPoolMints(opts);
    const { payments } = await verifyPayments(opts);

    if (payments.length > 0) {
      simulateMinerBalances(payments);
    }

    // Final verdict
    console.log('\n═══════════════════════════════════════════════════');
    console.log('         VERIFICATION RESULT');
    console.log('═══════════════════════════════════════════════════');
    const mintOk = mints.length > 0;
    const payOk = payments.length > 0;
    console.log(`  Pool mint detection:    ${mintOk ? 'PASS (' + mints.length + ' mints found)' : 'FAIL (no mints found)'}`);
    console.log(`  Payment TX detection:   ${payOk ? 'PASS (' + payments.length + ' payments decoded)' : 'NEEDS VERIFICATION'}`);
    console.log(`  ABI decoding:           ${payOk ? 'PASS (multisend decoded successfully)' : 'NOT TESTED'}`);
    console.log(`  Balance recomputation:  ${payOk ? 'PASS (see miner table above)' : 'NOT TESTED'}`);

    if (!payOk) {
      console.log('\n  Payment detection returned 0 results.');
      console.log('  Make sure --payment-address is the address that sends batched payments,');
      console.log('  NOT the pool minting address (they are usually different).');
    }

    console.log('\n  If all checks pass, the full recovery script should work correctly.');
    console.log('  Run the full rebuild with:');
    console.log(`    node scripts/recover-from-blockchain.js --pool-address ${opts.poolAddress} \\`);
    console.log(`      --payment-address ${opts.paymentAddress} --use-eticascan --dry-run`);
    console.log('═══════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('\nFATAL ERROR:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
