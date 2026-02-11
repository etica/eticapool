import { API_BASE_URL } from '../config/constants';

async function fetchJSON(path) {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

export function getPoolOverview() {
  return fetchJSON('/api/v2/pool/overview');
}

export function getMiners() {
  return fetchJSON('/api/v2/pool/miners');
}

export function getMiner(addr) {
  return fetchJSON(`/api/v2/pool/miner/${addr}`);
}

export function getMinerShares(addr) {
  return fetchJSON(`/api/v2/pool/miner/${addr}/shares`);
}

export function getMinerPayments(addr) {
  return fetchJSON(`/api/v2/pool/miner/${addr}/payments`);
}

export function getMinerRewards(addr) {
  return fetchJSON(`/api/v2/pool/miner/${addr}/rewards`);
}

export function getPayments() {
  return fetchJSON('/api/v2/pool/payments');
}

export function getBlocks() {
  return fetchJSON('/api/v2/pool/blocks');
}

export function getNetwork() {
  return fetchJSON('/api/v2/pool/network');
}

export function getStats24h() {
  return fetchJSON('/api/v2/pool/stats/24h');
}

export function getMinerSharesChart(addr) {
  return fetchJSON(`/api/v2/pool/miner/${addr}/shares/chart`);
}

export function getMinerRewardsChart(addr) {
  return fetchJSON(`/api/v2/pool/miner/${addr}/rewards/chart`);
}
