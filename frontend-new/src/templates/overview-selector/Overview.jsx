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

/* ---------- Navigation config (matches Vue UpperNav.js) ---------- */

const NAV_DROPDOWNS = [
  {
    title: 'POOL',
    rows: [
      { title: 'Home', url: '/' },
      { title: 'Overview', url: '/overview' },
      { title: 'Payment Stats', url: '/paymentstats' },
    ],
  },
  {
    title: 'ETI POOLS NETWORK',
    rows: [
      { title: 'Active Pools', url: '/pools' },
      { title: 'Epochs', url: '/epochs' },
      { title: 'Network Mint Addresses', url: '/mintaddresses' },
    ],
  },
  {
    title: 'ECOSYSTEM',
    rows: [
      { title: 'Etica Official Website', url: 'https://www.eticaprotocol.org', external: true },
      { title: 'How it works', url: 'https://www.eticaprotocol.org/eticadocs', external: true },
      { title: 'Block Explorer', url: 'https://www.eticascan.org', external: true },
      { title: 'Web App', url: 'https://www.etica.io', external: true },
      { title: 'Reddit', url: 'https://reddit.com/r/etica', external: true },
      { title: 'Eticanomics', url: 'https://www.eticanomics.net', external: true },
      { title: 'Etica Intel', url: 'https://eticaintel.org/', external: true },
      { title: 'Github', url: 'https://github.com/etica/etica', external: true },
    ],
  },
];

/* ---------- Subcomponents ---------- */

function ExpandableHash({ label, value }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mb-3">
      <div className="os-label mb-1.5">{label}</div>
      <div
        className={`os-hash-field ${expanded ? 'expanded' : ''}`}
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
    <div className="os-data-row">
      <span className="os-data-key">{label}</span>
      <span className={`os-data-val ${className}`}>{children}</span>
    </div>
  );
}

