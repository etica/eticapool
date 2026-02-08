import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { poolData, poolNameAndUrl, formatNumber, truncateAddress, rawToFormatted, recentPaymentsBatched } from '../../mock-data';

const TABS = ['Mining Data', 'Getting Started', 'Pool Status', 'Recent Transactions'];

const EXPLORER = 'https://eticascan.org/';

function removeProtocol(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '');
}

/* ── Shared inline styles ── */
const s = {
  page: {
    background: '#000000',
    color: '#d4d4d4',
    minHeight: '100vh',
    fontFamily: "'Space Mono', monospace",
    fontSize: 14,
    lineHeight: 1.7,
  },
  container: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  backLink: {
    color: '#06b6d4',
    textDecoration: 'none',
    fontSize: 12,
    letterSpacing: '0.04em',
  },
  title: {
    color: '#d4d4d4',
    fontSize: 32,
    fontWeight: 400,
    margin: '1.5rem 0 1.25rem',
    fontFamily: "'Space Mono', monospace",
  },
  tabBar: {
    display: 'flex',
    flexWrap: 'wrap',
    marginBottom: '2rem',
  },
  tab: (active) => ({
    padding: '0.45rem 1.1rem',
    fontSize: 12,
    fontFamily: "'Space Mono', monospace",
    letterSpacing: '0.03em',
    border: '1px solid #d4d4d4',
    marginLeft: -1,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
    background: active ? '#22c55e' : 'transparent',
    color: active ? '#000000' : '#d4d4d4',
  }),
  separator: {
    height: 1,
    background: '#1c1c1c',
    margin: '1rem 0',
  },
  sectionTitle: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginBottom: '0.5rem',
    marginTop: '1.5rem',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '0.3rem 0',
    borderBottom: '1px solid #1c1c1c',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  label: {
    color: '#a0a0a0',
    fontSize: 13,
    flexShrink: 0,
  },
  value: {
    color: '#d4d4d4',
    fontSize: 13,
    textAlign: 'right',
    wordBreak: 'break-all',
  },
  greenValue: {
    color: '#22c55e',
    fontSize: 13,
    textAlign: 'right',
    wordBreak: 'break-all',
  },
  cyanLink: {
    color: '#06b6d4',
    textDecoration: 'none',
  },
  smallGreen: {
    color: 'rgb(164, 255, 3)',
    fontSize: 11,
    wordBreak: 'break-all',
    lineHeight: 1.5,
  },
  note: {
    color: '#868585',
    fontSize: 12,
    fontStyle: 'italic',
  },
  portCard: {
    border: '1px solid #2a2a2a',
    padding: '0.75rem 1rem',
    flex: '1 1 200px',
    minWidth: 180,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    textAlign: 'left',
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid #2a2a2a',
    color: '#22c55e',
    fontSize: 11,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  td: {
    padding: '0.45rem 0.75rem',
    borderBottom: '1px solid #141414',
    color: '#d4d4d4',
  },
};

function Row({ label, children, green }) {
  return (
    <div style={s.row}>
      <span style={s.label}>{label}</span>
      <span style={green ? s.greenValue : s.value}>{children}</span>
    </div>
  );
}

function Separator() {
  return <div style={s.separator} />;
}

/* ══════════ TAB: Mining Data ══════════ */
function MiningDataTab() {
  const { poolStatus, miningContract } = poolData;
  const mintBal = poolStatus.mintingAccountBalances;
  const payBal = poolStatus.paymentsAccountBalances;
  const bonus = poolStatus.poolFeesMetrics.poolRewardsBonus;

  return (
    <div>
      {/* Pool active status */}
      <div style={{ color: '#22c55e', marginBottom: '0.25rem' }}>
        {poolNameAndUrl.poolName} is Active
        {bonus > 0 && (
          <span style={{ color: '#04ffab' }}>
            {' '}(Bonus Activated: +{bonus * 100}% on all mining rewards)
          </span>
        )}
      </div>

      {/* Minting Account */}
      <div style={s.sectionTitle}>Minting Account</div>
      <Row label="Address">
        <a style={s.cyanLink} href={EXPLORER + 'address/' + poolData.mintingAddress} target="_blank" rel="noreferrer">
          {poolData.mintingAddress}
        </a>
      </Row>
      <Row label="Network">{poolData.mintingNetwork}</Row>
      <Row label="EGAZ Balance" green>{rawToFormatted(mintBal.ETH, 18)} EGAZ</Row>
      <Row label="ETI Balance" green>{rawToFormatted(mintBal.token, 18)} ETI</Row>
      <div style={s.note}>(ETI mined are immediately sent to reward process)</div>

      <Separator />

      {/* Payments Account */}
      <div style={s.sectionTitle}>Payments Account</div>
      <Row label="Address">
        <a style={s.cyanLink} href={EXPLORER + 'address/' + poolData.paymentsAddress} target="_blank" rel="noreferrer">
          {poolData.paymentsAddress}
        </a>
      </Row>
      <Row label="Network">{poolData.paymentsNetwork}</Row>
      <Row label="EGAZ Balance" green>{rawToFormatted(payBal.ETH, 18)} EGAZ</Row>
      <Row label="Batched Payments Contract">
        <a style={s.cyanLink} href={EXPLORER + 'address/' + poolData.batchedPaymentsContractAddress} target="_blank" rel="noreferrer">
          {poolData.batchedPaymentsContractAddress}
        </a>
      </Row>
      <Row label="Mining Pool Balance ETI" green>{rawToFormatted(payBal.token, 18)} ETI</Row>

      <Separator />

      {/* Block & Payment info */}
      <Row label="Last Known Block Number">{formatNumber(poolData.ethBlockNumber)}</Row>
      <Row label="Minimum User Balance For Payment" green>{rawToFormatted(poolData.minBalanceForPayment, 18)} ETI</Row>
      <div style={s.note}>
        Low Balance Payments: every 24 hours for balances between <b>0.01 ETI</b> and <b>{rawToFormatted(poolData.minBalanceForPayment, 18)} ETI</b>
      </div>

      <Separator />

      {/* Mining Contract Data */}
      <div style={s.sectionTitle}>Mining Contract Data</div>
      <div style={{ ...s.row, flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={s.label}>Current Network RandomX Blob:</span>
        <span style={s.smallGreen}>{miningContract.randomxBlob}</span>
      </div>
      <Row label="Seedhash">
        <span style={{ color: 'rgb(6, 119, 55)' }}>{miningContract.randomxSeedhash}</span>
      </Row>
      <Row label="Challenge Number">{miningContract.challengeNumber}</Row>
      <Row label="epochCount" green>{formatNumber(miningContract.epochCount)}</Row>
      <Row label="Mining Difficulty" green>{formatNumber(miningContract.miningDifficulty)}</Row>
    </div>
  );
}

/* ══════════ TAB: Getting Started ══════════ */
function GettingStartedTab() {
  const ports = poolData.stratumPorts;

  return (
    <div>
      <div style={s.sectionTitle}>Miners</div>
      <Row label="XMRig">
        <a style={s.cyanLink} href="https://xmrig.com/" target="_blank" rel="noreferrer">https://xmrig.com/</a>
      </Row>
      <Row label="SRBMiner">
        <a style={s.cyanLink} href="https://github.com/doktor83/SRBMiner-Multi/releases" target="_blank" rel="noreferrer">https://github.com/doktor83/SRBMiner-Multi/releases</a>
      </Row>

      <Separator />

      <div style={s.note}>
        Instructions: Use same settings as Monero. Replace address with Etica address. Enter pool URL with mining port. Example: {removeProtocol(poolNameAndUrl.poolUrl)}:3333
      </div>

      <Separator />

      <div style={{ ...s.sectionTitle, fontSize: 18, fontWeight: 400, textTransform: 'none' }}>Connection Details</div>

      <Row label="Mining Pool Address">
        <span style={{ color: '#b3b3b3' }}>{poolNameAndUrl.poolUrl}</span>
      </Row>

      <Separator />

      <div style={{ ...s.sectionTitle, marginBottom: '0.75rem' }}>Mining Ports</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
        {ports.map((p, i) => (
          <div key={p.port} style={{ ...s.portCard, borderLeft: i === 0 ? '1px solid #2a2a2a' : 'none' }}>
            <div style={{ color: '#22c55e', fontSize: 15, fontWeight: 700 }}>Port {p.port}</div>
            <div style={{ color: '#a0a0a0', fontSize: 12 }}>Starting Difficulty: <span style={{ color: '#22c55e' }}>{formatNumber(p.difficulty)}</span></div>
            <div style={{ color: '#d4d4d4', fontSize: 12 }}>{p.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════ TAB: Pool Status ══════════ */
function PoolStatusTab() {
  const { poolStatus, stratumPorts } = poolData;
  const fees = poolStatus.poolFeesMetrics;

  return (
    <div>
      <div style={{ color: '#22c55e', marginBottom: '1rem' }}>
        Pool Status: {poolNameAndUrl.poolName} is Active
      </div>

      <div style={s.sectionTitle}>Stratum Ports</div>
      {stratumPorts.map((p) => (
        <Row key={p.port} label={`Port ${p.port}`}>
          Minimum Share Difficulty: <span style={{ color: '#22c55e' }}>{formatNumber(p.difficulty)}</span>
        </Row>
      ))}

      <Separator />

      <Row label="avgGasPriceGWei" green>{fees.avgGasPriceGWei}</Row>
      <Row label="Full Mining Reward" green>
        {Number.parseFloat(rawToFormatted(fees.miningRewardRaw, 18))} ETI
      </Row>
      <Row label="Current ETI/EGAZ ratio">
        {fees.token_Eth_Price_Ratio} (1 ETI for {(1 / fees.token_Eth_Price_Ratio).toFixed(4)} EGAZ)
      </Row>
      <Row label="poolBaseFeeFactor">{fees.poolBaseFee}</Row>
      {fees.poolRewardsBonus > 0 && (
        <Row label="Rewards Bonus" green>{fees.poolRewardsBonus}</Row>
      )}
    </div>
  );
}

/* ══════════ TAB: Recent Transactions ══════════ */
function RecentTransactionsTab() {
  return (
    <div>
      <div style={s.sectionTitle}>Recent Payments</div>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Block</th>
            <th style={s.th}>TxHash</th>
            <th style={s.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {recentPaymentsBatched.map((tx, i) => (
            <tr key={i}>
              <td style={s.td}>{formatNumber(tx.block)}</td>
              <td style={s.td}>
                <a style={s.cyanLink} href={EXPLORER + 'tx/' + tx.txHash} target="_blank" rel="noreferrer">
                  {truncateAddress(tx.txHash, 10)}
                </a>
              </td>
              <td style={{
                ...s.td,
                color: tx.status === 'confirmed' ? '#22c55e' : '#f59e0b',
              }}>
                {tx.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════ MAIN COMPONENT ══════════ */
export default function Overview() {
  const [activeTab, setActiveTab] = useState('Mining Data');

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Back link */}
        <Link to="/templates" style={s.backLink}>&larr; Back to Templates</Link>

        {/* Title */}
        <h1 style={s.title}>Pool Overview</h1>

        {/* Tab bar */}
        <div style={s.tabBar}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...s.tab(activeTab === tab),
                ...(i === 0 ? { marginLeft: 0 } : {}),
              }}
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
