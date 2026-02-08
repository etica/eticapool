import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { poolData, poolNameAndUrl, formatHashrate, timeAgo, formatNumber, truncateAddress, rawToFormatted } from '../../mock-data';
import './styles.css';

/* ---------- Sparkline (CSS flex bars) ---------- */

function Sparkline({ color = '#2563eb' }) {
  const heights = [35, 52, 44, 68, 58, 72, 60, 78, 65, 82, 70, 88, 74, 80, 68, 85, 76, 90, 72, 84];
  return (
    <div className="flex items-end gap-px h-6 mt-2">
      {heights.map((h, i) => (
        <div
          key={i}
          className="slate-spark-bar flex-1 rounded-sm"
          style={{ height: `${h}%`, backgroundColor: color, opacity: 0.35 + (i / heights.length) * 0.65 }}
        />
      ))}
    </div>
  );
}

/* ---------- Sidebar ---------- */

function Sidebar({ network }) {
  const navItems = [
    { label: 'Dashboard', active: true },
    { label: 'Miners', active: false },
    { label: 'Blocks', active: false },
    { label: 'Payouts', active: false },
    { label: 'Network', active: false },
  ];

  return (
    <aside className="slate-sidebar slate-scroll font-['Inter',sans-serif]">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <img src="/images/eti-logo.png" alt="ETI" className="w-8 h-8" />
          <span className="text-sm font-bold text-white tracking-wide uppercase">{poolNameAndUrl.poolName}</span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
          <span className="text-xs font-medium text-[#22c55e]">Active</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 mt-2">
        {navItems.map((item) => (
          <div
            key={item.label}
            className={`slate-nav-item px-5 py-2.5 text-sm font-medium ${
              item.active ? 'slate-nav-active' : 'text-[#a3a3a3]'
            }`}
          >
            {item.label}
          </div>
        ))}
      </nav>

      {/* Back to templates */}
      <div className="px-5 py-3 border-t border-[#1e1e1e]">
        <Link to="/" className="text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors">
          &larr; Back to Templates
        </Link>
      </div>

      {/* Network info at bottom */}
      <div className="px-5 pb-4 space-y-2">
        <div className="border-t border-[#1e1e1e] pt-4" />
        <div>
          <div className="text-[10px] uppercase text-[#525252] font-medium tracking-wider">Block Height</div>
          <div className="text-xs text-[#a3a3a3] font-mono tabular-nums">{formatNumber(network.blockHeight)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-[#525252] font-medium tracking-wider">Difficulty</div>
          <div className="text-xs text-[#a3a3a3] font-mono tabular-nums">{formatNumber(network.difficulty)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-[#525252] font-medium tracking-wider">Gas Price</div>
          <div className="text-xs text-[#a3a3a3] font-mono tabular-nums">{network.gasPrice} GWei</div>
        </div>
        <div className="border-t border-[#1e1e1e] pt-3 mt-3">
          <div className="text-[10px] text-[#525252] font-mono truncate">{poolNameAndUrl.poolUrl}</div>
        </div>
      </div>
    </aside>
  );
}

/* ---------- Stat Card ---------- */

function StatCard({ label, value, sub, color = '#ffffff', sparkColor }) {
  return (
    <div className="rounded-lg bg-[#181818] border border-[#242424] p-5">
      <div className="text-[10px] uppercase text-[#525252] font-medium tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-[#525252] mt-1 tabular-nums">{sub}</div>}
      <Sparkline color={sparkColor || color} />
    </div>
  );
}

/* ---------- Key-Value Row ---------- */

function KV({ label, children, mono }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-[#1a1a1a] last:border-b-0">
      <span className="text-[11px] uppercase text-[#525252] font-medium tracking-wider shrink-0">{label}</span>
      <span className={`text-sm text-right ml-4 ${mono ? 'font-mono text-[#a3a3a3]' : 'text-[#e5e5e5]'}`}>
        {children}
      </span>
    </div>
  );
}

/* ---------- Section Title ---------- */

function SectionTitle({ title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h3 className="text-xs font-semibold text-white uppercase tracking-wider">{title}</h3>
      <div className="flex-1 h-px bg-[#242424]" />
    </div>
  );
}

/* ---------- Status Badge ---------- */

function StatusBadge({ status }) {
  const colors = {
    confirmed: { bg: 'rgba(13, 148, 136, 0.12)', text: '#0d9488' },
    pending: { bg: 'rgba(234, 179, 8, 0.12)', text: '#eab308' },
    failed: { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444' },
  };
  const c = colors[status] || colors.pending;
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {status}
    </span>
  );
}

/* ---------- Port Badge ---------- */

function PortBadge({ port }) {
  return (
    <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[#525252]">
      {port}
    </span>
  );
}

/* ---------- Main Dashboard ---------- */

export default function Dashboard() {
  const {
    pool,
    miners,
    recentBlocks,
    network,
    payouts,
    miningContract,
    poolStatus,
    stratumPorts,
    mintingAddress,
    paymentsAddress,
    mintingNetwork,
    paymentsNetwork,
    smartContractAddress,
    batchedPaymentsContractAddress,
    minBalanceForPayment,
  } = poolData;

  const [expandedChallenge, setExpandedChallenge] = useState(false);

  return (
    <div className="bg-[#111111] min-h-screen font-['Inter',sans-serif]">
      <Sidebar network={network} />

      <div className="slate-main">
        {/* ===== TOP BAR ===== */}
        <div className="border-b border-[#1e1e1e] px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors">
              &larr; Templates
            </Link>
            <div className="w-px h-4 bg-[#242424]" />
            <span className="text-xs text-[#a3a3a3]">
              Pool Share: <span className="text-[#2563eb] font-semibold tabular-nums">{pool.poolSharePercent}%</span>
            </span>
            <div className="w-px h-4 bg-[#242424]" />
            <span className="text-xs text-[#a3a3a3]">
              Fee: <span className="text-white font-semibold">{pool.poolFee}%</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search miner address..."
              className="slate-search rounded-lg px-4 py-2 text-sm w-64"
              readOnly
            />
          </div>
        </div>

        {/* ===== CONTENT ===== */}
        <div className="p-6 space-y-6 slate-scroll overflow-y-auto">

          {/* Status bar */}
          <div className="flex items-center gap-6 text-xs text-[#a3a3a3]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              <span className="text-[#e5e5e5] font-medium">
                {poolStatus.poolStatus.charAt(0).toUpperCase() + poolStatus.poolStatus.slice(1)}
              </span>
            </span>
            <span>Epoch: <span className="text-[#2563eb] font-mono tabular-nums">{formatNumber(network.epoch)}</span></span>
            <span>ETI: <span className="text-[#0d9488] font-semibold">${network.etiPriceUsd}</span> / <span className="tabular-nums">{network.etiPrice} ETH</span></span>
            <span>Last Block: <span className="text-[#e5e5e5]">{timeAgo(pool.lastBlockTime)}</span></span>
            <span>Gas: <span className="font-mono tabular-nums">{network.gasPrice} GWei</span></span>
          </div>

          {/* ===== POOL STATS CARDS ===== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Pool Hashrate" value={formatHashrate(pool.hashrate)} sub={`24h: ${formatHashrate(pool.hashrate24h)}`} color="#2563eb" />
            <StatCard label="Active Miners" value={pool.miners} sub={`${pool.workers} workers`} color="#ffffff" sparkColor="#525252" />
            <StatCard label="Blocks Found" value={formatNumber(pool.blocksFound)} sub={`Last: ${timeAgo(pool.lastBlockTime)}`} color="#2563eb" />
            <StatCard label="Pool Share" value={`${pool.poolSharePercent}%`} sub={`Fee: ${pool.poolFee}%`} color="#ffffff" sparkColor="#525252" />
            <StatCard label="Mining Reward" value={`${rawToFormatted(poolStatus.poolFeesMetrics.miningRewardRaw)} ETI`} color="#0d9488" />
            <StatCard label="ETI Price" value={`$${network.etiPriceUsd}`} sub={`${network.etiPrice} ETH`} color="#0d9488" />
          </div>

          {/* ===== NETWORK INFO ===== */}
          <div className="rounded-lg bg-[#181818] border border-[#242424] px-5 py-3">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-xs">
              <div>
                <span className="text-[#525252] uppercase tracking-wider font-medium">Block Height </span>
                <span className="font-mono text-[#2563eb] tabular-nums font-semibold">{formatNumber(network.blockHeight)}</span>
              </div>
              <div>
                <span className="text-[#525252] uppercase tracking-wider font-medium">Network Diff </span>
                <span className="font-mono text-[#a3a3a3] tabular-nums">{formatNumber(network.difficulty)}</span>
              </div>
              <div>
                <span className="text-[#525252] uppercase tracking-wider font-medium">ETI/USD </span>
                <span className="text-[#0d9488] font-semibold tabular-nums">${network.etiPriceUsd}</span>
              </div>
              <div>
                <span className="text-[#525252] uppercase tracking-wider font-medium">ETI/ETH </span>
                <span className="text-[#a3a3a3] font-mono tabular-nums">{network.etiPrice}</span>
              </div>
              <div>
                <span className="text-[#525252] uppercase tracking-wider font-medium">Gas </span>
                <span className="font-mono text-[#a3a3a3] tabular-nums">{network.gasPrice} GWei</span>
              </div>
              <div>
                <span className="text-[#525252] uppercase tracking-wider font-medium">Epoch </span>
                <span className="text-[#2563eb] font-mono tabular-nums">{formatNumber(network.epoch)}</span>
              </div>
            </div>
          </div>

          {/* ===== TWO-COLUMN CONTENT ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* LEFT COLUMN (60%) */}
            <div className="lg:col-span-3 space-y-6">

              {/* Miner Leaderboard Table */}
              <div className="rounded-lg bg-[#181818] border border-[#242424] p-5 overflow-hidden">
                <SectionTitle title="Miner Leaderboard" />
                <div className="overflow-x-auto slate-scroll">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#242424]">
                        <th className="text-left py-2.5 px-3 text-[10px] uppercase text-[#525252] font-medium tracking-wider">#</th>
                        <th className="text-left py-2.5 px-3 text-[10px] uppercase text-[#525252] font-medium tracking-wider">Address</th>
                        <th className="text-right py-2.5 px-3 text-[10px] uppercase text-[#525252] font-medium tracking-wider">Hashrate</th>
                        <th className="text-right py-2.5 px-3 text-[10px] uppercase text-[#525252] font-medium tracking-wider">Earned</th>
                        <th className="text-right py-2.5 px-3 text-[10px] uppercase text-[#525252] font-medium tracking-wider">Received</th>
                        <th className="text-center py-2.5 px-3 text-[10px] uppercase text-[#525252] font-medium tracking-wider">Port</th>
                        <th className="text-right py-2.5 px-3 text-[10px] uppercase text-[#525252] font-medium tracking-wider">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {miners.slice(0, 10).map((miner, idx) => (
                        <tr
                          key={miner.minerEthAddress}
                          className={`slate-row ${idx % 2 === 1 ? 'bg-[#151515]' : ''} ${idx < 3 ? 'slate-top-rank' : ''}`}
                        >
                          <td className="py-2.5 px-3 text-sm text-[#525252] tabular-nums">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-sm font-['JetBrains_Mono',monospace] text-[#a3a3a3]">
                            {truncateAddress(miner.minerEthAddress, 8)}
                          </td>
                          <td className="py-2.5 px-3 text-sm text-right text-[#2563eb] font-medium tabular-nums">
                            {formatHashrate(miner.avgHashrate)}
                          </td>
                          <td className="py-2.5 px-3 text-sm text-right text-[#0d9488] tabular-nums">
                            {rawToFormatted(miner.alltimeTokenBalance)} ETI
                          </td>
                          <td className="py-2.5 px-3 text-sm text-right text-[#0d9488] tabular-nums">
                            {rawToFormatted(miner.tokensReceived)} ETI
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <PortBadge port={miner.entryport} />
                          </td>
                          <td className="py-2.5 px-3 text-xs text-right text-[#525252] tabular-nums">
                            {timeAgo(miner.lastSeen)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Blocks */}
              <div className="rounded-lg bg-[#181818] border border-[#242424] p-5">
                <SectionTitle title="Recent Blocks" />
                <div className="space-y-0">
                  {recentBlocks.map((block) => (
                    <div key={block.epoch} className="flex items-center justify-between py-2.5 border-b border-[#1a1a1a] last:border-b-0">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-[#2563eb] tabular-nums w-16">#{formatNumber(block.epoch)}</span>
                        <span className="text-xs font-['JetBrains_Mono',monospace] text-[#525252] slate-hash max-w-[160px]">
                          {truncateAddress(block.hash, 10)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-['JetBrains_Mono',monospace] text-[#a3a3a3]">{block.finder}</span>
                        <span className="text-sm font-medium text-[#0d9488] tabular-nums">+{block.reward} ETI</span>
                        <span className="text-xs text-[#525252] tabular-nums w-16 text-right">{timeAgo(block.time)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Payouts */}
              <div className="rounded-lg bg-[#181818] border border-[#242424] p-5">
                <SectionTitle title="Recent Payouts" />
                <div className="space-y-0">
                  {payouts.map((payout, idx) => (
                    <div key={idx} className="py-2.5 border-b border-[#1a1a1a] last:border-b-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-['JetBrains_Mono',monospace] text-[#a3a3a3]">{payout.address}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-[#0d9488] tabular-nums">{payout.amount} ETI</span>
                          <StatusBadge status={payout.status} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-['JetBrains_Mono',monospace] text-[#525252] slate-hash max-w-[200px]">
                          {truncateAddress(payout.txHash, 10)}
                        </span>
                        <span className="text-[10px] text-[#525252] tabular-nums">{timeAgo(payout.time)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (40%) */}
            <div className="lg:col-span-2 space-y-6">

              {/* Mining Contract Data */}
              <div className="rounded-lg bg-[#181818] border border-[#242424] p-5">
                <SectionTitle title="Mining Contract Data" />
                <div className="space-y-0">
                  <KV label="Epoch Count" mono={false}>
                    <span className="text-[#2563eb] font-semibold tabular-nums">{formatNumber(miningContract.epochCount)}</span>
                  </KV>
                  <KV label="Mining Diff" mono={false}>
                    <span className="text-[#2563eb] tabular-nums">{formatNumber(miningContract.miningDifficulty)}</span>
                  </KV>
                  <div
                    className="flex items-start justify-between py-2 border-b border-[#1a1a1a] cursor-pointer"
                    onClick={() => setExpandedChallenge(!expandedChallenge)}
                    title="Click to expand/collapse"
                  >
                    <span className="text-[11px] uppercase text-[#525252] font-medium tracking-wider shrink-0">Challenge</span>
                    <span className="text-sm text-right ml-4 font-['JetBrains_Mono',monospace] text-[#a3a3a3]">
                      {expandedChallenge ? (
                        <span className="text-xs break-all">{miningContract.challengeNumber}</span>
                      ) : (
                        <span className="text-xs">{truncateAddress(miningContract.challengeNumber, 12)}</span>
                      )}
                    </span>
                  </div>
                  <KV label="RX Blob" mono>
                    <span className="slate-hash block max-w-[200px] text-xs">{truncateAddress(miningContract.randomxBlob, 12)}</span>
                  </KV>
                  <KV label="RX Seedhash" mono>
                    <span className="slate-hash block max-w-[200px] text-xs">{truncateAddress(miningContract.randomxSeedhash, 12)}</span>
                  </KV>
                  <KV label="Mining Target" mono>
                    <span className="slate-hash block max-w-[200px] text-xs">{truncateAddress(miningContract.miningTarget, 12)}</span>
                  </KV>
                </div>
              </div>

              {/* Pool Fees & Metrics */}
              <div className="rounded-lg bg-[#181818] border border-[#242424] p-5">
                <SectionTitle title="Pool Fees & Metrics" />
                <div className="space-y-0">
                  <KV label="Mining Reward">
                    <span className="text-[#0d9488] font-semibold">{rawToFormatted(poolStatus.poolFeesMetrics.miningRewardRaw)} ETI</span>
                  </KV>
                  <KV label="Pool Fee">
                    <span className="text-[#e5e5e5]">{pool.poolFee}%</span>
                  </KV>
                  <KV label="Pool Base Fee">
                    <span className="text-[#e5e5e5] tabular-nums">{poolStatus.poolFeesMetrics.poolBaseFee}</span>
                  </KV>
                  <KV label="ETI/EGAZ Ratio">
                    <span className="text-[#e5e5e5] tabular-nums">{poolStatus.poolFeesMetrics.token_Eth_Price_Ratio}</span>
                  </KV>
                  <KV label="Avg Gas Price">
                    <span className="text-[#e5e5e5] tabular-nums">{poolStatus.poolFeesMetrics.avgGasPriceGWei} GWei</span>
                  </KV>
                  <KV label="Rewards Bonus">
                    <span className="text-[#e5e5e5] tabular-nums">{poolStatus.poolFeesMetrics.poolRewardsBonus}</span>
                  </KV>
                </div>
              </div>

              {/* Minting Account */}
              <div className="rounded-lg bg-[#181818] border border-[#242424] p-5">
                <SectionTitle title="Minting Account" />
                <div className="text-xs font-['JetBrains_Mono',monospace] text-[#a3a3a3] slate-hash mb-2">{truncateAddress(mintingAddress, 10)}</div>
                <div className="text-[11px] text-[#525252] mb-3">
                  Network: <span className="text-[#a3a3a3]">{mintingNetwork}</span>
                </div>
                <div className="flex gap-6">
                  <div>
                    <div className="text-[10px] uppercase text-[#525252] font-medium tracking-wider">EGAZ Balance</div>
                    <div className="text-sm text-[#0d9488] font-semibold tabular-nums mt-0.5">{rawToFormatted(poolStatus.mintingAccountBalances.ETH)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#525252] font-medium tracking-wider">ETI Balance</div>
                    <div className="text-sm text-[#0d9488] font-semibold tabular-nums mt-0.5">{rawToFormatted(poolStatus.mintingAccountBalances.token)}</div>
                  </div>
                </div>
              </div>

              {/* Payments Account */}
              <div className="rounded-lg bg-[#181818] border border-[#242424] p-5">
                <SectionTitle title="Payments Account" />
                <div className="text-xs font-['JetBrains_Mono',monospace] text-[#a3a3a3] slate-hash mb-2">{truncateAddress(paymentsAddress, 10)}</div>
                <div className="text-[11px] text-[#525252] mb-3">
                  Network: <span className="text-[#a3a3a3]">{paymentsNetwork}</span>
                </div>
                <div className="flex gap-6">
                  <div>
                    <div className="text-[10px] uppercase text-[#525252] font-medium tracking-wider">EGAZ Balance</div>
                    <div className="text-sm text-[#0d9488] font-semibold tabular-nums mt-0.5">{rawToFormatted(poolStatus.paymentsAccountBalances.ETH)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#525252] font-medium tracking-wider">ETI Balance</div>
                    <div className="text-sm text-[#0d9488] font-semibold tabular-nums mt-0.5">{rawToFormatted(poolStatus.paymentsAccountBalances.token)}</div>
                  </div>
                </div>
              </div>

              {/* Contracts */}
              <div className="rounded-lg bg-[#181818] border border-[#242424] p-5">
                <SectionTitle title="Contracts" />
                <div className="space-y-0">
                  <KV label="Smart Contract" mono>
                    <span className="slate-hash block max-w-[200px] text-xs">{truncateAddress(smartContractAddress, 10)}</span>
                  </KV>
                  <KV label="Batched Payments" mono>
                    <span className="slate-hash block max-w-[200px] text-xs">{truncateAddress(batchedPaymentsContractAddress, 10)}</span>
                  </KV>
                  <KV label="Min Balance for Payment">
                    <span className="text-[#0d9488] font-semibold tabular-nums">{rawToFormatted(minBalanceForPayment)} ETI</span>
                  </KV>
                </div>
              </div>

              {/* Stratum Ports */}
              <div className="rounded-lg bg-[#181818] border border-[#242424] p-5">
                <SectionTitle title="Stratum Ports" />
                <div className="space-y-0">
                  {stratumPorts.map((sp) => (
                    <div key={sp.port} className="flex items-center justify-between py-2.5 border-b border-[#1a1a1a] last:border-b-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-['JetBrains_Mono',monospace] text-[#2563eb] font-semibold tabular-nums">:{sp.port}</span>
                        <span className="text-sm text-[#a3a3a3]">{sp.label}</span>
                      </div>
                      <span className="text-xs font-['JetBrains_Mono',monospace] text-[#525252] tabular-nums">
                        diff: {formatNumber(sp.difficulty)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ===== FOOTER ===== */}
          <div className="rounded-lg bg-[#181818] border border-[#242424] px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#525252] uppercase tracking-wider font-medium">Pool Fee:</span>
                <span className="text-[#e5e5e5] font-semibold">{pool.poolFee}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#525252] uppercase tracking-wider font-medium">Min Payout:</span>
                <span className="text-[#0d9488] font-semibold">{pool.minimumPayout} ETI</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#525252] uppercase tracking-wider font-medium">ETI Price:</span>
                <span className="text-[#0d9488] font-semibold">${network.etiPriceUsd}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#525252] uppercase tracking-wider font-medium">Block Height:</span>
                <span className="font-mono text-[#a3a3a3] tabular-nums">{formatNumber(network.blockHeight)}</span>
              </div>
            </div>
          </div>

          {/* Bottom attribution */}
          <div className="flex items-center justify-center pb-6">
            <span className="text-[10px] text-[#525252] font-mono">{poolNameAndUrl.poolUrl}</span>
          </div>

        </div>
      </div>
    </div>
  );
}
