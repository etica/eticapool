import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { poolData, poolNameAndUrl, formatHashrate, timeAgo, formatNumber, truncateAddress, rawToFormatted } from '../../mock-data';
import './styles.css';

/* ---------- Subcomponents ---------- */

function PortBadge({ port }) {
  return (
    <span className={`tw-port-${port} text-xs font-semibold px-2 py-0.5 rounded`}>
      {port}
    </span>
  );
}

function SectionTitle({ children }) {
  return <h2 className="tw-section-title">{children}</h2>;
}

function ExpandableHash({ label, value }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mb-3">
      <div className="tw-label mb-1.5">{label}</div>
      <div
        className={`tw-mono-field ${expanded ? 'tw-expanded' : ''}`}
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

  return (
    <div className="tw-root font-mono">
      {/* ========== HEADER ========== */}
      <header className="tw-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Logo + Title + Status */}
            <div className="flex items-center gap-4">
              <img src="/images/eti-logo.png" alt="ETI" className="w-9 h-9" />
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-white tracking-tight">
                    ETICA MINING POOL
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[#4ade80] uppercase tracking-wider">
                    <span className="tw-status-dot" />
                    Active
                  </span>
                </div>
                <div className="text-[11px] text-[#525252] mt-0.5">
                  {poolNameAndUrl.poolUrl}
                </div>
              </div>
            </div>

            {/* Search + Back */}
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="0x... search miner"
                className="tw-search-input px-3 py-2 w-56 hidden sm:block"
                readOnly
              />
              <Link to="/" className="tw-back-link">
                &larr; back
              </Link>
            </div>
          </div>

          {/* Ports */}
          <div className="flex items-center gap-2 mt-4 text-xs text-[#525252]">
            <span className="text-[#737373] mr-1">Ports:</span>
            {stratumPorts.map((sp, i) => (
              <span key={sp.port} className="flex items-center gap-1">
                <span className="text-[#a3a3a3] font-semibold">{sp.port}</span>
                <span className="text-[#404040]">{sp.label}</span>
                {i < stratumPorts.length - 1 && <span className="text-[#2a2a2a] mx-1">&middot;</span>}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ========== POOL STATS — 3x2 GRID ========== */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Hashrate — orange value */}
          <div className="tw-card p-5">
            <p className="tw-label mb-2">Pool Hashrate</p>
            <p className="text-2xl font-bold text-[#f97316]">{formatHashrate(pool.hashrate)}</p>
          </div>
          <div className="tw-card p-5">
            <p className="tw-label mb-2">Active Miners</p>
            <p className="text-2xl font-bold text-white">{pool.miners}</p>
          </div>
          <div className="tw-card p-5">
            <p className="tw-label mb-2">Workers</p>
            <p className="text-2xl font-bold text-white">{pool.workers}</p>
          </div>
          <div className="tw-card p-5">
            <p className="tw-label mb-2">Blocks Found</p>
            <p className="text-2xl font-bold text-white">{formatNumber(pool.blocksFound)}</p>
          </div>
          <div className="tw-card p-5">
            <p className="tw-label mb-2">Pool Share</p>
            <p className="text-2xl font-bold text-white">{pool.poolSharePercent.toFixed(2)}%</p>
          </div>
          <div className="tw-card p-5">
            <p className="tw-label mb-2">Pool Fee</p>
            <p className="text-2xl font-bold text-white">{pool.poolFee}%</p>
          </div>
        </section>

        {/* ========== MINING CONTRACT ========== */}
        <section>
          <div className="tw-card p-6">
            <SectionTitle>Mining Contract</SectionTitle>
            <ExpandableHash label="RandomX Blob" value={miningContract.randomxBlob} />
            <ExpandableHash label="RandomX Seedhash" value={miningContract.randomxSeedhash} />
            <ExpandableHash label="Challenge Number" value={miningContract.challengeNumber} />
            <div className="grid grid-cols-2 gap-6 mt-5">
              <div>
                <p className="tw-label mb-1">Epoch Count</p>
                <p className="text-xl font-bold text-white">{formatNumber(miningContract.epochCount)}</p>
              </div>
              <div>
                <p className="tw-label mb-1">Mining Difficulty</p>
                <p className="text-xl font-bold text-white">{formatNumber(miningContract.miningDifficulty)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== ACCOUNTS — 2 COLUMNS ========== */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Minting */}
          <div className="tw-card p-6">
            <SectionTitle>Minting</SectionTitle>
            <div className="space-y-3">
              <div>
                <p className="tw-label mb-1">Address</p>
                <p className="text-xs font-mono text-[#a3a3a3] break-all">{poolData.mintingAddress}</p>
              </div>
              <div>
                <p className="tw-label mb-1">Network</p>
                <p className="text-sm text-white">{poolData.mintingNetwork}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <p className="tw-label mb-1">EGAZ Balance</p>
                  <p className="text-sm font-bold text-white">
                    {rawToFormatted(poolStatus.mintingAccountBalances.ETH)} EGAZ
                  </p>
                </div>
                <div>
                  <p className="tw-label mb-1">ETI Balance</p>
                  <p className="text-sm font-bold text-[#f97316]">
                    {rawToFormatted(poolStatus.mintingAccountBalances.token)} ETI
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payments */}
          <div className="tw-card p-6">
            <SectionTitle>Payments</SectionTitle>
            <div className="space-y-3">
              <div>
                <p className="tw-label mb-1">Address</p>
                <p className="text-xs font-mono text-[#a3a3a3] break-all">{poolData.paymentsAddress}</p>
              </div>
              <div>
                <p className="tw-label mb-1">Network</p>
                <p className="text-sm text-white">{poolData.paymentsNetwork}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <p className="tw-label mb-1">EGAZ Balance</p>
                  <p className="text-sm font-bold text-white">
                    {rawToFormatted(poolStatus.paymentsAccountBalances.ETH)} EGAZ
                  </p>
                </div>
                <div>
                  <p className="tw-label mb-1">ETI Balance</p>
                  <p className="text-sm font-bold text-[#f97316]">
                    {rawToFormatted(poolStatus.paymentsAccountBalances.token)} ETI
                  </p>
                </div>
              </div>
              <div className="pt-1">
                <p className="tw-label mb-1">Min Payment</p>
                <p className="text-sm font-bold text-[#f97316]">
                  {rawToFormatted(poolData.minBalanceForPayment)} ETI
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== CONTRACTS ========== */}
        <section>
          <div className="tw-card p-6">
            <SectionTitle>Contracts</SectionTitle>
            <div className="space-y-3">
              <div>
                <p className="tw-label mb-1">Smart Contract</p>
                <p className="text-xs font-mono text-[#a3a3a3] break-all">{poolData.smartContractAddress}</p>
              </div>
              <div>
                <p className="tw-label mb-1">Batched Payments Contract</p>
                <p className="text-xs font-mono text-[#a3a3a3] break-all">{poolData.batchedPaymentsContractAddress}</p>
              </div>
              <div>
                <p className="tw-label mb-1">Min Balance for Payment</p>
                <p className="text-sm font-bold text-[#f97316]">
                  {rawToFormatted(poolData.minBalanceForPayment)} ETI
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== FEES — HORIZONTAL STRIP ========== */}
        <section>
          <div className="tw-card p-6">
            <SectionTitle>Fees</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="tw-label mb-1">Reward</p>
                <p className="text-lg font-bold text-[#f97316]">
                  {rawToFormatted(poolStatus.poolFeesMetrics.miningRewardRaw)} ETI
                </p>
              </div>
              <div>
                <p className="tw-label mb-1">Ratio</p>
                <p className="text-lg font-bold text-white">
                  {poolStatus.poolFeesMetrics.token_Eth_Price_Ratio}
                </p>
              </div>
              <div>
                <p className="tw-label mb-1">Base Fee</p>
                <p className="text-lg font-bold text-white">
                  {poolStatus.poolFeesMetrics.poolBaseFee}
                </p>
              </div>
              <div>
                <p className="tw-label mb-1">Gas</p>
                <p className="text-lg font-bold text-white">
                  {poolStatus.poolFeesMetrics.avgGasPriceGWei} <span className="text-sm font-normal text-[#525252]">GWei</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== NETWORK — HORIZONTAL STRIP ========== */}
        <section>
          <div className="tw-card p-6">
            <SectionTitle>Network</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="tw-label mb-1">Block Height</p>
                <p className="text-lg font-bold text-white">{formatNumber(network.blockHeight)}</p>
              </div>
              <div>
                <p className="tw-label mb-1">Difficulty</p>
                <p className="text-lg font-bold text-white">{formatNumber(network.difficulty)}</p>
              </div>
              <div>
                <p className="tw-label mb-1">ETI Price</p>
                <p className="text-lg font-bold text-[#f97316]">${network.etiPriceUsd}</p>
              </div>
              <div>
                <p className="tw-label mb-1">Gas Price</p>
                <p className="text-lg font-bold text-white">
                  {network.gasPrice} <span className="text-sm font-normal text-[#525252]">GWei</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== MINER TABLE ========== */}
        <section>
          <div className="tw-card p-6 overflow-hidden">
            <SectionTitle>Top Miners</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-3 tw-label font-medium">#</th>
                    <th className="text-left py-3 px-3 tw-label font-medium">Address</th>
                    <th className="text-right py-3 px-3 tw-label font-medium">Hashrate</th>
                    <th className="text-right py-3 px-3 tw-label font-medium">ETI Earned</th>
                    <th className="text-right py-3 px-3 tw-label font-medium">ETI Received</th>
                    <th className="text-right py-3 px-3 tw-label font-medium">Port</th>
                  </tr>
                </thead>
                <tbody>
                  {miners.slice(0, 10).map((miner, idx) => (
                    <tr key={miner.minerEthAddress} className="tw-table-row">
                      <td className="py-3 px-3 text-[#525252] font-medium">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono text-xs text-[#a3a3a3]">
                        {truncateAddress(miner.minerEthAddress, 10)}
                      </td>
                      <td className="py-3 px-3 text-right text-[#f97316] font-semibold">
                        {formatHashrate(miner.avgHashrate)}
                      </td>
                      <td className="py-3 px-3 text-right text-white">
                        {rawToFormatted(miner.alltimeTokenBalance)} ETI
                      </td>
                      <td className="py-3 px-3 text-right text-white">
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
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Blocks */}
          <div className="tw-card p-6">
            <SectionTitle>Recent Blocks</SectionTitle>
            <div className="max-h-96 overflow-y-auto">
              {recentBlocks.map((block) => (
                <div key={block.epoch} className="tw-list-row px-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-semibold">Epoch {formatNumber(block.epoch)}</span>
                      <span className="text-[#f97316] font-semibold">{block.reward} ETI</span>
                    </div>
                    <span className="text-xs text-[#525252]">{timeAgo(block.time)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono text-[#404040] truncate max-w-[55%]">
                      {truncateAddress(block.hash, 10)}
                    </span>
                    <span className="text-xs font-mono text-[#737373]">{block.finder}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payouts */}
          <div className="tw-card p-6">
            <SectionTitle>Recent Payouts</SectionTitle>
            <div className="max-h-96 overflow-y-auto">
              {payouts.map((payout, idx) => (
                <div key={idx} className="tw-list-row px-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-[#a3a3a3]">{payout.address}</span>
                      <span className="text-[#f97316] font-semibold">{payout.amount} ETI</span>
                    </div>
                    <span className="text-xs text-[#525252]">{timeAgo(payout.time)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono text-[#404040] truncate max-w-[65%]">
                      TX: {truncateAddress(payout.txHash, 10)}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      payout.status === 'confirmed'
                        ? 'text-[#4ade80] bg-[#4ade80]/5'
                        : 'text-[#fbbf24] bg-[#fbbf24]/5'
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
        <footer className="pt-4 pb-8">
          <div className="tw-footer-line mb-6" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#525252]">
            <span className="font-mono text-[#404040] break-all">{poolData.smartContractAddress}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#525252] mt-3">
            <span>Ports: <span className="text-[#737373]">3333 / 5555 / 7777 / 9999</span></span>
            <span>Fee: <span className="text-[#737373]">{pool.poolFee}%</span></span>
            <span>Min Payout: <span className="text-[#f97316]">{pool.minimumPayout} ETI</span></span>
          </div>
          <p className="text-center text-xs text-[#2a2a2a] mt-4">
            Etica Mining Pool &mdash; Decentralized Protocol Research
          </p>
        </footer>
      </main>
    </div>
  );
}
