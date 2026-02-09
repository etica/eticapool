/**
 * API test script for eticapool backend
 * Usage: node test/test-api.js [base_url]
 * Default base_url: http://localhost:80
 */

const BASE_URL = process.argv[2] || 'http://localhost:80';

// Sample addresses for testing (replace with real ones if you have them)
const SAMPLE_MINER_ADDRESS = '0x0000000000000000000000000000000000000001';
const SAMPLE_DAY_TIMESTAMP = Math.floor(Date.now() / 1000) - 86400; // yesterday

const endpoints = [
  // Generic query endpoints
  { method: 'GET', path: '/api/v1/overview', description: 'Pool overview/status' },
  { method: 'GET', path: '/api/v1/poolrecords', description: 'Pool stats records' },
  { method: 'GET', path: '/api/v1/gettotalminerhashrate', description: 'Total miner hashrate' },
  { method: 'GET', path: '/api/v1/networkpools', description: 'Network pools list' },
  { method: 'GET', path: '/api/v1/networkpoolinfo', description: 'Network pool info' },
  { method: 'GET', path: '/api/v1/networkmintaddresses', description: 'Network mint addresses' },
  { method: 'GET', path: '/api/v1/miningcontracts', description: 'Mining contracts' },
  { method: 'GET', path: '/api/v1/lastsolutions', description: 'Last solutions' },
  { method: 'GET', path: '/api/v1/lastpoolmints', description: 'Last pool mints' },

  // Parameterized endpoints
  { method: 'GET', path: `/api/v1/minerhashrate/${SAMPLE_MINER_ADDRESS}`, description: 'Miner hashrate' },
  { method: 'GET', path: `/api/v1/checkmineranyshare/${SAMPLE_MINER_ADDRESS}`, description: 'Check miner shares' },
  { method: 'GET', path: `/api/v1/daily/metrics/${SAMPLE_DAY_TIMESTAMP}`, description: 'Daily pool metrics' },
  { method: 'GET', path: `/api/v1/daily/networkmetrics/${SAMPLE_DAY_TIMESTAMP}`, description: 'Daily network metrics' },

  // POST endpoint
  { method: 'POST', path: '/api/v1/poolinfo', description: 'Pool info (POST)', body: { mintAddress: SAMPLE_MINER_ADDRESS } },
];

async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  const opts = {
    method: endpoint.method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (endpoint.body) {
    opts.body = JSON.stringify(endpoint.body);
  }

  const start = Date.now();
  try {
    const res = await fetch(url, opts);
    const elapsed = Date.now() - start;
    const text = await res.text();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    const preview = JSON.stringify(parsed).substring(0, 120);
    const status = res.status === 200 ? 'PASS' : 'WARN';
    console.log(`  ${status}  ${res.status}  ${elapsed.toString().padStart(5)}ms  ${endpoint.method.padEnd(4)} ${endpoint.path}`);
    console.log(`         ${endpoint.description}: ${preview}${preview.length >= 120 ? '...' : ''}`);
    return { endpoint, status: res.status, elapsed, ok: true };
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`  FAIL  ---  ${elapsed.toString().padStart(5)}ms  ${endpoint.method.padEnd(4)} ${endpoint.path}`);
    console.log(`         ${endpoint.description}: ${err.message}`);
    return { endpoint, status: 0, elapsed, ok: false, error: err.message };
  }
}

async function main() {
  console.log(`\nTesting eticapool API at ${BASE_URL}\n`);
  console.log('='.repeat(80));

  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    console.log('');
  }

  console.log('='.repeat(80));
  const passed = results.filter(r => r.ok && r.status === 200).length;
  const warned = results.filter(r => r.ok && r.status !== 200).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`\nResults: ${passed} passed, ${warned} non-200, ${failed} failed (${results.length} total)`);

  if (failed > 0) {
    console.log('\nFailed endpoints (connection errors):');
    results.filter(r => !r.ok).forEach(r => {
      console.log(`  - ${r.endpoint.method} ${r.endpoint.path}: ${r.error}`);
    });
  }
}

main();
