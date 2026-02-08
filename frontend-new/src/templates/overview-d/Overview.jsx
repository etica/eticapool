import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { poolData, poolNameAndUrl, formatNumber, truncateAddress, rawToFormatted, recentPaymentsBatched } from '../../mock-data';

const ETICASCAN = 'https://eticascan.org/';

const TABS = ['Mining Data', 'Getting Started', 'Pool Status', 'Recent Transactions'];

/* ── Tiny helpers ── */
function removeProtocol(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '');
}

function formatDifficulty(d) {
  return formatNumber(d);
}

/* ── Injected styles (font import + scrollbar) ── */
function InkwellStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
      .inkwell-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
      .inkwell-scroll::-webkit-scrollbar-track { background: #0f0f0f; }
      .inkwell-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
    `}</style>
  );
}

/* ── Reusable card container ── */
function Card({ children, style }) {
  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid #1a1a1a',
        borderRadius: 2,
        padding: '1.25rem',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Section title: white uppercase 11px with full-width bottom border ── */
function SectionTitle({ children }) {
  return (
    <div
      style={{
        color: '#ffffff',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        paddingBottom: '0.5rem',
        marginBottom: '0.75rem',
        borderBottom: '1px solid #1a1a1a',
      }}
    >
      {children}
    </div>
  );
}

/* ── Data row: label left, value right ── */
function DataRow({ label, value, valueColor, isLast, mono }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '0.5rem 0',
        borderBottom: isLast ? 'none' : '1px solid #141414',
        gap: '1rem',
      }}
    >
      <span style={{ color: '#737373', fontSize: 12, flexShrink: 0 }}>{label}</span>
      <span
        style={{
          color: valueColor || '#d4d4d4',
          fontSize: 12,
          textAlign: 'right',
          wordBreak: 'break-all',
          fontFamily: mono ? "'Space Mono', monospace" : 'inherit',
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB 1 — Mining Data
   ════════════════════════════════════════════════════ */
function MiningDataTab() {
  const { miningContract, poolStatus, ethBlockNumber, minBalanceForPayment } = poolData;
  const mintBal = poolStatus.mintingAccountBalances;
  const payBal = poolStatus.paymentsAccountBalances;

  return (
    <div>
      {/* Active status */}
      {poolStatus.poolFeesMetrics.poolRewardsBonus > 0 && (
        <div style={{ color: '#22c55e', fontSize: 12, marginBottom: '1rem' }}>
          Bonus Activated: +{poolStatus.poolFeesMetrics.poolRewardsBonus * 100}% on all mining rewards
        </div>
      )}

      {/* Two side-by-side cards: Minting + Payments */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* Minting Account */}
        <Card>
          <SectionTitle>Minting Account</SectionTitle>
          <DataRow
            label="Address"
            value={
              <a
                href={ETICASCAN + 'address/' + poolData.mintingAddress}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#d4d4d4', textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                {truncateAddress(poolData.mintingAddress, 10)}
              </a>
            }
          />
          <DataRow label="Network" value={poolData.mintingNetwork} />
          <DataRow
            label="EGAZ Balance"
            value={rawToFormatted(mintBal.ETH, 18) + ' EGAZ'}
            valueColor="#22c55e"
          />
          <DataRow
            label="ETI Balance"
            value={rawToFormatted(mintBal.token, 18) + ' ETI'}
            valueColor="#22c55e"
            isLast
          />
          <div style={{ color: '#525252', fontSize: 11, marginTop: '0.5rem', fontStyle: 'italic' }}>
            ETI mined are immediately sent to reward process
          </div>
        </Card>

        {/* Payments Account */}
        <Card>
          <SectionTitle>Payments Account</SectionTitle>
          <DataRow
            label="Address"
            value={
              <a
                href={ETICASCAN + 'address/' + poolData.paymentsAddress}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#d4d4d4', textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                {truncateAddress(poolData.paymentsAddress, 10)}
              </a>
            }
          />
          <DataRow label="Network" value={poolData.paymentsNetwork} />
          <DataRow
            label="EGAZ Balance"
            value={rawToFormatted(payBal.ETH, 18) + ' EGAZ'}
            valueColor="#22c55e"
          />
          <DataRow
            label="Batched Payments Contract"
            value={
              <a
                href={ETICASCAN + 'address/' + poolData.batchedPaymentsContractAddress}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#d4d4d4', textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                {truncateAddress(poolData.batchedPaymentsContractAddress, 10)}
              </a>
            }
          />
          <DataRow
            label="Pool Balance"
            value={rawToFormatted(payBal.token, 18) + ' ETI'}
            valueColor="#22c55e"
            isLast
          />
        </Card>
      </div>

      {/* Block + Payment Info */}
      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Block &amp; Payment Info</SectionTitle>
        <DataRow label="Last Known Block Number" value={formatNumber(ethBlockNumber)} />
        <DataRow
          label="Minimum User Balance For Payment"
          value={rawToFormatted(minBalanceForPayment, 18) + ' ETI'}
          valueColor="#22c55e"
        />
        <DataRow
          label="Low Balance Payments"
          value={'Every 24h for balances between 0.01 ETI and ' + rawToFormatted(minBalanceForPayment, 18) + ' ETI'}
          valueColor="#525252"
          isLast
        />
      </Card>

      {/* Mining Contract Data */}
      <Card>
        <SectionTitle>Mining Contract Data</SectionTitle>
        <DataRow
          label="RandomX Blob"
          value={
            <span style={{ fontSize: 10, color: '#a4ff03', wordBreak: 'break-all' }}>
              {miningContract.randomxBlob}
            </span>
          }
        />
        <DataRow
          label="RandomX Seedhash"
          value={
            <span style={{ fontSize: 11, color: '#067737' }}>
              {miningContract.randomxSeedhash}
            </span>
          }
        />
        <DataRow label="Challenge Number" value={miningContract.challengeNumber} mono />
        <DataRow label="Epoch Count" value={formatNumber(miningContract.epochCount)} />
        <DataRow
          label="Mining Difficulty"
          value={formatDifficulty(miningContract.miningDifficulty)}
          isLast
        />
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB 2 — Getting Started
   ════════════════════════════════════════════════════ */
function GettingStartedTab() {
  const ports = poolData.stratumPorts;

  return (
    <div>
      {/* Miner Software */}
      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Miner Software</SectionTitle>
        <DataRow
          label="XMRig"
          value={
            <a href="https://xmrig.com/" target="_blank" rel="noreferrer" style={{ color: '#d4d4d4', textDecoration: 'underline', textUnderlineOffset: 2 }}>
              https://xmrig.com/
            </a>
          }
        />
        <DataRow
          label="SRBMiner"
          value={
            <a href="https://github.com/doktor83/SRBMiner-Multi/releases" target="_blank" rel="noreferrer" style={{ color: '#d4d4d4', textDecoration: 'underline', textUnderlineOffset: 2 }}>
              github.com/doktor83/SRBMiner-Multi
            </a>
          }
          isLast
        />
      </Card>

      {/* Instructions */}
      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Instructions</SectionTitle>
        <div style={{ color: '#737373', fontSize: 12, lineHeight: 1.6 }}>
          Use same settings as Monero. Replace address with your Etica address. Enter pool URL with mining port.
        </div>
        <div style={{ color: '#d4d4d4', fontSize: 12, marginTop: '0.5rem', fontFamily: "'Space Mono', monospace" }}>
          Example: {removeProtocol(poolNameAndUrl.poolUrl)}:3333
        </div>
      </Card>

      {/* Connection Details */}
      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Connection Details</SectionTitle>
        <DataRow
          label="Mining Pool Address"
          value={poolNameAndUrl.poolUrl}
          isLast
        />
      </Card>

      {/* Ports Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {ports.map((p, i) => (
          <Card key={p.port}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ color: '#ffffff', fontSize: 20, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
                :{p.port}
              </span>
              <span style={{ color: '#525252', fontSize: 11, textTransform: 'uppercase' }}>{p.label}</span>
            </div>
            <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '0.5rem' }}>
              <DataRow
                label="Starting Difficulty"
                value={formatNumber(p.difficulty)}
                isLast
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB 3 — Pool Status
   ════════════════════════════════════════════════════ */
function PoolStatusTab() {
  const { poolStatus: status, stratumPorts } = poolData;
  const fees = status.poolFeesMetrics;

  return (
    <div>
      {/* Status */}
      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Status</SectionTitle>
        <DataRow
          label="Pool"
          value={
            <span>
              <span style={{ color: '#22c55e' }}>{poolNameAndUrl.poolName}</span>
              <span style={{ color: '#525252' }}> — Active</span>
            </span>
          }
          isLast
        />
      </Card>

      {/* Stratum Ports */}
      <Card style={{ marginBottom: '1rem' }}>
        <SectionTitle>Stratum Ports</SectionTitle>
        {stratumPorts.map((p, i) => (
          <DataRow
            key={p.port}
            label={'Port ' + p.port}
            value={'Min Difficulty: ' + formatNumber(p.difficulty)}
            isLast={i === stratumPorts.length - 1}
          />
        ))}
      </Card>

      {/* Fee & Reward Metrics */}
      <Card>
        <SectionTitle>Fee &amp; Reward Metrics</SectionTitle>
        <DataRow
          label="Avg Gas Price"
          value={fees.avgGasPriceGWei + ' GWei'}
          valueColor="#ef4444"
        />
        <DataRow
          label="Full Mining Reward"
          value={parseFloat(rawToFormatted(fees.miningRewardRaw, 18)) + ' ETI'}
          valueColor="#22c55e"
        />
        <DataRow
          label="ETI/EGAZ Ratio"
          value={'1 ETI = ' + (1 / fees.token_Eth_Price_Ratio).toFixed(2) + ' EGAZ'}
        />
        <DataRow
          label="Pool Base Fee"
          value={fees.poolBaseFee}
          valueColor="#ef4444"
        />
        <DataRow
          label="Pool Rewards Bonus"
          value={fees.poolRewardsBonus > 0 ? '+' + (fees.poolRewardsBonus * 100) + '%' : 'None'}
          valueColor={fees.poolRewardsBonus > 0 ? '#22c55e' : '#525252'}
          isLast
        />
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB 4 — Recent Transactions
   ════════════════════════════════════════════════════ */
function RecentTransactionsTab() {
  return (
    <Card>
      <SectionTitle>Recent Payments</SectionTitle>
      <div className="inkwell-scroll" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0f0f0f' }}>
              <th style={thStyle}>Block</th>
              <th style={thStyle}>TxHash</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentPaymentsBatched.map((tx, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: '1px solid #141414',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#141414'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <td style={tdStyle}>{formatNumber(tx.block)}</td>
                <td style={tdStyle}>
                  <a
                    href={ETICASCAN + 'tx/' + tx.txHash}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#d4d4d4', textDecoration: 'underline', textUnderlineOffset: 2 }}
                  >
                    {truncateAddress(tx.txHash, 12)}
                  </a>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <span
                    style={{
                      color: tx.status === 'confirmed' ? '#22c55e' : '#f59e0b',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const thStyle = {
  textAlign: 'left',
  padding: '0.6rem 0.75rem',
  color: '#525252',
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '1px solid #1a1a1a',
};

const tdStyle = {
  padding: '0.55rem 0.75rem',
  color: '#d4d4d4',
  fontSize: 12,
  fontFamily: "'Space Mono', monospace",
};

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════ */
export default function Overview() {
  const [activeTab, setActiveTab] = useState('Mining Data');

  return (
    <div
      style={{
        background: '#080808',
        color: '#d4d4d4',
        minHeight: '100vh',
        fontFamily: "'Space Mono', monospace",
        fontSize: 13,
      }}
    >
      <InkwellStyles />

      {/* ── Header ── */}
      <header
        style={{
          padding: '1.5rem 2.5rem',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to="/templates"
            style={{
              color: '#525252',
              fontSize: 11,
              textDecoration: 'none',
              marginRight: '1rem',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { e.target.style.color = '#d4d4d4'; }}
            onMouseLeave={(e) => { e.target.style.color = '#525252'; }}
          >
            &larr; Templates
          </Link>
          <span style={{ color: '#ffffff', fontSize: 15, fontWeight: 700, letterSpacing: '0.06em' }}>
            ETICA POOL
          </span>
          <span style={{ color: '#525252', fontSize: 11, marginLeft: '0.25rem' }}>OVERVIEW</span>
        </div>

        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ color: '#525252', fontSize: 11 }}>ACTIVE</span>
        </div>
      </header>

      {/* ── Page title ── */}
      <div style={{ padding: '2rem 2.5rem 0' }}>
        <h1
          style={{
            color: '#ffffff',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            margin: 0,
            marginBottom: '1.5rem',
          }}
        >
          Pool Overview
        </h1>

        {/* ── Tab bar (VIG-style bordered buttons) ── */}
        <div
          style={{
            display: 'inline-flex',
            border: '1px solid #d4d4d4',
            marginBottom: '2rem',
          }}
        >
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.45rem 1.25rem',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'Space Mono', monospace",
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                border: 'none',
                borderLeft: i > 0 ? '1px solid #d4d4d4' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === tab ? '#ffffff' : 'transparent',
                color: activeTab === tab ? '#080808' : '#d4d4d4',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab) e.target.style.background = 'rgba(212,212,212,0.08)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) e.target.style.background = 'transparent';
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding: '0 2.5rem 3rem' }}>
        {activeTab === 'Mining Data' && <MiningDataTab />}
        {activeTab === 'Getting Started' && <GettingStartedTab />}
        {activeTab === 'Pool Status' && <PoolStatusTab />}
        {activeTab === 'Recent Transactions' && <RecentTransactionsTab />}
      </div>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: '1px solid #1a1a1a',
          padding: '1.25rem 2.5rem',
          textAlign: 'center',
          color: '#333',
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Etica &middot; RandomX PoW &middot; Science knows no country because knowledge belongs to Humanity
      </footer>
    </div>
  );
}
