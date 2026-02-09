import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { poolData, poolNameAndUrl, formatHashrate, timeAgo, formatNumber, truncateAddress, rawToFormatted } from '../../mock-data';
import './styles.css';

/* ---------- Small Subcomponents ---------- */

function LiveDot() {
  return (
    <div className="flex items-center gap-2">
      <div className="mono-pulse-dot" />
      <span className="text-sm font-medium text-[#00ff41] tracking-wider uppercase">Live</span>
    </div>
  );
}

function Sparkline() {
  return <div className="mono-sparkline w-full h-5 mt-2 rounded" />;
}

function CircularGauge({ percent, label, size = 140, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e1e1e"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#monoGaugeGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="mono-ring-circle"
          style={{ '--target-offset': offset }}
        />
        <defs>
          <linearGradient id="monoGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#00ff41" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold text-[#22c55e]">{percent}%</span>
        <span className="text-xs text-[#9ca3af] mt-0.5">{label}</span>
      </div>
    </div>
  );
}

function MiniBarChart({ heights }) {
  return (
    <div className="flex items-end gap-1.5 h-16">
      {heights.map((h, i) => (
        <div
          key={i}
          className="mono-bar w-5 rounded-t"
          style={{
            height: `${h}%`,
            background: `linear-gradient(to top, #1e1e1e, ${h > 70 ? '#22c55e' : '#333333'})`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="flex-1 mono-section-line" />
    </div>
  );
}

function PortBadge({ port }) {
  return (
    <span className={`mono-port-${port} text-xs font-semibold px-2 py-0.5 rounded-full`}>
      {port}
    </span>
  );
}

function InfoItem({ label, children, mono }) {
  return (
    <div>
      <div className="mono-info-label">{label}</div>
      <div className={mono ? 'mono-info-value-mono' : 'mono-info-value'}>{children}</div>
    </div>
  );
}

function ExpandableHash({ label, value }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mb-3">
      <div className="mono-info-label mb-1">{label}</div>
      <div
        className={`mono-hash-field ${expanded ? '' : 'mono-expandable'} ${expanded ? 'expanded' : ''}`}
        onClick={() => setExpanded(!expanded)}
        title="Click to expand/collapse"
      >
        {value}
      </div>
    </div>
  );
}

/* ---------- Main Dashboard ---------- */

export default function Dashboard() {
  const { pool, miners, recentBlocks, network, payouts, miningContract, poolStatus, stratumPorts } = poolData;

  const heroStats = [
    { label: 'Pool Hashrate', value: formatHashrate(pool.hashrate) },
    { label: 'Active Miners', value: pool.miners.toString() },
    { label: 'Workers', value: pool.workers.toString() },
    { label: 'Pool Share', value: pool.poolSharePercent.toFixed(2) + '%' },
    { label: 'Blocks Found', value: formatNumber(pool.blocksFound) },
    { label: 'Last Block', value: timeAgo(pool.lastBlockTime) },
  ];

  const barHeights = [65, 85, 45, 90, 55, 75, 60, 95];

  return (
    <div className="mono-dark min-h-screen text-[#e5e7eb] font-['Inter',sans-serif]">
      {/* ========== TOP BAR / HEADER ========== */}
      <header className="mono-section border-b border-[#1e1e1e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Logo + Name + Status */}
            <div className="flex items-center gap-4">
              <img
                src="/images/eti-logo.png"
                alt="ETI"
                className="w-10 h-10"
              />
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-white tracking-tight">
                    {poolNameAndUrl.poolName}
                  </span>
                  <span className="mono-status-active inline-flex items-center gap-1.5">
                    <span className="mono-pulse-dot" style={{ width: 6, height: 6 }} />
                    {poolStatus.poolStatus}
                  </span>
                </div>
                <div className="text-xs text-[#6b7280] mt-0.5 font-mono">
                  {poolNameAndUrl.poolUrl}
                </div>
              </div>
            </div>

            {/* Search + Nav */}
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="0x... Search miner address"
                className="mono-search-input px-4 py-2 text-sm w-64 hidden sm:block"
                readOnly
              />
              <LiveDot />
              <Link
                to="/"
                className="mono-pill text-sm text-[#9ca3af] border border-[#1e1e1e] rounded-full px-4 py-1.5"
              >
                &larr; Templates
              </Link>
            </div>
          </div>

          {/* Stratum Ports Row */}
          <div className="flex flex-wrap gap-3 mt-4">
            {stratumPorts.map((sp) => (
              <div key={sp.port} className="mono-port-card flex items-center gap-3">
                <PortBadge port={sp.port} />
                <div>
                  <div className="text-xs text-[#d1d5db] font-medium">{sp.label}</div>
                  <div className="text-[10px] text-[#6b7280]">Diff: {formatNumber(sp.difficulty)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ========== HERO STATS ROW ========== */}
        <section className="mono-section grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {heroStats.map((stat) => (
            <div key={stat.label} className="mono-card p-5">
              <p className="text-[10px] text-[#9ca3af] font-medium tracking-wider uppercase mb-2">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-[#00ff41] mono-hero-glow leading-none">
                {stat.value}
              </p>
              <Sparkline />
            </div>
          ))}
        </section>

        {/* ========== GAUGES + NETWORK ROW ========== */}
        <section className="mono-section grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Network Share Gauge */}
          <div className="mono-card p-6 flex flex-col items-center justify-center">
            <p className="text-xs text-[#9ca3af] font-medium tracking-wider uppercase mb-6">
              Network Share
            </p>
            <div className="relative flex items-center justify-center">
              <CircularGauge percent={pool.poolSharePercent} label="of network" />
            </div>
            <p className="text-sm text-[#9ca3af] mt-4">
              Pool: {formatHashrate(pool.hashrate)} / Network: {formatHashrate(pool.networkHashrate)}
            </p>
          </div>

          {/* Blocks Found Bar Chart */}
          <div className="mono-card p-6 flex flex-col items-center justify-center">
            <p className="text-xs text-[#9ca3af] font-medium tracking-wider uppercase mb-4">
              Blocks Found
            </p>
            <p className="text-4xl font-bold text-[#00ff41] mono-hero-glow-strong leading-none">
              {formatNumber(pool.blocksFound)}
            </p>
            <p className="text-sm text-[#9ca3af] mt-2">
              {rawToFormatted(poolStatus.poolFeesMetrics.miningRewardRaw)} ETI per block
            </p>
            <div className="mt-5">
              <MiniBarChart heights={barHeights} />
            </div>
            <p className="text-xs text-[#9ca3af] mt-2">Last 8 blocks (relative difficulty)</p>
          </div>

          {/* Network Stats */}
          <div className="mono-card p-6">
            <p className="text-xs text-[#9ca3af] font-medium tracking-wider uppercase mb-5">
              Network Data
            </p>
            <div className="space-y-4">
              <div>
                <div className="mono-info-label">Block Height</div>
                <div className="text-xl font-bold text-white">{formatNumber(network.blockHeight)}</div>
              </div>
              <div>
                <div className="mono-info-label">Network Difficulty</div>
                <div className="text-xl font-bold text-white">{formatNumber(network.difficulty)}</div>
              </div>
              <div>
                <div className="mono-info-label">ETI Price</div>
                <div className="text-lg font-bold text-[#22c55e]">
                  ${network.etiPriceUsd}
                </div>
                <div className="text-xs text-[#6b7280] mt-0.5">{network.etiPrice} ETH</div>
              </div>
              <div>
                <div className="mono-info-label">Gas Price</div>
                <div className="text-sm text-[#d1d5db] font-medium">{network.gasPrice} GWei</div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== MINING CONTRACT DATA ========== */}
        <section className="mono-section">
          <div className="mono-card p-6">
            <SectionHeader title="Mining Contract Data" />
            <div className="space-y-0">
              <ExpandableHash label="RandomX Blob" value={miningContract.randomxBlob} />
              <ExpandableHash label="RandomX Seedhash" value={miningContract.randomxSeedhash} />
              <ExpandableHash label="Challenge Number" value={miningContract.challengeNumber} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <InfoItem label="Epoch Count">
                <span className="text-lg font-bold text-white">{formatNumber(miningContract.epochCount)}</span>
              </InfoItem>
              <InfoItem label="Mining Difficulty">
                <span className="text-lg font-bold text-white">{formatNumber(miningContract.miningDifficulty)}</span>
              </InfoItem>
            </div>
          </div>
        </section>

        {/* ========== ACCOUNT / FINANCIAL INFO ========== */}
        <section className="mono-section grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Minting Account */}
          <div className="mono-card p-6">
            <SectionHeader title="Minting Account" />
            <div className="space-y-4">
              <InfoItem label="Minting Address" mono>
                {poolData.mintingAddress}
              </InfoItem>
              <InfoItem label="Minting Network">
                {poolData.mintingNetwork}
              </InfoItem>
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Minting Balance EGAZ">
                  <span className="text-[#22c55e] font-semibold">
                    {rawToFormatted(poolStatus.mintingAccountBalances.ETH)} EGAZ
                  </span>
                </InfoItem>
                <InfoItem label="Minting Balance ETI">
                  <span className="text-[#22c55e] font-semibold">
                    {rawToFormatted(poolStatus.mintingAccountBalances.token)} ETI
                  </span>
                </InfoItem>
              </div>
            </div>
          </div>

          {/* Payments Account */}
          <div className="mono-card p-6">
            <SectionHeader title="Payments Account" />
            <div className="space-y-4">
              <InfoItem label="Payments Address" mono>
                {poolData.paymentsAddress}
              </InfoItem>
              <InfoItem label="Payments Network">
                {poolData.paymentsNetwork}
              </InfoItem>
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Payments Balance EGAZ">
                  <span className="text-[#22c55e] font-semibold">
                    {rawToFormatted(poolStatus.paymentsAccountBalances.ETH)} EGAZ
                  </span>
                </InfoItem>
                <InfoItem label="Pool Balance ETI">
                  <span className="text-[#22c55e] font-semibold">
                    {rawToFormatted(poolStatus.paymentsAccountBalances.token)} ETI
                  </span>
                </InfoItem>
              </div>
            </div>
          </div>
        </section>

        {/* ========== CONTRACTS + FEES ========== */}
        <section className="mono-section grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contract Addresses */}
          <div className="mono-card p-6">
            <SectionHeader title="Contracts" />
            <div className="space-y-4">
              <InfoItem label="Smart Contract" mono>
                {poolData.smartContractAddress}
              </InfoItem>
              <InfoItem label="Batched Payments Contract" mono>
                {poolData.batchedPaymentsContractAddress}
              </InfoItem>
              <InfoItem label="Min Balance for Payment">
                <span className="text-[#22c55e] font-semibold">
                  {rawToFormatted(poolData.minBalanceForPayment)} ETI
                </span>
              </InfoItem>
            </div>
          </div>

          {/* Pool Fees / Metrics */}
          <div className="mono-card p-6">
            <SectionHeader title="Pool Fees / Status" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoItem label="Mining Reward">
                <span className="text-lg font-bold text-[#22c55e]">
                  {rawToFormatted(poolStatus.poolFeesMetrics.miningRewardRaw)} ETI
                </span>
              </InfoItem>
              <InfoItem label="ETI/EGAZ Ratio">
                <span className="text-lg font-bold text-white">
                  {poolStatus.poolFeesMetrics.token_Eth_Price_Ratio}
                </span>
              </InfoItem>
              <InfoItem label="Pool Base Fee">
                <span className="text-lg font-bold text-[#f97316]">
                  {poolStatus.poolFeesMetrics.poolBaseFee}
                </span>
              </InfoItem>
              <InfoItem label="Avg Gas Price">
                <span className="text-lg font-bold text-[#f97316]">
                  {poolStatus.poolFeesMetrics.avgGasPriceGWei} <span className="text-sm font-normal text-[#6b7280]">GWei</span>
                </span>
              </InfoItem>
            </div>
          </div>
        </section>

        {/* ========== MINER LEADERBOARD ========== */}
        <section className="mono-section">
          <div className="mono-card p-6 overflow-hidden">
            <SectionHeader title="Top Miners" />
            <div className="overflow-x-auto mono-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#9ca3af] text-xs uppercase tracking-wider border-b border-[#1e1e1e]">
                    <th className="text-left py-3 px-3 font-medium">#</th>
                    <th className="text-left py-3 px-3 font-medium">Eth Address</th>
                    <th className="text-right py-3 px-3 font-medium">Hashrate</th>
                    <th className="text-right py-3 px-3 font-medium">Total ETI Earned</th>
                    <th className="text-right py-3 px-3 font-medium">ETI Received</th>
                    <th className="text-right py-3 px-3 font-medium">Port</th>
                  </tr>
                </thead>
                <tbody>
                  {miners.slice(0, 10).map((miner, idx) => (
                    <tr key={miner.minerEthAddress} className="mono-table-row">
                      <td className="py-3 px-3 text-[#9ca3af] font-medium">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono text-[#a1a1aa] text-xs">
                        {truncateAddress(miner.minerEthAddress, 10)}
                      </td>
                      <td className="py-3 px-3 text-right text-[#22c55e] font-medium">
                        {formatHashrate(miner.avgHashrate)}
                      </td>
                      <td className="py-3 px-3 text-right text-[#e5e7eb]">
                        {rawToFormatted(miner.alltimeTokenBalance)} ETI
                      </td>
                      <td className="py-3 px-3 text-right text-[#e5e7eb]">
                        {rawToFormatted(miner.tokensReceived)} ETI
                      </td>
                      <td className="py-3 px-3 text-right">
                        <PortBadge port={miner.entryport} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ========== RECENT BLOCKS + RECENT PAYOUTS ========== */}
        <section className="mono-section grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Blocks */}
          <div className="mono-card p-6">
            <SectionHeader title="Recent Blocks" />
            <div className="space-y-2 mono-scroll max-h-96 overflow-y-auto pr-1">
              {recentBlocks.map((block) => (
                <div
                  key={block.epoch}
                  className="mono-accent-left rounded-r-lg px-4 py-3 bg-[#0a0a0a]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white">
                        Epoch {formatNumber(block.epoch)}
                      </span>
                      <span className="text-xs text-[#22c55e] font-medium">
                        +{block.reward} ETI
                      </span>
                    </div>
                    <span className="text-xs text-[#9ca3af]">{timeAgo(block.time)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-[#71717a] font-mono truncate max-w-[60%]">
                      {truncateAddress(block.hash, 12)}
                    </p>
                    <p className="text-xs text-[#a1a1aa] font-mono">
                      {block.finder}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payouts */}
          <div className="mono-card p-6">
            <SectionHeader title="Recent Payouts" />
            <div className="space-y-2 mono-scroll max-h-96 overflow-y-auto pr-1">
              {payouts.map((payout, idx) => (
                <div
                  key={idx}
                  className="mono-accent-left rounded-r-lg px-4 py-3 bg-[#0a0a0a]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-[#a1a1aa]">{payout.address}</span>
                      <span className="text-sm font-semibold text-[#22c55e]">
                        {payout.amount} ETI
                      </span>
                    </div>
                    <span className="text-xs text-[#9ca3af]">{timeAgo(payout.time)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-[#71717a] font-mono truncate max-w-[70%]">
                      TX: {truncateAddress(payout.txHash, 10)}
                    </p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      payout.status === 'confirmed'
                        ? 'bg-[#1a1a1a] text-[#22c55e]'
                        : 'bg-yellow-900/30 text-yellow-400'
                    }`}>
                      {payout.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== FOOTER ========== */}
        <footer className="mono-section pt-2">
          <div className="mono-footer-border mb-6" />
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-[#9ca3af]">
            <span>
              Pool Fee: <span className="text-[#f97316] font-medium">{pool.poolFee}%</span>
            </span>
            <span>
              Min Payout: <span className="text-[#e5e7eb] font-medium">{pool.minimumPayout} ETI</span>
            </span>
            <span>
              ETI Price: <span className="text-[#22c55e] font-medium">${network.etiPriceUsd}</span>
            </span>
            <span>
              Block Height: <span className="text-[#e5e7eb] font-medium">{formatNumber(network.blockHeight)}</span>
            </span>
            <span>
              Gas Price: <span className="text-[#e5e7eb] font-medium">{network.gasPrice} GWei</span>
            </span>
          </div>
          <p className="text-center text-xs text-[#4b5563] mt-4 pb-8">
            Etica Mining Pool &mdash; Decentralized Protocol Research
          </p>
        </footer>
      </main>
    </div>
  );
}
