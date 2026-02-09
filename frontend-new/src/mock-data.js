// ─── Mock data matching the real Etica Pool backend data model ───
// Expanded for all pages: Dashboard, Miners, Profile, Blocks, Payments, Network

export const poolNameAndUrl = {
  poolName: 'Etica Mining Pool',
  poolUrl: 'https://pool.etica.io',
};

export const poolData = {
  // Pool operational data
  pool: {
    hashrate: 142857142,          // ~143 MH/s
    hashrate24h: 138500000,
    difficulty: '0x00000000ffff0000000000000000000000000000000000000000000000000000',
    miners: 47,
    workers: 83,
    blocksFound: 1247,
    lastBlockTime: Date.now() - 180000,
    poolFee: 1.0,
    minimumPayout: 0.1,
    networkHashrate: 2400000000,
    poolSharePercent: 5.95,
    uptime: 2592000000,           // 30 days
  },

  // From poolData socket event (Overview.vue fields)
  mintingAddress: '0x34c61EA91bAcdA647269d4e310A86b875c09946f',
  paymentsAddress: '0x8bE8E7F3c7eA1B2F5DcB84F9f4E2F1c3A6D9E0b2',
  mintingNetwork: 'Etica Mainnet',
  paymentsNetwork: 'Etica Mainnet',
  batchedPaymentsContractAddress: '0xA1b2C3d4E5f6A7B8C9D0e1F2a3B4c5D6E7f8A9b0',
  ethBlockNumber: 4892156,
  minBalanceForPayment: '100000000000000000', // 0.1 ETI in raw (18 decimals)

  // Mining contract data
  miningContract: {
    randomxBlob: 'b1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
    randomxSeedhash: '4a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    challengeNumber: '0x8f3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    epochCount: 12847,
    miningDifficulty: 2847291,
    miningTarget: '0x00000000ffff0000000000000000000000000000000000000000000000000000',
  },

  // Miners list
  miners: [
    { minerEthAddress: '0x7a3fB92c4E1d8A6F0b5C7D3e9A2f4B8c1E6d0F3a', avgHashrate: 28500000, shares: 4521, lastSeen: Date.now() - 30000, workers: 3, alltimeTokenBalance: '245800000000000000000', tokensReceived: '198500000000000000000', entryport: 3333 },
    { minerEthAddress: '0x1e9dA4f7B2c8E6D0a3F5b9C1d7A2e8F4b6C0D9e3', avgHashrate: 19200000, shares: 3102, lastSeen: Date.now() - 45000, workers: 2, alltimeTokenBalance: '182350000000000000000', tokensReceived: '156200000000000000000', entryport: 5555 },
    { minerEthAddress: '0xb4c29e1fD3a8B6C0e5F7A2d4E9b1C3f8A6D0B5e7', avgHashrate: 15800000, shares: 2847, lastSeen: Date.now() - 15000, workers: 4, alltimeTokenBalance: '156200000000000000000', tokensReceived: '134500000000000000000', entryport: 7777 },
    { minerEthAddress: '0x3d8a6c4bE2f9A1D7b5C3e8F0a4B6d2C9E1f7A3b0', avgHashrate: 12400000, shares: 2103, lastSeen: Date.now() - 60000, workers: 1, alltimeTokenBalance: '134500000000000000000', tokensReceived: '121750000000000000000', entryport: 3333 },
    { minerEthAddress: '0xf2e71a3dB4c8A6D0e5F9b2C7d1A3E8f4B6C0D9e5', avgHashrate: 11200000, shares: 1956, lastSeen: Date.now() - 20000, workers: 2, alltimeTokenBalance: '121750000000000000000', tokensReceived: '98400000000000000000', entryport: 9999 },
    { minerEthAddress: '0x9c1b5e8fA2d7B3C0e6F1a9D4b8C2E5f7A3B0D6e1', avgHashrate: 9800000, shares: 1721, lastSeen: Date.now() - 90000, workers: 1, alltimeTokenBalance: '98400000000000000000', tokensReceived: '87600000000000000000', entryport: 3333 },
    { minerEthAddress: '0x6a4d2b7cF1e8A3D0b5C9E6f2A7d4B1C8e3F0A5b9', avgHashrate: 8500000, shares: 1534, lastSeen: Date.now() - 35000, workers: 2, alltimeTokenBalance: '87600000000000000000', tokensReceived: '72150000000000000000', entryport: 5555 },
    { minerEthAddress: '0xd5f38c1eB2a7D4C0e6F9b3A1d5E8c2F7B0A6D4e9', avgHashrate: 7200000, shares: 1298, lastSeen: Date.now() - 50000, workers: 1, alltimeTokenBalance: '72150000000000000000', tokensReceived: '65300000000000000000', entryport: 3333 },
    { minerEthAddress: '0x2e8c4a9bD1f7A3C0e5B8d6E2a9F4c1B7D3A0E6b5', avgHashrate: 6100000, shares: 1087, lastSeen: Date.now() - 25000, workers: 1, alltimeTokenBalance: '65300000000000000000', tokensReceived: '54800000000000000000', entryport: 7777 },
    { minerEthAddress: '0x8b1f7d3aE2c9A4D0b6F1e8B5a3C7d0F2A9E4b1C6', avgHashrate: 5400000, shares: 956, lastSeen: Date.now() - 70000, workers: 1, alltimeTokenBalance: '54800000000000000000', tokensReceived: '48200000000000000000', entryport: 3333 },
    { minerEthAddress: '0x4c7e0f2dA1b8C3D6e9F5a2B7d4E1c8F0A6D3B9e5', avgHashrate: 4800000, shares: 845, lastSeen: Date.now() - 40000, workers: 1, alltimeTokenBalance: '48200000000000000000', tokensReceived: '42100000000000000000', entryport: 5555 },
    { minerEthAddress: '0xa3d96e5cB1f8A2D0e7C4b9E3a6F1d5C8B0A7D2e4', avgHashrate: 4200000, shares: 734, lastSeen: Date.now() - 55000, workers: 1, alltimeTokenBalance: '42100000000000000000', tokensReceived: '36450000000000000000', entryport: 3333 },
  ],

  // Pool status
  poolStatus: {
    poolStatus: 'active',
    mintingAccountBalances: {
      ETH: '2450000000000000000',  // 2.45 EGAZ
      token: '125800000000000000000', // 125.8 ETI
    },
    paymentsAccountBalances: {
      ETH: '5120000000000000000',  // 5.12 EGAZ
      token: '8450000000000000000000', // 8450 ETI
    },
    poolFeesMetrics: {
      avgGasPriceGWei: 25,
      miningRewardRaw: '50000000000000000000', // 50 ETI
      token_Eth_Price_Ratio: 0.0042,
      poolBaseFee: 0.01,
      poolRewardsBonus: 0,
    },
  },

  // Recent blocks / solutions
  recentBlocks: [
    { epoch: 12847, hash: '0xabc7d3f2e14b9c8def01a2b3c4d5e6f7a8b9c0d1', time: Date.now() - 180000, reward: '50.00', finder: '0x7a3fB92c...0F3a' },
    { epoch: 12846, hash: '0x9e2f1a8b7c6d3e5f0a12b3c4d5e6f7a8b9c0d1e2', time: Date.now() - 540000, reward: '50.00', finder: '0x1e9dA4f7...D9e3' },
    { epoch: 12845, hash: '0x5c8d4e7f2a1b6a9c3d45e6f7a8b9c0d1e2f3a4b5', time: Date.now() - 1200000, reward: '50.00', finder: '0xb4c29e1f...B5e7' },
    { epoch: 12844, hash: '0x3a1b9c8d7e2f5e4a6b78c9d0e1f2a3b4c5d6e7f8', time: Date.now() - 2400000, reward: '50.00', finder: '0x7a3fB92c...0F3a' },
    { epoch: 12843, hash: '0x7f4e2d1c8a9b3a5c7d90e1f2a3b4c5d6e7f8a9b0', time: Date.now() - 4800000, reward: '50.00', finder: '0xf2e71a3d...D9e5' },
    { epoch: 12842, hash: '0x2d9a8c7b6e4f1e3d5a23b4c5d6e7f8a9b0c1d2e3', time: Date.now() - 7200000, reward: '50.00', finder: '0x3d8a6c4b...A3b0' },
    { epoch: 12841, hash: '0x8b3c5a1d7f6e2f4c9a56b7c8d9e0f1a2b3c4d5e6', time: Date.now() - 10800000, reward: '50.00', finder: '0x9c1b5e8f...D6e1' },
    { epoch: 12840, hash: '0x1e7d4f9c2a8b5a3c6d89e0f1a2b3c4d5e6f7a8b9', time: Date.now() - 14400000, reward: '50.00', finder: '0x1e9dA4f7...D9e3' },
  ],

  // Network data
  network: {
    blockHeight: 4892156,
    difficulty: 2847291,
    lastBlock: Date.now() - 120000,
    etiPrice: 0.0042,
    etiPriceUsd: 12.50,
    epoch: 12847,
    gasPrice: 25,
  },

  // Recent payouts
  payouts: [
    { address: '0x7a3fB92c...0F3a', amount: '125.50', txHash: '0xfed9c8b7a65e4d3c2b1a0f9e8d7c6b5a4e3f2d1c0b9a8e7d6c5b4a3f2e1d0c9', time: Date.now() - 86400000, status: 'confirmed' },
    { address: '0x1e9dA4f7...D9e3', amount: '98.20', txHash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1', time: Date.now() - 172800000, status: 'confirmed' },
    { address: '0xb4c29e1f...B5e7', amount: '156.80', txHash: '0x2f3e4d5c6b7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3', time: Date.now() - 259200000, status: 'confirmed' },
    { address: '0x3d8a6c4b...A3b0', amount: '72.30', txHash: '0x8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9', time: Date.now() - 345600000, status: 'confirmed' },
    { address: '0xf2e71a3d...D9e5', amount: '210.15', txHash: '0x4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5', time: Date.now() - 432000000, status: 'confirmed' },
    { address: '0x9c1b5e8f...D6e1', amount: '45.60', txHash: '0x6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7', time: Date.now() - 518400000, status: 'confirmed' },
  ],

  // Stratum connection ports
  stratumPorts: [
    { port: 3333, label: 'Low-end CPU', difficulty: 400000 },
    { port: 5555, label: 'Mid-range CPU', difficulty: 500000 },
    { port: 7777, label: 'High-end CPU', difficulty: 1000000 },
    { port: 9999, label: 'Very-High-end CPU', difficulty: 2000000 },
  ],

  // Smart contract
  smartContractAddress: '0x34c61EA91bAcdA647269d4e310A86b875c09946f',
};

// ─── Miner Profile Data (for /miner/:address) ───

export const minerData = {
  minerEthAddress: '0x7a3fB92c4E1d8A6F0b5C7D3e9A2f4B8c1E6d0F3a',
  totalAvgHashrate: 28500000,
  totalLast24hTokenBalance: '12500000000000000000',
  totalAlltimeTokenBalance: '245800000000000000000',
  totalTokensAwarded: '248200000000000000000',
  totalTokensReceived: '198500000000000000000',
  lastSubmittedSolutionTime: Date.now() - 30000,
  workers: [
    { workerName: 'rig-01', minerEthAddress: '0x7a3fB92c4E1d8A6F0b5C7D3e9A2f4B8c1E6d0F3arig-01', lastSubmittedSolutionTime: Date.now() - 30000, entryport: 3333, avgHashrate: 14200000, alltimeTokenBalance: '128500000000000000000' },
    { workerName: 'rig-02', minerEthAddress: '0x7a3fB92c4E1d8A6F0b5C7D3e9A2f4B8c1E6d0F3arig-02', lastSubmittedSolutionTime: Date.now() - 45000, entryport: 5555, avgHashrate: 9800000, alltimeTokenBalance: '82100000000000000000' },
    { workerName: 'gpu-farm', minerEthAddress: '0x7a3fB92c4E1d8A6F0b5C7D3e9A2f4B8c1E6d0F3agpu-farm', lastSubmittedSolutionTime: Date.now() - 120000, entryport: 7777, avgHashrate: 4500000, alltimeTokenBalance: '35200000000000000000' },
  ],
};

export const minerShares = Array.from({ length: 100 }, (_, i) => ({
  block: 4892156 - i * 3,
  difficulty: String(400000 + Math.floor(Math.random() * 100000)),
  challengeNumber: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
  entryport: [3333, 5555, 7777, 9999][i % 4],
}));

export const minerPayments = Array.from({ length: 100 }, (_, i) => ({
  block: 4892000 - i * 50,
  amountToPay: String(BigInt(Math.floor(1e18 * (0.5 + Math.random() * 5)))),
  batchedPaymentUuid: `batch-${String(1000 - i).padStart(4, '0')}-${Math.random().toString(36).slice(2, 10)}`,
  txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
  status: i < 3 ? 'pending' : 'confirmed',
}));

export const challengeDetails = {
  miningcontract: {
    epochCount: 12847,
    challengeNumber: '0x8f3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
  },
  TotalDiffHard: { totaldiff: '98472910000' },
  miner_challengediff: { totaldiff: '5847291000', minerport: 3333 },
};

export const ppnlsRewards = Array.from({ length: 20 }, (_, i) => {
  const poolShares = 1000 + Math.floor(Math.random() * 500);
  const myShares = 40 + Math.floor(Math.random() * 80);
  const reward = 2 + Math.random() * 5;
  const bonus = Math.random() > 0.7 ? reward * 0.1 : 0;
  return {
    epochCount: 12847 - i,
    ChallengeNumber: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    poolshares: poolShares,
    shares: myShares,
    tokensAwarded: String(BigInt(Math.floor(reward * 1e18))),
    bonusAwarded: bonus > 0 ? String(BigInt(Math.floor(bonus * 1e18))) : '0',
    minerport: [3333, 5555, 7777, 9999][i % 4],
  };
});

// ─── Blocks / Epochs Data (for /blocks) ───

export const mintList = Array.from({ length: 50 }, (_, i) => ({
  epochCount: 12847 - i,
  transactionhash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
  from: poolData.miners[i % poolData.miners.length].minerEthAddress,
}));

// ─── Payments Page Data ───

export const statsPayment = {
  actual_total_coins_owed: '4250000000000000000000', // 4250 ETI
  actual_total_next_coins_batchs: '850000000000000000000', // 850 ETI
  createdAt: Date.now() - 3600000,
};

export const poolMints = Array.from({ length: 50 }, (_, i) => ({
  epochCount: 12847 - i,
  transactionhash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
  poolstatus: i < 2 ? 0 : i < 10 ? 2 : 1,
  blockreward: '50000000000000000000', // 50 ETI
}));

export const recentPaymentsBatched = Array.from({ length: 30 }, (_, i) => ({
  block: 4892100 - i * 20,
  txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
  status: i < 1 ? 'pending' : 'confirmed',
}));

// ─── Network Page Data ───

export const poolList = [
  { name: 'Etica Mining Pool', url: 'https://pool.etica.io', mintAddress: '0x34c61EA91bAcdA647269d4e310A86b875c09946f', Numberminers: 47, Hashrate: 142857142, lastupdate: Date.now() - 30000, poolserver: true },
  { name: 'EticaHash', url: 'https://eticahash.net', mintAddress: '0xA2b3C4d5E6f7A8B9C0D1e2F3a4B5c6D7E8f9A0b1', Numberminers: 23, Hashrate: 78500000, lastupdate: Date.now() - 120000, poolserver: false },
  { name: 'MineEtica', url: 'https://mine.etica.network', mintAddress: '0xB3c4D5e6F7a8B9C0D1E2f3A4b5C6d7E8F9a0B1c2', Numberminers: 12, Hashrate: 35200000, lastupdate: Date.now() - 300000, poolserver: false },
  { name: 'ETI Solo Pool', url: 'https://solo.etipool.com', mintAddress: '0xC4d5E6f7A8b9C0D1E2F3a4B5c6D7e8F9A0b1C2d3', Numberminers: 5, Hashrate: 12400000, lastupdate: Date.now() - 600000, poolserver: false },
  { name: 'CryptoMine ETI', url: 'https://eti.cryptomine.org', mintAddress: '0xD5e6F7a8B9c0D1E2F3A4b5C6d7E8f9A0B1c2D3e4', Numberminers: 8, Hashrate: 22100000, lastupdate: Date.now() - 180000, poolserver: false },
];

export const mintAddressesList = poolList.map((p) => ({
  mintAddress: p.mintAddress,
  name: p.name,
  url: p.url,
}));

// ─── Helpers ───

export function formatHashrate(h) {
  if (h >= 1e9) return (h / 1e9).toFixed(2) + ' GH/s';
  if (h >= 1e6) return (h / 1e6).toFixed(2) + ' MH/s';
  if (h >= 1e3) return (h / 1e3).toFixed(2) + ' KH/s';
  return h.toFixed(0) + ' H/s';
}

export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatNumber(n) {
  if (n === undefined || n === null) return '0';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function truncateAddress(addr, len = 8) {
  if (!addr || addr.length <= len * 2 + 3) return addr;
  return addr.slice(0, len + 2) + '...' + addr.slice(-len);
}

export function rawToFormatted(raw, decimals = 18) {
  if (!raw) return '0';
  const str = raw.toString().padStart(decimals + 1, '0');
  const whole = str.slice(0, -decimals) || '0';
  const frac = str.slice(-decimals).slice(0, 4);
  return whole + '.' + frac;
}

export function mintStatusLabel(poolstatus) {
  if (poolstatus === 0) return 'unprocessed';
  if (poolstatus === 2) return 'processed + rewards';
  return 'confirmed';
}
