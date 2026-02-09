import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { poolData, poolNameAndUrl, formatNumber, truncateAddress, rawToFormatted, recentPaymentsBatched } from '../../mock-data';

const ETICASCAN = 'https://eticascan.org/';

const TABS = ['Mining Data', 'Getting Started', 'Pool Status', 'Recent Transactions'];

const PORT_COLORS = {
  3333: '#06b6d4',
  5555: '#a855f7',
  7777: '#f59e0b',
  9999: '#f43f5e',
};

function injectedStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

      .neon-grid-root {
        position: relative;
        min-height: 100vh;
        background: #050505;
        font-family: 'Space Mono', monospace;
        color: #e5e7eb;
        overflow-x: hidden;
      }
      .neon-grid-root::before {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(0,255,65,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,65,0.04) 1px, transparent 1px);
        background-size: 20px 20px;
        z-index: 0;
      }
      .neon-grid-root > * {
        position: relative;
        z-index: 1;
      }

      .ng-glow { text-shadow: 0 0 20px rgba(0,255,65,0.15), 0 0 40px rgba(0,255,65,0.05); }

      .ng-card {
        background: rgba(10,15,10,0.8);
        border: 1px solid rgba(16,185,129,0.2);
        border-radius: 6px;
        padding: 20px;
        transition: border-color 0.3s, box-shadow 0.3s;
      }
      .ng-card:hover {
        border-color: rgba(16,185,129,0.5);
        box-shadow: 0 0 16px rgba(16,185,129,0.08);
      }

      .ng-section-title {
        color: #00ff41;
        text-transform: uppercase;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 2px;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid transparent;
        border-image: linear-gradient(90deg, #10b981, transparent) 1;
      }

      .ng-tab {
        padding: 10px 24px;
        font-size: 13px;
        font-family: 'Space Mono', monospace;
        font-weight: 700;
        letter-spacing: 1px;
        border: 1px solid #10b981;
        background: transparent;
        color: #10b981;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
        border-radius: 0;
        margin-right: -1px;
        text-transform: uppercase;
      }
      .ng-tab:first-child { border-radius: 0; }
      .ng-tab:last-child { border-radius: 0; margin-right: 0; }
      .ng-tab:hover:not(.ng-tab-active) {
        background: rgba(0,255,65,0.06);
      }
      .ng-tab-active {
        background: #00ff41;
        color: #000;
        border-color: #00ff41;
      }

      .ng-label {
        font-size: 12px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .ng-value {
        color: #00ff41;
        font-weight: 700;
        font-size: 15px;
      }

      .ng-link {
        color: #10b981;
        text-decoration: none;
        word-break: break-all;
        transition: color 0.2s;
      }
      .ng-link:hover { color: #00ff41; }

      .ng-pulse-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #00ff41;
        box-shadow: 0 0 8px rgba(0,255,65,0.6);
        animation: ng-pulse 1.5s ease-in-out infinite;
        vertical-align: middle;
        margin-right: 8px;
      }
      @keyframes ng-pulse {
        0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(0,255,65,0.6); }
        50% { opacity: 0.4; box-shadow: 0 0 4px rgba(0,255,65,0.3); }
      }

      .ng-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .ng-table th {
        text-align: left;
        padding: 10px 12px;
        color: #00ff41;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 1px;
        border-bottom: 1px solid rgba(16,185,129,0.3);
        font-weight: 700;
      }
      .ng-table td {
        padding: 10px 12px;
        border-bottom: 1px solid rgba(16,185,129,0.08);
        color: #d1d5db;
      }
      .ng-table tr:hover td {
        background: rgba(0,255,65,0.02);
      }

      .ng-port-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 3px;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid;
      }

      .ng-mono { font-size: 11px; word-break: break-all; color: #9ca3af; }

      .ng-divider {
        border: none;
        border-top: 1px solid rgba(16,185,129,0.15);
        margin: 16px 0;
      }
    `}</style>
  );
}

function PortBadge({ port }) {
  const color = PORT_COLORS[port] || '#10b981';
  return (
    <span
      className="ng-port-badge"
      style={{ color, borderColor: color, background: `${color}10` }}
    >
      {port}
    </span>
  );
}

function DataRow({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <span className="ng-label">{label}</span>
      <div style={{ marginTop: 2 }}>{children}</div>
    </div>
  );
}

/* ================================================================
   TAB: Mining Data
   ================================================================ */
function MiningDataTab() {
  const ps = poolData.poolStatus;
  const mc = poolData.miningContract;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Active status */}
      <div className="ng-card">
        <div className="ng-section-title">Pool Status</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span className="ng-pulse-dot" />
          <span className="ng-value ng-glow" style={{ fontSize: 16 }}>
            {poolNameAndUrl.poolName} is Active
          </span>
          {ps.poolFeesMetrics.poolRewardsBonus > 0 && (
            <span style={{ color: '#10b981', fontSize: 13, marginLeft: 8 }}>
              (Bonus Activated: +{ps.poolFeesMetrics.poolRewardsBonus * 100}% on all mining rewards)
            </span>
          )}
        </div>

        <DataRow label="Minting Account Address">
          <a
            className="ng-link"
            href={`${ETICASCAN}address/${poolData.mintingAddress}`}
            target="_blank"
            rel="noreferrer"
          >
            {poolData.mintingAddress}
          </a>
        </DataRow>
        <DataRow label="Minting Network">
          <span style={{ color: '#e5e7eb' }}>{poolData.mintingNetwork}</span>
        </DataRow>
        {ps.mintingAccountBalances && (
          <>
            <DataRow label="Minting Balance (EGAZ)">
              <span className="ng-value ng-glow">
                {rawToFormatted(ps.mintingAccountBalances.ETH, 18)} EGAZ
              </span>
            </DataRow>
            <DataRow label="Minting Balance (ETI)">
              <span className="ng-value ng-glow">
                {rawToFormatted(ps.mintingAccountBalances.token, 18)} ETI
              </span>
            </DataRow>
          </>
        )}
        <div style={{ color: '#6b7280', fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>
          (Eti mined are immediately sent to reward process)
        </div>
      </div>

      {/* Payments */}
      <div className="ng-card">
        <div className="ng-section-title">Payments Account</div>
        <DataRow label="Payments Account Address">
          <a
            className="ng-link"
            href={`${ETICASCAN}address/${poolData.paymentsAddress}`}
            target="_blank"
            rel="noreferrer"
          >
            {poolData.paymentsAddress}
          </a>
        </DataRow>
        <DataRow label="Payments Network">
          <span style={{ color: '#e5e7eb' }}>{poolData.paymentsNetwork}</span>
        </DataRow>
        {ps.paymentsAccountBalances && (
          <DataRow label="Payments Balance (EGAZ)">
            <span className="ng-value ng-glow">
              {rawToFormatted(ps.paymentsAccountBalances.ETH, 18)} EGAZ
            </span>
          </DataRow>
        )}
        {poolData.batchedPaymentsContractAddress && (
          <DataRow label="Batched Payments Contract">
            <a
              className="ng-link"
              href={`${ETICASCAN}address/${poolData.batchedPaymentsContractAddress}`}
              target="_blank"
              rel="noreferrer"
            >
              {poolData.batchedPaymentsContractAddress}
            </a>
          </DataRow>
        )}
        {ps.paymentsAccountBalances && (
          <DataRow label="Mining Pool Balance (ETI)">
            <span className="ng-value ng-glow">
              {rawToFormatted(ps.paymentsAccountBalances.token, 18)} ETI
            </span>
          </DataRow>
        )}
      </div>

      {/* Block & Payments info */}
      <div className="ng-card">
        <div className="ng-section-title">Payment Info</div>
        <DataRow label="Last Known Block Number">
          <span className="ng-value ng-glow">{formatNumber(poolData.ethBlockNumber)}</span>
        </DataRow>
        <DataRow label="Minimum User Balance For Payment">
          <span style={{ color: '#10b981', fontWeight: 700 }}>
            {rawToFormatted(poolData.minBalanceForPayment, 18)} ETI
          </span>
        </DataRow>
        <div style={{ color: '#6b7280', fontSize: 12, fontStyle: 'italic' }}>
          Low Balance Payments: every 24 hours for balances between <strong>0.01 ETI</strong> and{' '}
          <strong>{rawToFormatted(poolData.minBalanceForPayment, 18)} ETI</strong>
        </div>
      </div>

      {/* Mining Contract Data */}
      <div className="ng-card">
        <div className="ng-section-title">Mining Contract Data</div>
        <DataRow label="Current Network Randomx Blob">
          <span style={{ fontSize: 11, color: '#00ff41', wordBreak: 'break-all', lineHeight: 1.6 }}>
            {mc.randomxBlob}
          </span>
        </DataRow>
        <DataRow label="Current Network Randomx Seedhash">
          <span style={{ fontSize: 12, color: '#10b981', wordBreak: 'break-all' }}>
            {mc.randomxSeedhash}
          </span>
        </DataRow>
        <DataRow label="Current Challenge Number">
          <span className="ng-mono">{mc.challengeNumber}</span>
        </DataRow>
        <DataRow label="Epoch Count">
          <span className="ng-value ng-glow">{formatNumber(mc.epochCount)}</span>
        </DataRow>
        <hr className="ng-divider" />
        <div className="ng-section-title" style={{ marginTop: 8 }}>Blockchain Difficulty</div>
        <DataRow label="Current ETI Mining Difficulty">
          <span className="ng-value ng-glow">{formatNumber(mc.miningDifficulty)}</span>
        </DataRow>
      </div>
    </div>
  );
}

/* ================================================================
   TAB: Getting Started
   ================================================================ */
function GettingStartedTab() {
  const poolUrl = poolNameAndUrl.poolUrl;
  const cleanUrl = poolUrl.replace(/^https?:\/\//, '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Miners / Software */}
      <div className="ng-card">
        <div className="ng-section-title">Mining Software</div>
        <DataRow label="Miners">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              XMRig:{' '}
              <a className="ng-link" href="https://xmrig.com/" target="_blank" rel="noreferrer">
                https://xmrig.com/
              </a>
            </div>
            <div>
              SRBMiner:{' '}
              <a
                className="ng-link"
                href="https://github.com/doktor83/SRBMiner-Multi/releases"
                target="_blank"
                rel="noreferrer"
              >
                https://github.com/doktor83/SRBMiner-Multi/releases
              </a>
            </div>
          </div>
        </DataRow>
        <hr className="ng-divider" />
        <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic', lineHeight: 1.7 }}>
          Instructions: Use same settings as monero. Replace address with Etica address.
          Enter pool url with mining port. Example:{' '}
          <span style={{ color: '#00ff41' }}>{cleanUrl}:3333</span>
        </div>
      </div>

      {/* Connection Details */}
      <div className="ng-card">
        <div className="ng-section-title">Connection Details</div>
        <DataRow label="Mining Pool Address">
          <span className="ng-value ng-glow">{poolUrl}</span>
        </DataRow>
      </div>

      {/* Ports */}
      <div className="ng-card">
        <div className="ng-section-title">Mining Ports</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {poolData.stratumPorts.map((sp) => {
            const color = PORT_COLORS[sp.port] || '#10b981';
            return (
              <div
                key={sp.port}
                style={{
                  border: `1px solid ${color}30`,
                  borderRadius: 6,
                  padding: 16,
                  background: `${color}06`,
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Port
                  </span>
                  <div style={{ color, fontWeight: 700, fontSize: 24 }}>{sp.port}</div>
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                  Starting Difficulty:{' '}
                  <span style={{ color: '#e5e7eb', fontWeight: 700 }}>{formatNumber(sp.difficulty)}</span>
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{sp.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   TAB: Pool Status
   ================================================================ */
function PoolStatusTab() {
  const ps = poolData.poolStatus;
  const fm = ps.poolFeesMetrics;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Status */}
      <div className="ng-card">
        <div className="ng-section-title">Status</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ng-pulse-dot" />
          <span className="ng-value ng-glow" style={{ fontSize: 16 }}>
            Pool status: {poolNameAndUrl.poolName} is Active
          </span>
        </div>
      </div>

      {/* Stratum Ports */}
      <div className="ng-card">
        <div className="ng-section-title">Stratum Ports</div>
        {poolData.stratumPorts.map((sp) => (
          <div key={sp.port} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PortBadge port={sp.port} />
              <span style={{ color: '#9ca3af', fontSize: 13 }}>
                Minimum Shares Difficulty:{' '}
                <span style={{ color: '#e5e7eb', fontWeight: 700 }}>
                  {formatNumber(sp.difficulty)}
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Fees & Reward */}
      <div className="ng-card">
        <div className="ng-section-title">Fees & Rewards</div>
        <DataRow label="Avg Gas Price (GWei)">
          <span className="ng-value ng-glow">{fm.avgGasPriceGWei}</span>
        </DataRow>
        <DataRow label="Full Mining Reward">
          <span className="ng-value ng-glow">
            {Number.parseFloat(rawToFormatted(fm.miningRewardRaw, 18))} ETI
          </span>
        </DataRow>
        <DataRow label="Current ETI/EGAZ Ratio">
          <span style={{ color: '#e5e7eb' }}>
            {fm.token_Eth_Price_Ratio}{' '}
            <span style={{ color: '#6b7280', fontSize: 12 }}>
              (1 ETI for {(1 / fm.token_Eth_Price_Ratio).toFixed(2)} EGAZ)
            </span>
          </span>
        </DataRow>
        <DataRow label="Pool Base Fee Factor">
          <span className="ng-value ng-glow">{fm.poolBaseFee}</span>
        </DataRow>
        {fm.poolRewardsBonus > 0 && (
          <DataRow label="Pool Rewards Bonus">
            <span style={{ color: '#10b981', fontWeight: 700 }}>{fm.poolRewardsBonus}</span>
          </DataRow>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   TAB: Recent Transactions
   ================================================================ */
function RecentTransactionsTab() {
  return (
    <div className="ng-card" style={{ overflowX: 'auto' }}>
      <div className="ng-section-title">Recent Payments</div>
      {recentPaymentsBatched.length === 0 ? (
        <div style={{ color: '#6b7280', padding: 20, textAlign: 'center' }}>No recent transactions</div>
      ) : (
        <table className="ng-table">
          <thead>
            <tr>
              <th>Block</th>
              <th>Transaction Hash</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentPaymentsBatched.map((tx, i) => (
              <tr key={i}>
                <td>
                  <span className="ng-value ng-glow">{formatNumber(tx.block)}</span>
                </td>
                <td>
                  <a
                    className="ng-link"
                    href={`${ETICASCAN}tx/${tx.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12 }}
                  >
                    {truncateAddress(tx.txHash, 16)}
                  </a>
                </td>
                <td>
                  <span
                    style={{
                      color: tx.status === 'confirmed' ? '#10b981' : '#f59e0b',
                      fontWeight: 700,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function Overview() {
  const [activeTab, setActiveTab] = useState('Mining Data');

  return (
    <div className="neon-grid-root">
      {injectedStyles()}

      {/* Header */}
      <div style={{ padding: '32px 24px 0' }}>
        <Link
          to="/templates"
          style={{
            color: '#10b981',
            fontSize: 13,
            textDecoration: 'none',
            fontFamily: "'Space Mono', monospace",
            letterSpacing: 1,
          }}
        >
          &larr; Back to Templates
        </Link>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px 64px' }}>
        {/* Title */}
        <h1
          style={{
            color: '#fff',
            fontSize: 36,
            fontWeight: 700,
            fontFamily: "'Space Mono', monospace",
            marginBottom: 8,
          }}
        >
          Pool Overview
        </h1>
        <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 32, letterSpacing: 1 }}>
          {poolNameAndUrl.poolName} // {poolNameAndUrl.poolUrl}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 32 }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`ng-tab ${activeTab === tab ? 'ng-tab-active' : ''}`}
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
      </div>
    </div>
  );
}