function DataCard({ accent, tag, tagColor, title, children }) {
  return (
    <div className="os-data-card">
      <div className="os-data-card-accent" style={{ background: accent }} />
      <div className="os-data-card-body">
        {tag && (
          <div className="os-card-top mb-3">
            <span className={`os-tag os-tag-${tagColor}`}>{tag}</span>
          </div>
        )}
        {title && (
          <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">{title}</h3>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------- Tab: Mining Data ---------- */

function MiningDataTab() {
  const { miningContract, poolStatus } = poolData;

  return (
    <div className="space-y-6">
      {/* Pool Active */}
      <div className="os-status-line" style={{ justifyContent: 'flex-start' }}>
        <span className="os-status-badge">
          <span className="os-live-dot" />
          {poolNameAndUrl.poolName} is Active
        </span>
        {poolStatus.poolFeesMetrics.poolRewardsBonus > 0 && (
          <span className="text-xs text-[#f97316]">
            (Bonus Activated: +{poolStatus.poolFeesMetrics.poolRewardsBonus * 100}% on all mining rewards)
          </span>
        )}
      </div>

      {/* Minting + Payments */}
      <div className="os-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <DataCard
          accent="linear-gradient(90deg, #34d399, #06b6d4)"
          tag="MINT"
          tagColor="emerald"
          title="Minting Account"
        >
          <DataRow label="Address">
            <a
              href={`https://eticascan.org/address/${poolData.mintingAddress}`}
              target="_blank"
              rel="noreferrer"
              className="os-link-cyan"
            >
              {truncateAddress(poolData.mintingAddress, 10)}
            </a>
          </DataRow>
          <DataRow label="Network">{poolData.mintingNetwork}</DataRow>
          <DataRow label="EGAZ Balance">
            {rawToFormatted(poolStatus.mintingAccountBalances.ETH)} EGAZ
          </DataRow>
          <DataRow label="ETI Balance" className="emerald">
            {rawToFormatted(poolStatus.mintingAccountBalances.token)} ETI
          </DataRow>
          <p className="os-note mt-3">(ETI mined are immediately sent to reward process)</p>
        </DataCard>

        <DataCard
          accent="linear-gradient(90deg, #06b6d4, #f97316)"
          tag="PAY"
          tagColor="cyan"
          title="Payments Account"
        >
          <DataRow label="Address">
            <a
              href={`https://eticascan.org/address/${poolData.paymentsAddress}`}
              target="_blank"
              rel="noreferrer"
              className="os-link-cyan"
            >
              {truncateAddress(poolData.paymentsAddress, 10)}
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
              className="os-link-cyan"
            >
              {truncateAddress(poolData.batchedPaymentsContractAddress, 10)}
            </a>
          </DataRow>
          <DataRow label="Pool Balance" className="orange">
            {rawToFormatted(poolStatus.paymentsAccountBalances.token)} ETI
          </DataRow>
        </DataCard>
      </div>

      {/* Block Info */}
      <DataCard accent="linear-gradient(90deg, #6b7280, #374151)">
        <DataRow label="Last Known Block">{formatNumber(poolData.ethBlockNumber)}</DataRow>
        <DataRow label="Min Payment" className="orange">
          {rawToFormatted(poolData.minBalanceForPayment)} ETI
        </DataRow>
        <p className="os-note mt-3">
          Low Balance Payments: every 24 hours for balances between 0.01 ETI and{' '}
          {rawToFormatted(poolData.minBalanceForPayment)} ETI
        </p>
      </DataCard>

      {/* Mining Contract */}
      <DataCard
        accent="linear-gradient(90deg, #34d399, #34d399)"
        tag="CONTRACT"
        tagColor="emerald"
        title="Mining Contract"
      >
        <ExpandableHash label="RandomX Blob" value={miningContract.randomxBlob} />
        <ExpandableHash label="RandomX Seedhash" value={miningContract.randomxSeedhash} />
        <ExpandableHash label="Challenge Number" value={miningContract.challengeNumber} />
        <div className="grid grid-cols-2 gap-6 mt-4">
          <div>
            <p className="os-label mb-1">Epoch Count</p>
            <p className="text-xl font-bold text-white">{formatNumber(miningContract.epochCount)}</p>
          </div>
          <div>
            <p className="os-label mb-1">Mining Difficulty</p>
            <p className="text-xl font-bold text-white">{formatNumber(miningContract.miningDifficulty)}</p>
          </div>
        </div>
      </DataCard>
    </div>
  );
}

/* ---------- Tab: Getting Started ---------- */

function GettingStartedTab() {
  return (
    <div className="space-y-6">
      <DataCard
        accent="linear-gradient(90deg, #f97316, #fbbf24)"
        tag="START"
        tagColor="orange"
        title="Miners"
      >
        <div className="space-y-2 text-sm">
          <div>
            XMRig:{' '}
            <a href="https://xmrig.com/" target="_blank" rel="noreferrer" className="os-link">
              https://xmrig.com/
            </a>
          </div>
          <div>
            SRBMiner:{' '}
            <a
              href="https://github.com/doktor83/SRBMiner-Multi/releases"
              target="_blank"
              rel="noreferrer"
              className="os-link"
            >
              https://github.com/doktor83/SRBMiner-Multi/releases
            </a>
          </div>
        </div>

        <p className="os-note mt-4">
          Instructions: Use same settings as Monero. Replace address with Etica address.
          Enter pool URL with mining port. Example:{' '}
          {poolNameAndUrl.poolUrl?.replace(/^https?:\/\//, '')}:3333
        </p>
      </DataCard>

      <DataCard accent="linear-gradient(90deg, #06b6d4, #34d399)" title="Connection Details">
        <DataRow label="Pool URL" className="emerald">
          {poolNameAndUrl.poolUrl}
        </DataRow>
      </DataCard>

      <div>
        <h3 className="os-section-title orange">Mining Ports</h3>
        <div className="os-ports-grid">
          {poolData.stratumPorts.map((sp) => (
            <DataCard key={sp.port} accent={
              sp.port === 3333 ? '#34d399' :
              sp.port === 5555 ? '#f97316' :
              sp.port === 7777 ? '#fbbf24' : '#f87171'
            }>
              <div className="text-center">
                <span className={`os-port-tag os-port-${sp.port}`}>{sp.port}</span>
                <p className="os-label mt-3">Starting Difficulty</p>
                <p className="text-sm font-bold text-white mt-1">{formatNumber(sp.difficulty)}</p>
                <p className="text-xs text-[#4b5563] mt-2">{sp.label}</p>
              </div>
            </DataCard>
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
      <DataCard
        accent="linear-gradient(90deg, #34d399, #06b6d4)"
        tag="STATUS"
        tagColor="emerald"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="os-live-dot" />
          <span className="text-sm font-semibold text-[#34d399]">
            Pool Status: {poolNameAndUrl.poolName} is Active
          </span>
        </div>

        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Stratum Ports</h3>
        {poolData.stratumPorts.map((sp) => (
          <DataRow key={sp.port} label={`Port ${sp.port}`}>
            Minimum Shares Difficulty: {formatNumber(sp.difficulty)}
          </DataRow>
        ))}
      </DataCard>

      <DataCard
        accent="linear-gradient(90deg, #f97316, #f87171)"
        tag="FEES"
        tagColor="orange"
        title="Fees &amp; Rewards"
      >
        <DataRow label="Avg Gas Price">{fees.avgGasPriceGWei} GWei</DataRow>
        <DataRow label="Full Mining Reward" className="emerald">
          {Number.parseFloat(rawToFormatted(fees.miningRewardRaw))} ETI
        </DataRow>
        <DataRow label="ETI/EGAZ Ratio">{fees.token_Eth_Price_Ratio}</DataRow>
        <DataRow label="Pool Base Fee">{fees.poolBaseFee}</DataRow>
        {fees.poolRewardsBonus > 0 && (
          <DataRow label="Rewards Bonus" className="emerald">
            +{fees.poolRewardsBonus * 100}%
          </DataRow>
        )}
      </DataCard>
    </div>
  );
}

/* ---------- Tab: Recent Transactions ---------- */

function RecentTransactionsTab() {
  return (
    <div>
      <DataCard
        accent="linear-gradient(90deg, #06b6d4, #34d399)"
        tag="TX"
        tagColor="cyan"
        title="Recent Payments"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-3 px-3 os-label font-medium">Block</th>
                <th className="text-left py-3 px-3 os-label font-medium">TxHash</th>
                <th className="text-right py-3 px-3 os-label font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPaymentsBatched.map((tx, idx) => (
                <tr key={idx} className="os-table-row">
                  <td className="py-3 px-3 text-white font-medium">{tx.block}</td>
                  <td className="py-3 px-3">
                    <a
                      href={`https://eticascan.org/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="os-link-cyan font-mono text-xs"
                    >
                      {truncateAddress(tx.txHash, 12)}
                    </a>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        tx.status === 'confirmed'
                          ? 'text-[#34d399] bg-[#34d399]/10'
                          : 'text-[#fbbf24] bg-[#fbbf24]/10'
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
      </DataCard>
    </div>
  );
}

/* ---------- Main Overview ---------- */

const TABS = ['Mining Data', 'Getting Started', 'Pool Status', 'Recent Transactions'];

export default function Overview() {
  const [activeTab, setActiveTab] = useState('Mining Data');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { stratumPorts } = poolData;

  return (
    <div className="os-root">
      {/* ========== NAVBAR ========== */}
      <nav className="os-navbar">
        {/* Brand — shows "Active" status */}
        <Link to="/" className="os-navbar-brand">
          <img src="/images/eti-logo.png" alt="ETI" className="w-8 h-8" />
          <span className="os-status-badge">
            <span className="os-live-dot" />
            Active
          </span>
        </Link>

        {/* Mobile toggle */}
        <button
          className="os-nav-toggle"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
        >
          {mobileNavOpen ? '\u2715' : '\u2630'}
        </button>

        {/* Nav dropdowns */}
        <div className={`os-navbar-nav ${mobileNavOpen ? 'open' : ''}`}>
          {NAV_DROPDOWNS.map((dd) => (
            <div key={dd.title} className="os-nav-dropdown">
              <button className={`os-nav-btn ${dd.title === 'POOL' ? 'active' : ''}`}>
                {dd.title} <span className="ml-1 text-[8px]">&#9662;</span>
              </button>
              <div className="os-nav-dropdown-menu">
                {dd.rows.map((row) =>
                  row.external ? (
                    <a
                      key={row.title}
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="os-nav-dropdown-link"
                    >
                      {row.title}
                    </a>
                  ) : (
                    <Link key={row.title} to={row.url} className="os-nav-dropdown-link">
                      {row.title}
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="0x... search miner"
          className="os-search-input hidden sm:block"
          readOnly
        />
      </nav>

      {/* ========== CENTERED TITLE ========== */}
      <div className="os-header">
        <div className="os-header-title">
          <img src="/images/eti-logo.png" alt="ETI" className="w-10 h-10" />
          ETICA <span className="accent">POOL</span>
        </div>
        <p className="os-header-sub">Pool Overview &mdash; Mining Data &amp; Status</p>
        <p className="os-header-mono">{poolNameAndUrl.poolUrl}</p>
        <div className="os-status-line" style={{ marginTop: '0.75rem' }}>
          {stratumPorts.map((sp) => (
            <span key={sp.port} className={`os-port-tag os-port-${sp.port}`}>
              {sp.port} &middot; {sp.label}
            </span>
          ))}
          <Link to="/templates" className="os-back-link ml-2">
            &larr; templates
          </Link>
        </div>
      </div>

      {/* ========== MAIN ========== */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        {/* Tab Navigation — pill style like the selector page section headers */}
        <div className="os-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`os-tab ${activeTab === tab ? 'active' : ''}`}
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
        <footer className="pt-10 pb-8">
          <div className="os-footer-line mb-8" />

          {/* 3-column links (matches Footer.vue) */}
          <div className="os-footer-columns">
            {/* Column 1: Documentation */}
            <div>
              <h4 className="os-footer-heading">Documentation</h4>
              <a href="https://www.eticaprotocol.org/viewwhitepaper" target="_blank" rel="noreferrer" className="os-footer-link">White Paper</a>
              <a href="https://www.eticaprotocol.org/eticadocs/mining.html" target="_blank" rel="noreferrer" className="os-footer-link">How to mine Etica</a>
              <a href="https://www.eticaprotocol.org/eticadocs/howitworks.html" target="_blank" rel="noreferrer" className="os-footer-link">How it works</a>
              <a href="https://www.eticaprotocol.org/exchanges" target="_blank" rel="noreferrer" className="os-footer-link">Exchanges</a>
              <a href="https://www.youtube.com/watch?v=IaIDSLBxzjg" target="_blank" rel="noreferrer" className="os-footer-link">Create Etica Wallet (Metamask)</a>
              <a href="https://github.com/etica/etica-gui/releases" target="_blank" rel="noreferrer" className="os-footer-link">Create Etica Wallet (GUI)</a>
              <a href="https://www.youtube.com/watch?v=tPljgu0rez0" target="_blank" rel="noreferrer" className="os-footer-link">How to mine EGAZ</a>
            </div>

            {/* Column 2: Community & Social */}
            <div>
              <h4 className="os-footer-heading">Community &amp; Social</h4>
              <a href="https://github.com/etica/eticapool" target="_blank" rel="noreferrer" className="os-footer-link">Run this pool: Github</a>
              <a href="https://reddit.com/r/etica" target="_blank" rel="noreferrer" className="os-footer-link">Reddit</a>
              <a href="https://discord.gg/CrTKpETKXc" target="_blank" rel="noreferrer" className="os-footer-link">Discord</a>
              <a href="https://t.me/eticaprotocol" target="_blank" rel="noreferrer" className="os-footer-link">Telegram</a>
            </div>

            {/* Column 3: Explorers */}
            <div>
              <h4 className="os-footer-heading">Explorers</h4>
              <a href="https://www.eticascan.org" target="_blank" rel="noreferrer" className="os-footer-link">EticaScan</a>
              <a href="http://explorer.etica-stats.org/" target="_blank" rel="noreferrer" className="os-footer-link">Etica Stats Explorer</a>
              <a href="https://miningpoolstats.stream/etica" target="_blank" rel="noreferrer" className="os-footer-link">Mining Pool Stats</a>
              <a href="https://github.com/etica/eticapool" target="_blank" rel="noreferrer" className="os-footer-link">Eticapool v5.0.0</a>
            </div>
          </div>

          {/* Pool info line */}
          <div className="os-footer-line mt-8 mb-4" />
          <div className="os-footer-meta">
            <span className="font-mono text-[#374151] break-all text-[10px]">
              {poolData.smartContractAddress}
            </span>
          </div>
          <div className="os-footer-meta mt-2">
            <span>Ports: <span className="text-[#6b7280]">3333 / 5555 / 7777 / 9999</span></span>
            <span>Fee: <span className="text-[#6b7280]">{poolData.pool.poolFee}%</span></span>
            <span>Min Payout: <span className="text-[#34d399]">{poolData.pool.minimumPayout} ETI</span></span>
          </div>
          <p className="os-footer-text mt-4">
            Etica Mining Pool &mdash; Science knows no country because knowledge belongs to Humanity
          </p>
        </footer>
      </main>
    </div>
  );
}
