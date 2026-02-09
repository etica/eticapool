import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { poolData, poolNameAndUrl, formatNumber, truncateAddress, rawToFormatted, recentPaymentsBatched } from '../../mock-data';

const EXPLORER_BASE = 'https://eticascan.org/';

const TABS = ['Mining Data', 'Getting Started', 'Pool Status', 'Recent Transactions'];

/* ────────────────────────── Styles (injected) ────────────────────────── */

const glassStyles = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

.glass-root {
  min-height: 100vh;
  background: #000000;
  font-family: 'Space Mono', monospace;
  color: #e5e7eb;
  position: relative;
  overflow-x: hidden;
}
.glass-root::before {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse 80% 60% at 50% 30%, rgba(16,185,129,0.03) 0%, transparent 70%),
              radial-gradient(ellipse 60% 40% at 80% 70%, rgba(0,255,65,0.02) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}
.glass-content {
  position: relative;
  z-index: 1;
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

/* Tab bar */
.glass-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 36px;
}
.glass-tab {
  padding: 10px 22px;
  border-radius: 4px;
  border: 1px solid rgba(16,185,129,0.25);
  background: rgba(10,10,10,0.8);
  color: #9ca3af;
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.5px;
}
.glass-tab:hover {
  border-color: rgba(16,185,129,0.5);
  color: #d1d5db;
}
.glass-tab.active {
  background: #10b981;
  border-color: #10b981;
  color: #ffffff;
  font-weight: 700;
}

/* Cards */
.glass-card {
  background: rgba(10,15,10,0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(16,185,129,0.15);
  border-radius: 8px;
  padding: 28px 28px 24px;
  margin-bottom: 20px;
  transition: border-color 0.25s ease;
}
.glass-card:hover {
  border-color: rgba(16,185,129,0.35);
}

/* Section title */
.glass-section-title {
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 20px;
  padding-bottom: 8px;
  position: relative;
}
.glass-section-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 120px;
  height: 2px;
  background: linear-gradient(90deg, #10b981, transparent);
}

/* Key value */
.glass-value {
  color: #00ff41;
  text-shadow: 0 0 8px rgba(0,255,65,0.3);
}
.glass-label {
  color: #9ca3af;
  font-size: 13px;
}
.glass-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 14px;
  line-height: 1.6;
}
.glass-row:last-child {
  margin-bottom: 0;
}

/* Links */
.glass-link {
  color: #10b981;
  text-decoration: none;
  transition: color 0.15s;
  word-break: break-all;
}
.glass-link:hover {
  color: #00ff41;
  text-shadow: 0 0 6px rgba(0,255,65,0.25);
}

/* Ports grid */
.glass-ports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.glass-port-card {
  background: rgba(10,15,10,0.6);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(16,185,129,0.12);
  border-radius: 6px;
  padding: 18px 20px;
  transition: border-color 0.2s;
}
.glass-port-card:hover {
  border-color: rgba(16,185,129,0.3);
}

/* Table */
.glass-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.glass-table th {
  text-align: left;
  color: #9ca3af;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 11px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(16,185,129,0.15);
}
.glass-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(16,185,129,0.07);
  vertical-align: middle;
}
.glass-table tbody tr {
  transition: background 0.15s;
}
.glass-table tbody tr:hover {
  background: rgba(16,185,129,0.04);
}

/* Status badge */
.glass-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.glass-badge.confirmed {
  background: rgba(16,185,129,0.15);
  color: #10b981;
  border: 1px solid rgba(16,185,129,0.25);
}
.glass-badge.pending {
  background: rgba(234,179,8,0.12);
  color: #eab308;
  border: 1px solid rgba(234,179,8,0.25);
}

/* Mono blob */
.glass-blob {
  font-size: 11px;
  word-break: break-all;
  line-height: 1.7;
  padding: 6px 0;
}

/* Header */
.glass-page-title {
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8px;
  letter-spacing: 1px;
}
.glass-back-link {
  display: inline-block;
  margin-bottom: 28px;
  color: #10b981;
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0.5px;
  transition: color 0.15s;
}
.glass-back-link:hover {
  color: #00ff41;
}

