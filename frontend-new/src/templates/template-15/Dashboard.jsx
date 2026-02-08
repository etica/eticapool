import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { poolData, poolNameAndUrl, formatHashrate, timeAgo, formatNumber, truncateAddress, rawToFormatted } from '../../mock-data';
import './styles.css';

/* ═══════════════════════════════════════════════════════════════
   Axiom — Near-Black + White Headers + Violet/Indigo Metrics
   Template 15 for Etica Mining Pool
   ═══════════════════════════════════════════════════════════════ */

/* ---------- Section Header ---------- */
function SectionHeader({ children }) {
  return <h2 className="ax-section-header ax-visible">{children}</h2>;
}

/* ---------- Stat Card ---------- */
function StatCard({ label, value, violet = false, secondary = false }) {
  const cls = violet ? 'ax-metric' : secondary ? 'ax-metric ax-metric--secondary' : 'ax-metric ax-metric--white';
  return (
    <div className="ax-card">
      <div className="ax-label">{label}</div>
      <div className={cls}>{value}</div>
    </div>
  );
}

/* ---------- Header Bar ---------- */
function HeaderBar() {
  const isActive = poolData.poolStatus.poolStatus === 'active';

  return (
    <header className="ax-header-bar">
      <div className="ax-container">
        <div className="ax-header-inner">
          <div className="ax-header-left">
            <img src="/images/eti-logo.png" alt="ETI" className="ax-header-logo" />
            <span className="ax-header-pool-name">
              <span className="ax-violet-accent">Etica</span> Mining Pool
            </span>
            {isActive && (
              <span className="ax-status-badge ax-status-badge--active">Active</span>
            )}
          </div>
          <div className="ax-header-right">
            <span className="ax-live-dot">Live</span>
            <Link to="/" className="ax-back-link">
              &larr; Back
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- Pool Stats Grid ---------- */
function PoolStatsGrid() {
  const { pool } = poolData;

  return (
    <section>
      <SectionHeader>Pool Statistics</SectionHeader>
      <div className="ax-grid-2x3">
        <StatCard label="Hashrate" value={formatHashrate(pool.hashrate)} violet />
        <StatCard label="24h Average" value={formatHashrate(pool.hashrate24h)} secondary />
        <StatCard label="Active Miners" value={formatNumber(pool.miners)} />
        <StatCard label="Workers" value={formatNumber(pool.workers)} />
        <StatCard label="Blocks Found" value={formatNumber(pool.blocksFound)} violet />
        <StatCard label="Last Block" value={timeAgo(pool.lastBlockTime)} />
        <StatCard label="Pool Share" value={`${pool.poolSharePercent}%`} secondary />
        <StatCard label="Pool Fee" value={`${pool.poolFee}%`} />
      </div>
    </section>
  );
}

/* ---------- Network Panel ---------- */
function NetworkPanel() {
  const { network } = poolData;

  return (
    <section>
      <SectionHeader>Network</SectionHeader>
      <div className="ax-grid-3">
        <StatCard label="Block Height" value={formatNumber(network.blockHeight)} />
        <StatCard label="Difficulty" value={formatNumber(network.difficulty)} />
        <StatCard label="ETI Price (USD)" value={`$${network.etiPriceUsd.toFixed(2)}`} violet />
        <StatCard label="ETI Price (ETH)" value={network.etiPrice.toFixed(4)} secondary />
        <StatCard label="Gas Price" value={`${network.gasPrice} GWei`} />
        <StatCard label="Epoch" value={formatNumber(network.epoch)} violet />
      </div>
    </section>
  );
}

/* ---------- Mining Contract ---------- */
function MiningContractPanel() {
  const { miningContract } = poolData;
  const [expandedField, setExpandedField] = useState(null);

  const toggle = (field) => {
    setExpandedField(expandedField === field ? null : field);
  };

  const renderHashField = (label, value, fieldKey) => {
    const isExpanded = expandedField === fieldKey;
    const display = isExpanded ? value : truncateAddress(value, 12);
    return (
      <div className="ax-card" style={{ gridColumn: '1 / -1' }}>
        <div className="ax-label">{label}</div>
        <div
          className="ax-mono ax-expandable"
          onClick={() => toggle(fieldKey)}
          title="Click to expand/collapse"
          style={{ wordBreak: isExpanded ? 'break-all' : 'normal' }}
        >
          {display}
        </div>
      </div>
    );
  };

  return (
    <section>
      <SectionHeader>Mining Contract</SectionHeader>
      <div className="ax-grid-3">
        <StatCard label="Epoch Count" value={formatNumber(miningContract.epochCount)} violet />
        <StatCard label="Mining Difficulty" value={formatNumber(miningContract.miningDifficulty)} violet />
        <div className="ax-card">
          <div className="ax-label">Mining Target</div>
          <div className="ax-mono" style={{ fontSize: '0.6875rem' }}>
            {truncateAddress(miningContract.miningTarget, 14)}
          </div>
        </div>
        {renderHashField('RandomX Blob', miningContract.randomxBlob, 'blob')}
        {renderHashField('RandomX Seedhash', miningContract.randomxSeedhash, 'seedhash')}
        {renderHashField('Challenge Number', miningContract.challengeNumber, 'challenge')}
      </div>
    </section>
  );
}

/* ---------- Accounts Panel ---------- */
function AccountsPanel() {
  const { poolStatus, mintingAddress, paymentsAddress, mintingNetwork, paymentsNetwork } = poolData;

  const AccountCard = ({ title, address, network, ethBalance, tokenBalance }) => (
    <div className="ax-card">
      <div className="ax-label">{title}</div>
      <div className="ax-mono ax-mono--bright" style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
        {truncateAddress(address, 10)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div>
          <span className="ax-label" style={{ display: 'inline', marginRight: '0.5rem' }}>Network</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--ax-text)' }}>{network}</span>
        </div>
        <div>
          <span className="ax-label" style={{ display: 'inline', marginRight: '0.5rem' }}>EGAZ Balance</span>
          <span className="ax-metric ax-metric--small" style={{ color: 'var(--ax-violet-light)' }}>
            {rawToFormatted(ethBalance)} EGAZ
          </span>
        </div>
        <div>
          <span className="ax-label" style={{ display: 'inline', marginRight: '0.5rem' }}>ETI Balance</span>
          <span className="ax-metric ax-metric--small">
            {rawToFormatted(tokenBalance)} ETI
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <section>
      <SectionHeader>Accounts</SectionHeader>
      <div className="ax-grid-2">
        <AccountCard
          title="Minting Account"
          address={mintingAddress}
          network={mintingNetwork}
          ethBalance={poolStatus.mintingAccountBalances.ETH}
          tokenBalance={poolStatus.mintingAccountBalances.token}
        />
        <AccountCard
          title="Payments Account"
          address={paymentsAddress}
          network={paymentsNetwork}
          ethBalance={poolStatus.paymentsAccountBalances.ETH}
          tokenBalance={poolStatus.paymentsAccountBalances.token}
        />
      </div>
    </section>
  );
}

/* ---------- Contracts & Fees Panel ---------- */
function ContractsAndFees() {
  const { smartContractAddress, batchedPaymentsContractAddress, minBalanceForPayment, poolStatus } = poolData;
  const fees = poolStatus.poolFeesMetrics;

  return (
    <section>
      <SectionHeader>Contracts & Fees</SectionHeader>
      <div className="ax-grid-2">
        {/* Contracts */}
        <div className="ax-card">
          <div className="ax-label" style={{ marginBottom: '0.75rem' }}>Contract Addresses</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div className="ax-label">Smart Contract</div>
              <div className="ax-mono">{truncateAddress(smartContractAddress, 10)}</div>
            </div>
            <div>
              <div className="ax-label">Batched Payments</div>
              <div className="ax-mono">{truncateAddress(batchedPaymentsContractAddress, 10)}</div>
            </div>
            <div>
              <div className="ax-label">Min Payment Balance</div>
              <div className="ax-mono ax-mono--bright">{rawToFormatted(minBalanceForPayment)} ETI</div>
            </div>
          </div>
        </div>

        {/* Fees */}
        <div className="ax-card">
          <div className="ax-label" style={{ marginBottom: '0.75rem' }}>Fee Metrics</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="ax-label" style={{ marginBottom: 0 }}>Mining Reward</span>
              <span className="ax-metric ax-metric--small">{rawToFormatted(fees.miningRewardRaw)} ETI</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="ax-label" style={{ marginBottom: 0 }}>Price Ratio</span>
              <span className="ax-metric ax-metric--small" style={{ color: 'var(--ax-violet-light)' }}>
                {fees.token_Eth_Price_Ratio.toFixed(4)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="ax-label" style={{ marginBottom: 0 }}>Base Fee</span>
              <span style={{ fontFamily: 'var(--ax-font-mono)', fontSize: '0.875rem', color: 'var(--ax-text)' }}>
                {fees.poolBaseFee}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="ax-label" style={{ marginBottom: 0 }}>Avg Gas Price</span>
              <span style={{ fontFamily: 'var(--ax-font-mono)', fontSize: '0.875rem', color: 'var(--ax-text)' }}>
                {fees.avgGasPriceGWei} GWei
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="ax-label" style={{ marginBottom: 0 }}>Rewards Bonus</span>
              <span style={{ fontFamily: 'var(--ax-font-mono)', fontSize: '0.875rem', color: 'var(--ax-text)' }}>
                {fees.poolRewardsBonus}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Miners Table ---------- */
function MinersTable() {
  const { miners } = poolData;

  return (
    <section>
      <SectionHeader>Miners</SectionHeader>
      <div className="ax-table-wrap">
        <table className="ax-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Address</th>
              <th>Hashrate</th>
              <th>Total ETI</th>
              <th>Received ETI</th>
              <th>Port</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {miners.map((miner, idx) => (
              <tr key={miner.minerEthAddress}>
                <td style={{ color: 'var(--ax-label)', fontFamily: 'var(--ax-font-mono)' }}>
                  #{idx + 1}
                </td>
                <td>
                  <span className="ax-mono ax-mono--bright">
                    {truncateAddress(miner.minerEthAddress, 8)}
                  </span>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-violet)', fontWeight: 600 }}>
                    {formatHashrate(miner.avgHashrate)}
                  </span>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text)' }}>
                    {rawToFormatted(miner.alltimeTokenBalance)}
                  </span>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-muted)' }}>
                    {rawToFormatted(miner.tokensReceived)}
                  </span>
                </td>
                <td>
                  <span className="ax-port-tag">{miner.entryport}</span>
                </td>
                <td style={{ color: 'var(--ax-text-muted)', fontSize: '0.75rem' }}>
                  {timeAgo(miner.lastSeen)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- Recent Blocks ---------- */
function RecentBlocks() {
  const { recentBlocks } = poolData;

  return (
    <div>
      <SectionHeader>Recent Blocks</SectionHeader>
      <div className="ax-table-wrap">
        <table className="ax-table">
          <thead>
            <tr>
              <th>Epoch</th>
              <th>Hash</th>
              <th>Reward</th>
              <th>Finder</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {recentBlocks.map((block, idx) => (
              <tr key={idx}>
                <td>
                  <span style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text)', fontWeight: 600 }}>
                    {formatNumber(block.epoch)}
                  </span>
                </td>
                <td>
                  <span className="ax-mono">{truncateAddress(block.hash, 8)}</span>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-violet)', fontWeight: 600 }}>
                    {block.reward} ETI
                  </span>
                </td>
                <td>
                  <span className="ax-mono">{block.finder}</span>
                </td>
                <td style={{ color: 'var(--ax-text-muted)', fontSize: '0.75rem' }}>
                  {timeAgo(block.time)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Recent Payouts ---------- */
function RecentPayouts() {
  const { payouts } = poolData;

  return (
    <div>
      <SectionHeader>Recent Payouts</SectionHeader>
      <div className="ax-table-wrap">
        <table className="ax-table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Amount</th>
              <th>Tx Hash</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((payout, idx) => (
              <tr key={idx}>
                <td>
                  <span className="ax-mono ax-mono--bright">{payout.address}</span>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-violet)', fontWeight: 600 }}>
                    {payout.amount} ETI
                  </span>
                </td>
                <td>
                  <span className="ax-mono">{truncateAddress(payout.txHash, 8)}</span>
                </td>
                <td style={{ color: 'var(--ax-text-muted)', fontSize: '0.75rem' }}>
                  {timeAgo(payout.time)}
                </td>
                <td>
                  <span className={`ax-status-badge ax-status-badge--${payout.status}`}>
                    {payout.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Blocks & Payouts (2-col) ---------- */
function BlocksAndPayouts() {
  return (
    <section>
      <div className="ax-grid-2">
        <RecentBlocks />
        <RecentPayouts />
      </div>
    </section>
  );
}

/* ---------- Stratum Ports ---------- */
function StratumPortsPanel() {
  const { stratumPorts } = poolData;

  return (
    <section>
      <SectionHeader>Stratum Ports</SectionHeader>
      <div className="ax-port-badges">
        {stratumPorts.map((sp) => (
          <div className="ax-port-badge" key={sp.port}>
            <span className="ax-port-number">{sp.port}</span>
            <span className="ax-port-label">{sp.label}</span>
            <span className="ax-port-diff">diff: {formatNumber(sp.difficulty)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="ax-footer">
      <div className="ax-container">
        <span>{poolNameAndUrl.poolName}</span>
        <span style={{ margin: '0 0.5rem', color: 'var(--ax-card-border)' }}>|</span>
        <a href={poolNameAndUrl.poolUrl} target="_blank" rel="noopener noreferrer">
          {poolNameAndUrl.poolUrl}
        </a>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Dashboard
   ═══════════════════════════════════════════════════════════════ */

export default function Dashboard() {
  return (
    <div className="axiom-dashboard">
      <HeaderBar />

      <main className="ax-container" style={{ paddingTop: '2rem' }}>
        <div className="ax-sections">
          {/* 1. Pool Stats */}
          <PoolStatsGrid />

          {/* 2. Network */}
          <NetworkPanel />

          {/* 3. Mining Contract */}
          <MiningContractPanel />

          {/* 4. Accounts */}
          <AccountsPanel />

          {/* 5. Contracts & Fees */}
          <ContractsAndFees />

          {/* 6. Miners Table */}
          <MinersTable />

          {/* 7. Recent Blocks & Payouts */}
          <BlocksAndPayouts />

          {/* 8. Stratum Ports */}
          <StratumPortsPanel />
        </div>
      </main>

      <Footer />
    </div>
  );
}
