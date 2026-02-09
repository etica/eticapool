import React, { useState } from 'react';
import { poolData, poolNameAndUrl, formatNumber, truncateAddress, rawToFormatted, recentPaymentsBatched } from '../../mock-data';

const EXPLORER = 'https://eticascan.org/';

const tabs = ['Mining Data', 'Getting Started', 'Pool Status', 'Recent Transactions'];

/* ── Plus marker SVG ── */
function Plus() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M7 1V13M1 7H13" stroke="#ffffff" strokeWidth="1" strokeLinecap="square" />
    </svg>
  );
}

/* ── Data Row ── */
function DataRow({ label, value, accent, mono, children, even }) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      alignItems: 'baseline',
      padding: '0.55rem 1rem',
      background: even ? '#181818' : '#111111',
      borderBottom: '1px solid #1a1a1a',
    }}>
      <span style={{ color: '#a3a3a3', fontSize: 13, minWidth: 200 }}>{label}</span>
      {children || (
        <span style={{
          color: accent ? '#2563eb' : '#ffffff',
          fontSize: 13,
          fontFamily: mono ? "'Space Mono', monospace" : 'inherit',
          wordBreak: 'break-all',
        }}>
          {value}
        </span>
      )}
    </div>
  );
}

/* ── Section Card ── */
function Section({ title, children }) {
  return (
    <div style={{
      border: '1px solid #2a2a2a',
      background: '#181818',
      marginBottom: '1.5rem',
    }}>
      {title && (
        <div style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #2a2a2a',
          background: '#1a1a1a',
        }}>
          <span style={{ color: '#ffffff', fontSize: 14, fontWeight: 600, letterSpacing: '0.04em' }}>{title}</span>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

/* ── Link helper ── */
function ELink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', wordBreak: 'break-all' }}>
      {children}
    </a>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB: Mining Data
   ════════════════════════════════════════════════════════════════════ */
function MiningDataTab() {
  const { poolStatus, miningContract } = poolData;
  const mintBal = poolStatus.mintingAccountBalances;
  const payBal = poolStatus.paymentsAccountBalances;

  return (
    <>
      {/* Pool Active */}
      <Section title="POOL STATUS">
        <DataRow label="Status" even>
          <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>{poolNameAndUrl.poolName} is Active</span>
        </DataRow>
      </Section>

      {/* Minting Account */}
      <Section title="MINTING ACCOUNT">
        <DataRow label="Address" even>
          <ELink href={EXPLORER + 'address/' + poolData.mintingAddress}>{poolData.mintingAddress}</ELink>
        </DataRow>
        <DataRow label="Network" value={poolData.mintingNetwork} />
        <DataRow label="Balance EGAZ" value={rawToFormatted(mintBal.ETH, 18) + ' EGAZ'} accent even />
        <DataRow label="Balance ETI" value={rawToFormatted(mintBal.token, 18) + ' ETI'} accent />
      </Section>

      {/* Payments Account */}
      <Section title="PAYMENTS ACCOUNT">
        <DataRow label="Address" even>
          <ELink href={EXPLORER + 'address/' + poolData.paymentsAddress}>{poolData.paymentsAddress}</ELink>
        </DataRow>
        <DataRow label="Network" value={poolData.paymentsNetwork} />
        <DataRow label="Balance EGAZ" value={rawToFormatted(payBal.ETH, 18) + ' EGAZ'} accent even />
        <DataRow label="Batched Payments Contract" even={false}>
          <ELink href={EXPLORER + 'address/' + poolData.batchedPaymentsContractAddress}>
            {poolData.batchedPaymentsContractAddress}
          </ELink>
        </DataRow>
        <DataRow label="Pool Balance ETI" value={rawToFormatted(payBal.token, 18) + ' ETI'} accent even />
      </Section>

      {/* Block / Payment Info */}
      <Section title="BLOCK INFO">
        <DataRow label="Last Known Block Number" value={formatNumber(poolData.ethBlockNumber)} accent even />
        <DataRow label="Min Balance For Payment" value={rawToFormatted(poolData.minBalanceForPayment, 18) + ' ETI'} accent />
        <DataRow label="Low Balance Payments" even>
          <span style={{ color: '#525252', fontSize: 12, fontStyle: 'italic' }}>
            Every 24h for balances between 0.01 ETI and {rawToFormatted(poolData.minBalanceForPayment, 18)} ETI
          </span>
        </DataRow>
      </Section>

      {/* Mining Contract */}
      <Section title="MINING CONTRACT">
        <DataRow label="RandomX Blob" even>
          <span style={{ color: '#a3e635', fontSize: 11, fontFamily: "'Space Mono', monospace", wordBreak: 'break-all', lineHeight: 1.6 }}>
            {miningContract.randomxBlob}
          </span>
        </DataRow>
        <DataRow label="Seedhash">
          <span style={{ color: '#166534', fontSize: 12, fontFamily: "'Space Mono', monospace", wordBreak: 'break-all' }}>
            {miningContract.randomxSeedhash}
          </span>
        </DataRow>
        <DataRow label="Challenge Number" value={miningContract.challengeNumber} mono even />
        <DataRow label="Epoch Count" value={formatNumber(miningContract.epochCount)} accent />
        <div style={{ borderTop: '1px solid #2a2a2a', padding: '0.4rem 1rem', background: '#1a1a1a' }}>
          <span style={{ color: '#a3a3a3', fontSize: 12, textDecoration: 'underline' }}>Blockchain Difficulty</span>
        </div>
        <DataRow label="Current ETI Mining Difficulty" value={formatNumber(miningContract.miningDifficulty)} accent even />
      </Section>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB: Getting Started
   ════════════════════════════════════════════════════════════════════ */
function GettingStartedTab() {
  const poolUrl = poolNameAndUrl.poolUrl;
  const poolUrlClean = poolUrl.replace(/^https?:\/\//, '');

  return (
    <>
      <Section title="MINERS">
        <DataRow label="XMRig" even>
          <ELink href="https://xmrig.com/">https://xmrig.com/</ELink>
        </DataRow>
        <DataRow label="SRBMiner">
          <ELink href="https://github.com/doktor83/SRBMiner-Multi/releases">https://github.com/doktor83/SRBMiner-Multi/releases</ELink>
        </DataRow>
      </Section>

      <Section title="INSTRUCTIONS">
        <div style={{ padding: '1rem', color: '#a3a3a3', fontSize: 13, lineHeight: 1.8 }}>
          <span style={{ fontStyle: 'italic' }}>
            Use same settings as Monero. Replace address with Etica address.
            Enter pool url with mining port. Example: <span style={{ color: '#ffffff' }}>{poolUrlClean}:3333</span>
          </span>
        </div>
      </Section>

      <Section title="CONNECTION DETAILS">
        <DataRow label="Mining Pool Address" even>
          <span style={{ color: '#ffffff', fontSize: 13 }}>{poolUrl}</span>
        </DataRow>
      </Section>

      <Section title="MINING PORTS">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 0 }}>
          {poolData.stratumPorts.map((p, i) => (
            <div key={p.port} style={{
              padding: '1rem',
              borderRight: '1px solid #2a2a2a',
              borderBottom: '1px solid #2a2a2a',
              background: i % 2 === 0 ? '#181818' : '#111111',
            }}>
              <div style={{ color: '#2563eb', fontSize: 20, fontWeight: 700, fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>
                {p.port}
              </div>
              <div style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 2 }}>
                Difficulty: <span style={{ color: '#ffffff' }}>{formatNumber(p.difficulty)}</span>
              </div>
              <div style={{ color: '#525252', fontSize: 11 }}>{p.label}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB: Pool Status
   ════════════════════════════════════════════════════════════════════ */
function PoolStatusTab() {
  const { poolStatus } = poolData;
  const fees = poolStatus.poolFeesMetrics;

  return (
    <>
      <Section title="POOL STATUS">
        <DataRow label="Status" even>
          <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 13 }}>{poolNameAndUrl.poolName} is Active</span>
        </DataRow>
      </Section>

      <Section title="STRATUM PORTS">
        {poolData.stratumPorts.map((p, i) => (
          <DataRow key={p.port} label={'Port ' + p.port} value={'Min Difficulty: ' + formatNumber(p.difficulty)} even={i % 2 === 0} />
        ))}
      </Section>

      <Section title="FEES & REWARDS">
        <DataRow label="Avg Gas Price" value={fees.avgGasPriceGWei + ' GWei'} even />
        <DataRow label="Full Mining Reward" value={parseFloat(rawToFormatted(fees.miningRewardRaw, 18)) + ' ETI'} accent />
        <DataRow label="ETI/EGAZ Ratio" even>
          <span style={{ color: '#ffffff', fontSize: 13 }}>
            {fees.token_Eth_Price_Ratio} <span style={{ color: '#525252' }}>(1 ETI = {(1 / fees.token_Eth_Price_Ratio).toFixed(2)} EGAZ)</span>
          </span>
        </DataRow>
        <DataRow label="Pool Base Fee" value={fees.poolBaseFee} />
        {fees.poolRewardsBonus > 0 && (
          <DataRow label="Rewards Bonus" value={'+' + (fees.poolRewardsBonus * 100) + '%'} accent even />
        )}
      </Section>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB: Recent Transactions
   ════════════════════════════════════════════════════════════════════ */
function RecentTransactionsTab() {
  return (
    <Section title="RECENT PAYMENTS">
      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr 120px',
        padding: '0.6rem 1rem',
        background: '#1a1a1a',
        borderBottom: '1px solid #2a2a2a',
      }}>
        <span style={{ color: '#525252', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }}>BLOCK</span>
        <span style={{ color: '#525252', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }}>TX HASH</span>
        <span style={{ color: '#525252', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textAlign: 'right' }}>STATUS</span>
      </div>
      {/* Table rows */}
      {recentPaymentsBatched.map((tx, i) => (
        <div key={i} style={{
          display: 'grid',
          gridTemplateColumns: '100px 1fr 120px',
          padding: '0.55rem 1rem',
          background: i % 2 === 0 ? '#181818' : '#111111',
          borderBottom: '1px solid #1a1a1a',
          alignItems: 'center',
        }}>
          <span style={{ color: '#a3a3a3', fontSize: 13, fontFamily: "'Space Mono', monospace" }}>
            {formatNumber(tx.block)}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <ELink href={EXPLORER + 'tx/' + tx.txHash}>
              {truncateAddress(tx.txHash, 16)}
            </ELink>
          </span>
          <span style={{
            textAlign: 'right',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: tx.status === 'confirmed' ? '#22c55e' : '#eab308',
          }}>
            {tx.status.toUpperCase()}
          </span>
        </div>
      ))}
    </Section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════ */
export default function OverviewB() {
  const [activeTab, setActiveTab] = useState('Mining Data');

  return (
    <div style={{
      background: '#111111',
      color: '#ffffff',
      minHeight: '100vh',
      fontFamily: "'Space Mono', monospace",
    }}>
      {/* Google Font */}
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        a:hover { text-decoration: underline !important; }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid #2a2a2a',
        padding: '1.25rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/images/eti-logo.png" alt="ETI" style={{ width: 28, height: 28 }} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.08em', color: '#ffffff' }}>
            ETICA POOL
          </span>
        </div>
        <a href="/templates" style={{ color: '#525252', fontSize: 12, textDecoration: 'none', letterSpacing: '0.04em' }}>
          &larr; BACK
        </a>
      </header>

      {/* ── Content ── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>

        {/* Page Title */}
        <h1 style={{
          fontSize: 32,
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '0.02em',
          marginBottom: '2rem',
        }}>
          Pool Overview
        </h1>

        {/* ── Tab Bar — VIG-style bordered rectangles ── */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '0.75rem 0' }}>
          <Plus />
          <div style={{ display: 'flex', border: '1px solid #ffffff', marginLeft: 8, marginRight: 8 }}>
            {tabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.45rem 1.1rem',
                  fontSize: 12,
                  fontWeight: activeTab === tab ? 700 : 400,
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: '0.04em',
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid #ffffff' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                  background: activeTab === tab ? '#ffffff' : 'transparent',
                  color: activeTab === tab ? '#111111' : '#ffffff',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <Plus />
        </div>

        {/* ── Active Tab Content ── */}
        {activeTab === 'Mining Data' && <MiningDataTab />}
        {activeTab === 'Getting Started' && <GettingStartedTab />}
        {activeTab === 'Pool Status' && <PoolStatusTab />}
        {activeTab === 'Recent Transactions' && <RecentTransactionsTab />}
      </div>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid #2a2a2a',
        padding: '1.5rem 2rem',
        textAlign: 'center',
      }}>
        <span style={{ color: '#525252', fontSize: 11, letterSpacing: '0.06em' }}>
          ETICA POOL &middot; RANDOMX POW &middot; SCIENCE KNOWS NO COUNTRY
        </span>
      </footer>
    </div>
  );
}