/* Active pill */
.glass-active-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #10b981;
  font-weight: 700;
}
.glass-active-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px rgba(16,185,129,0.6);
  animation: glass-pulse 2s ease-in-out infinite;
}
@keyframes glass-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(16,185,129,0.6); }
  50% { opacity: 0.5; box-shadow: 0 0 4px rgba(16,185,129,0.3); }
}

/* Note */
.glass-note {
  color: #6b7280;
  font-size: 12px;
  font-style: italic;
}
`;

/* ────────────────────────── Helper ────────────────────────── */

function removeProtocol(url) {
  if (!url) return '';
  return url.replace(/^(https?:\/\/)/, '');
}

/* ────────────────────────── Tab: Mining Data ────────────────────────── */

function MiningDataTab() {
  const ps = poolData.poolStatus;
  const mc = poolData.miningContract;

  return (
    <div>
      {/* Pool Active Banner */}
      <div className="glass-card">
        <div className="glass-active-pill" style={{ marginBottom: 18 }}>
          <span className="glass-active-dot" />
          {poolNameAndUrl.poolName} is Active
          {ps.poolFeesMetrics.poolRewardsBonus > 0 && (
            <span style={{ color: '#00ff41', fontWeight: 400, marginLeft: 8 }}>
              (Bonus Activated: +{ps.poolFeesMetrics.poolRewardsBonus * 100}% on all mining rewards)
            </span>
          )}
        </div>

        <div className="glass-section-title">Minting Account</div>
        <div className="glass-row">
          <span className="glass-label">Address:</span>
          <a className="glass-link" href={EXPLORER_BASE + 'address/' + poolData.mintingAddress} target="_blank" rel="noreferrer">
            {poolData.mintingAddress}
          </a>
        </div>
        <div className="glass-row">
          <span className="glass-label">Network:</span>
          <span>{poolData.mintingNetwork}</span>
        </div>
        <div className="glass-row">
          <span className="glass-label">Balance:</span>
          <span className="glass-value">{rawToFormatted(ps.mintingAccountBalances.ETH, 18)} EGAZ</span>
        </div>
        <div className="glass-row">
          <span className="glass-label">Balance:</span>
          <span className="glass-value">{rawToFormatted(ps.mintingAccountBalances.token, 18)} ETI</span>
        </div>
        <div className="glass-note" style={{ marginTop: 4 }}>(ETI mined are immediately sent to reward process)</div>
      </div>

      {/* Payments Account */}
      <div className="glass-card">
        <div className="glass-section-title">Payments Account</div>
        <div className="glass-row">
          <span className="glass-label">Address:</span>
          <a className="glass-link" href={EXPLORER_BASE + 'address/' + poolData.paymentsAddress} target="_blank" rel="noreferrer">
            {poolData.paymentsAddress}
          </a>
        </div>
        <div className="glass-row">
          <span className="glass-label">Network:</span>
          <span>{poolData.paymentsNetwork}</span>
        </div>
        <div className="glass-row">
          <span className="glass-label">Balance EGAZ:</span>
          <span className="glass-value">{rawToFormatted(ps.paymentsAccountBalances.ETH, 18)} EGAZ</span>
        </div>
        <div className="glass-row">
          <span className="glass-label">Batched Payments Contract:</span>
          <a className="glass-link" href={EXPLORER_BASE + 'address/' + poolData.batchedPaymentsContractAddress} target="_blank" rel="noreferrer">
            {poolData.batchedPaymentsContractAddress}
          </a>
        </div>
        <div className="glass-row">
          <span className="glass-label">Mining Pool Balance:</span>
          <span className="glass-value">{rawToFormatted(ps.paymentsAccountBalances.token, 18)} ETI</span>
        </div>
      </div>

      {/* Block / Payment Info */}
      <div className="glass-card">
        <div className="glass-section-title">Payment Info</div>
        <div className="glass-row">
          <span className="glass-label">Last Known Block Number:</span>
          <span>{formatNumber(poolData.ethBlockNumber)}</span>
        </div>
        <div className="glass-row">
          <span className="glass-label">Minimum User Balance For Payment:</span>
          <span className="glass-value">{rawToFormatted(poolData.minBalanceForPayment, 18)} ETI</span>
        </div>
        <div className="glass-note">
          Low Balance Payments: every 24 hours for balances between <strong>0.01 ETI</strong> and <strong>{rawToFormatted(poolData.minBalanceForPayment, 18)} ETI</strong>
        </div>
      </div>

      {/* Mining Contract Data */}
      <div className="glass-card">
        <div className="glass-section-title">Mining Contract Data</div>

        <div className="glass-row" style={{ flexDirection: 'column', gap: 2 }}>
          <span className="glass-label" style={{ textDecoration: 'underline' }}>Current Network RandomX Blob:</span>
          <span className="glass-blob" style={{ color: '#a4ff03' }}>{mc.randomxBlob}</span>
        </div>
        <div className="glass-row" style={{ marginTop: 8 }}>
          <span className="glass-label">RandomX Seedhash:</span>
          <span className="glass-blob" style={{ color: '#067737' }}>{mc.randomxSeedhash}</span>
        </div>
        <div className="glass-row">
          <span className="glass-label">Challenge Number:</span>
          <span style={{ fontSize: 13, wordBreak: 'break-all' }}>{mc.challengeNumber}</span>
        </div>
        <div className="glass-row">
          <span className="glass-label">Epoch Count:</span>
          <span className="glass-value">{formatNumber(mc.epochCount)}</span>
        </div>

        <div style={{ marginTop: 14 }}>
          <span className="glass-label" style={{ textDecoration: 'underline' }}>Blockchain Difficulty:</span>
        </div>
        <div className="glass-row" style={{ marginTop: 6 }}>
          <span className="glass-label">Current ETI Mining Difficulty:</span>
          <span className="glass-value">{formatNumber(mc.miningDifficulty)}</span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── Tab: Getting Started ────────────────────────── */

function GettingStartedTab() {
  const ports = poolData.stratumPorts;

  return (
    <div>
      <div className="glass-card">
        <div className="glass-section-title">Miners</div>
        <div className="glass-row">
          <span className="glass-label">XMRig:</span>
          <a className="glass-link" href="https://xmrig.com/" target="_blank" rel="noreferrer">https://xmrig.com/</a>
        </div>
        <div className="glass-row">
          <span className="glass-label">SRBMiner:</span>
          <a className="glass-link" href="https://github.com/doktor83/SRBMiner-Multi/releases" target="_blank" rel="noreferrer">
            https://github.com/doktor83/SRBMiner-Multi/releases
          </a>
        </div>

        <div className="glass-note" style={{ marginTop: 16 }}>
          Instructions: Use same settings as Monero. Replace address with Etica address. Enter pool URL with mining port.
          Example: {removeProtocol(poolNameAndUrl.poolUrl)}:3333
        </div>
      </div>

      <div className="glass-card">
        <div className="glass-section-title">Connection Details</div>
        <div className="glass-row">
          <span className="glass-label" style={{ textDecoration: 'underline' }}>Mining Pool Address:</span>
          <span style={{ color: '#b3b3b3' }}>{poolNameAndUrl.poolUrl}</span>
        </div>
      </div>

      <div className="glass-card">
        <div className="glass-section-title">Mining Ports</div>
        <div className="glass-ports-grid">
          {ports.map((p) => (
            <div className="glass-port-card" key={p.port}>
              <div style={{ marginBottom: 8 }}>
                <span className="glass-label">Port: </span>
                <span className="glass-value" style={{ fontSize: 18 }}>{p.port}</span>
              </div>
              <div style={{ marginBottom: 4 }}>
                <span className="glass-label">Starting Difficulty: </span>
                <span style={{ color: '#10b981' }}>{formatNumber(p.difficulty)}</span>
              </div>
              <div style={{ color: '#d1d5db', fontSize: 13 }}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── Tab: Pool Status ────────────────────────── */

function PoolStatusTab() {
  const ps = poolData.poolStatus;
  const fm = ps.poolFeesMetrics;
  const ports = poolData.stratumPorts;

  return (
    <div>
      <div className="glass-card">
        <div className="glass-active-pill" style={{ marginBottom: 20 }}>
          <span className="glass-active-dot" />
          Pool Status: {poolNameAndUrl.poolName} is Active
        </div>

        <div className="glass-section-title">Stratum Ports</div>
        {ports.map((p) => (
          <div key={p.port} style={{ marginBottom: 10 }}>
            <span style={{ textDecoration: 'underline', color: '#ffffff' }}>Port {p.port}:</span>{' '}
            <span className="glass-label">Minimum Shares Difficulty: </span>
            <span style={{ color: '#10b981' }}>{formatNumber(p.difficulty)}</span>
          </div>
        ))}
      </div>

      <div className="glass-card">
        <div className="glass-section-title">Pool Metrics</div>
        <div className="glass-row">
          <span className="glass-label">avgGasPriceGWei:</span>
          <span className="glass-value">{fm.avgGasPriceGWei}</span>
        </div>
        <div className="glass-row">
          <span className="glass-label">Full Mining Reward:</span>
          <span className="glass-value">{Number.parseFloat(rawToFormatted(fm.miningRewardRaw, 18))} ETI</span>
        </div>
        <div className="glass-row">
          <span className="glass-label">Current ETI/EGAZ Ratio:</span>
          <span>{fm.token_Eth_Price_Ratio}</span>
          <span className="glass-note" style={{ fontStyle: 'normal' }}>
            (1 ETI for {(1 / fm.token_Eth_Price_Ratio).toFixed(2)} EGAZ)
          </span>
        </div>
        <div className="glass-row">
          <span className="glass-label">Pool Base Fee Factor:</span>
          <span>{fm.poolBaseFee}</span>
        </div>
        {fm.poolRewardsBonus > 0 && (
          <div className="glass-row">
            <span className="glass-label">Pool Rewards Bonus:</span>
            <span className="glass-value">{fm.poolRewardsBonus}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────── Tab: Recent Transactions ────────────────────────── */

function RecentTransactionsTab() {
  return (
    <div className="glass-card" style={{ overflowX: 'auto' }}>
      <div className="glass-section-title">Recent Payments</div>
      {recentPaymentsBatched.length === 0 ? (
        <div className="glass-label" style={{ padding: '20px 0' }}>No recent transactions.</div>
      ) : (
        <table className="glass-table">
          <thead>
            <tr>
              <th>Block</th>
              <th>Tx Hash</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentPaymentsBatched.map((tx, i) => (
              <tr key={i}>
                <td>{formatNumber(tx.block)}</td>
                <td>
                  <a className="glass-link" href={EXPLORER_BASE + 'tx/' + tx.txHash} target="_blank" rel="noreferrer">
                    {truncateAddress(tx.txHash, 10)}
                  </a>
                </td>
                <td>
                  <span className={'glass-badge ' + tx.status}>{tx.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ────────────────────────── Main Component ────────────────────────── */

export default function Overview() {
  const [activeTab, setActiveTab] = useState('Mining Data');

  return (
    <div className="glass-root">
      <style>{glassStyles}</style>
      <div className="glass-content">
        <Link to="/templates" className="glass-back-link">&larr; Back to Templates</Link>
        <h1 className="glass-page-title">Pool Overview</h1>

        {/* Tab bar */}
        <div className="glass-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={'glass-tab' + (activeTab === tab ? ' active' : '')}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'Mining Data' && <MiningDataTab />}
        {activeTab === 'Getting Started' && <GettingStartedTab />}
        {activeTab === 'Pool Status' && <PoolStatusTab />}
        {activeTab === 'Recent Transactions' && <RecentTransactionsTab />}
      </div>
    </div>
  );
}
