import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  poolData,
  poolNameAndUrl,
  formatNumber,
  truncateAddress,
  rawToFormatted,
  recentPaymentsBatched,
} from '../../mock-data';
import './styles.css';

/* ---------- Subcomponents ---------- */

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

function DataRow({ label, children, className = '' }) {
  return (
    <div className="tw-data-row">
      <span className="tw-data-key">{label}</span>
      <span className={`tw-data-val ${className}`}>{children}</span>
    </div>
  );
}

/* ---------- Tab: Mining Data ---------- */

function MiningDataTab() {
  const { miningContract, poolStatus } = poolData;

  return (
    <div className="space-y-6">
      {/* Pool Status */}
      <div className="flex items-center gap-2 mb-2">
        <span className="tw-status-dot" />
        <span className="text-sm font-semibold text-[#4ade80]">
          {poolNameAndUrl.poolName} is Active
        </span>
        {poolStatus.poolFeesMetrics.poolRewardsBonus > 0 && (
          <span className="text-xs text-[#f97316]">
            (Bonus Activated: +{poolStatus.poolFeesMetrics.poolRewardsBonus * 100}% on all mining rewards)
          </span>
        )}
      </div>

      {/* Minting + Payments side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Minting Account */}
        <div className="tw-card p-5">
          <SectionTitle>Minting Account</SectionTitle>
          <DataRow label="Address">
            <a
              href={`https://eticascan.org/address/${poolData.mintingAddress}`}
              target="_blank"
              rel="noreferrer"
              className="tw-link-cyan"
            >
              {poolData.mintingAddress}
            </a>
          </DataRow>
          <DataRow label="Network">{poolData.mintingNetwork}</DataRow>
          <DataRow label="EGAZ Balance">
            {rawToFormatted(poolStatus.mintingAccountBalances.ETH)} EGAZ
          </DataRow>
          <DataRow label="ETI Balance" className="orange">
            {rawToFormatted(poolStatus.mintingAccountBalances.token)} ETI
          </DataRow>
          <p className="tw-note mt-3">(ETI mined are immediately sent to reward process)</p>
        </div>

        {/* Payments Account */}
        <div className="tw-card p-5">
          <SectionTitle>Payments Account</SectionTitle>
          <DataRow label="Address">
            <a
              href={`https://eticascan.org/address/${poolData.paymentsAddress}`}
              target="_blank"
              rel="noreferrer"
              className="tw-link-cyan"
            >
              {poolData.paymentsAddress}
            </a>
          </DataRow>
          <DataRow label="Network">{poolData.paymentsNetwork}</DataRow>
          <DataRow label="EGAZ Balance">
            {rawToFormatted(poolStatus.paymentsAccountBalances.ETH)} EGAZ
          </DataRow>
          <DataRow label="Batched Payments">
            <a
              href={`https://eticascan.org/address/${poolData.batchedPaymentsContractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="tw-link-cyan"
            >
              {truncateAddress(poolData.batchedPaymentsContractAddress, 12)}
            </a>
          </DataRow>
          <DataRow label="Pool Balance" className="orange">
            {rawToFormatted(poolStatus.paymentsAccountBalances.token)} ETI
          </DataRow>
        </div>
      </div>

      {/* Block Info */}
      <div className="tw-card p-5">
        <DataRow label="Last Known Block">{formatNumber(poolData.ethBlockNumber)}</DataRow>
        <DataRow label="Min Payment" className="orange">
          {rawToFormatted(poolData.minBalanceForPayment)} ETI
        </DataRow>
        <p className="tw-note mt-3">
          Low Balance Payments: every 24 hours for balances between 0.01 ETI and{' '}
          {rawToFormatted(poolData.minBalanceForPayment)} ETI
        </p>
      </div>

      {/* Mining Contract */}
      <div className="tw-card p-5">
        <SectionTitle>Mining Contract</SectionTitle>
        <ExpandableHash label="RandomX Blob" value={miningContract.randomxBlob} />
        <ExpandableHash label="RandomX Seedhash" value={miningContract.randomxSeedhash} />
        <ExpandableHash label="Challenge Number" value={miningContract.challengeNumber} />
        <div className="grid grid-cols-2 gap-6 mt-4">
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
    </div>
  );
}

/* ---------- Tab: Getting Started ---------- */

function GettingStartedTab() {
  return (
    <div className="space-y-6">
      <div className="tw-card p-5">
        <SectionTitle>Miners</SectionTitle>
        <div className="space-y-2 text-sm">
          <div>
            XMRig:{' '}
            <a href="https://xmrig.com/" target="_blank" rel="noreferrer" className="tw-link">
              https://xmrig.com/
            </a>
          </div>
          <div>
            SRBMiner:{' '}
            <a
              href="https://github.com/doktor83/SRBMiner-Multi/releases"
              target="_blank"
              rel="noreferrer"
              className="tw-link"
            >
              https://github.com/doktor83/SRBMiner-Multi/releases
            </a>
          </div>
        </div>

        <p className="tw-note mt-4">
          Instructions: Use same settings as Monero. Replace address with Etica address.
          Enter pool URL with mining port. Example:{' '}
          {poolNameAndUrl.poolUrl?.replace(/^https?:\/\//, '')}:3333
        </p>
      </div>

      <div className="tw-card p-5">
        <SectionTitle>Connection Details</SectionTitle>
        <DataRow label="Pool URL" className="orange">
          {poolNameAndUrl.poolUrl}
        </DataRow>
      </div>

      <div>
        <SectionTitle>Mining Ports</SectionTitle>
        <div className="tw-ports-grid">
          {poolData.stratumPorts.map((sp) => (
            <div key={sp.port} className="tw-card p-5 text-center">
              <div className="text-2xl font-bold text-white mb-1">
                <span className={`tw-port-${sp.port} text-xs font-semibold px-2 py-0.5 rounded`}>
                  {sp.port}
                </span>
              </div>
              <p className="tw-label mt-3">Starting Difficulty</p>
              <p className="text-sm font-bold text-white mt-1">{formatNumber(sp.difficulty)}</p>
              <p className="text-xs text-[#525252] mt-2">{sp.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Tab: Pool Status ---------- */

function PoolStatusTab() {
  const { poolStatus } = poolData;
  const fees = poolStatus.poolFeesMetrics;

  return (
    <div className="space-y-6">
      <div className="tw-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="tw-status-dot" />
          <span className="text-sm font-semibold text-[#4ade80]">
            Pool Status: {poolNameAndUrl.poolName} is Active
          </span>
        </div>

        <SectionTitle>Stratum Ports</SectionTitle>
        {poolData.stratumPorts.map((sp) => (
          <DataRow key={sp.port} label={`Port ${sp.port}`}>
            Minimum Shares Difficulty: {formatNumber(sp.difficulty)}
          </DataRow>
        ))}
      </div>

      <div className="tw-card p-5">
        <SectionTitle>Fees &amp; Rewards</SectionTitle>
        <DataRow label="Avg Gas Price">{fees.avgGasPriceGWei} GWei</DataRow>
        <DataRow label="Full Mining Reward" className="orange">
          {Number.parseFloat(rawToFormatted(fees.miningRewardRaw))} ETI
        </DataRow>
        <DataRow label="ETI/EGAZ Ratio">{fees.token_Eth_Price_Ratio}</DataRow>
        <DataRow label="Pool Base Fee">{fees.poolBaseFee}</DataRow>
        {fees.poolRewardsBonus > 0 && (
          <DataRow label="Rewards Bonus" className="green">
            +{fees.poolRewardsBonus * 100}%
          </DataRow>
        )}
      </div>
    </div>
  );
}

/* ---------- Tab: Recent Transactions ---------- */

function RecentTransactionsTab() {
  return (
    <div>
      <div className="tw-card p-5 overflow-hidden">
        <SectionTitle>Recent Payments</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-3 px-3 tw-label font-medium">Block</th>
                <th className="text-left py-3 px-3 tw-label font-medium">TxHash</th>
                <th className="text-right py-3 px-3 tw-label font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPaymentsBatched.map((tx, idx) => (
                <tr key={idx} className="tw-table-row">
                  <td className="py-3 px-3 text-white font-medium">{tx.block}</td>
                  <td className="py-3 px-3">
                    <a
                      href={`https://eticascan.org/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="tw-link-cyan font-mono text-xs"
                    >
                      {truncateAddress(tx.txHash, 12)}
                    </a>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        tx.status === 'confirmed'
                          ? 'text-[#4ade80] bg-[#4ade80]/5'
                          : 'text-[#fbbf24] bg-[#fbbf24]/5'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Overview ---------- */

const TABS = ['Mining Data', 'Getting Started', 'Pool Status', 'Recent Transactions'];

export default function Overview() {
  const [activeTab, setActiveTab] = useState('Mining Data');
  const { stratumPorts } = poolData;

  return (
    <div className="tw-root font-mono">
      {/* ========== HEADER ========== */}
      <header className="tw-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
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

            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="0x... search miner"
                className="tw-search-input px-3 py-2 w-56 hidden sm:block"
                readOnly
              />
              <Link to="/templates" className="tw-back-link">
                &larr; templates
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 text-xs text-[#525252]">
            <span className="text-[#737373] mr-1">Ports:</span>
            {stratumPorts.map((sp, i) => (
              <span key={sp.port} className="flex items-center gap-1">
                <span className="text-[#a3a3a3] font-semibold">{sp.port}</span>
                <span className="text-[#404040]">{sp.label}</span>
                {i < stratumPorts.length - 1 && (
                  <span className="text-[#2a2a2a] mx-1">&middot;</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Title */}
        <h1 className="text-3xl font-bold text-white tracking-tight mb-6">
          Pool Overview
        </h1>

        {/* Tab Navigation */}
        <div className="tw-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`tw-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'Mining Data' && <MiningDataTab />}
        {activeTab === 'Getting Started' && <GettingStartedTab />}
        {activeTab === 'Pool Status' && <PoolStatusTab />}
        {activeTab === 'Recent Transactions' && <RecentTransactionsTab />}

        {/* Footer */}
        <footer className="pt-8 pb-8">
          <div className="tw-footer-line mb-6" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#525252]">
            <span className="font-mono text-[#404040] break-all">
              {poolData.smartContractAddress}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#525252] mt-3">
            <span>
              Ports: <span className="text-[#737373]">3333 / 5555 / 7777 / 9999</span>
            </span>
            <span>
              Fee: <span className="text-[#737373]">{poolData.pool.poolFee}%</span>
            </span>
            <span>
              Min Payout:{' '}
              <span className="text-[#f97316]">{poolData.pool.minimumPayout} ETI</span>
            </span>
          </div>
          <p className="text-center text-xs text-[#2a2a2a] mt-4">
            Etica Mining Pool &mdash; Decentralized Protocol Research
          </p>
        </footer>
      </main>
    </div>
  );
}
