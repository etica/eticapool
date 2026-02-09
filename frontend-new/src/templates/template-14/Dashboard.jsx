import React, { useState } from 'react';
import {
  poolData,
  poolNameAndUrl,
  formatHashrate,
  timeAgo,
  formatNumber,
  truncateAddress,
  rawToFormatted,
} from '../../mock-data';
import './styles.css';

/* ═══════════════════════════════════════════════════════════════════════
   Inkwell Dashboard - Template 14
   Black canvas, monochrome text, semantic green/red accents only.
   Typography: JetBrains Mono throughout for full terminal aesthetic.
   ═══════════════════════════════════════════════════════════════════════ */

/* ─── ExpandableHash ───────────────────────────────────────────────────
   Renders long hex strings (hashes, addresses, blobs) truncated by
   default. Clicking toggles between truncated and full display.
   ──────────────────────────────────────────────────────────────────── */
function ExpandableHash({ value, truncLen = 16 }) {
  const [expanded, setExpanded] = useState(false);

  if (!value) {
    return <span className="inkwell-data-val dim">--</span>;
  }

  return (
    <span
      className="inkwell-expandable inkwell-data-val dim"
      onClick={() => setExpanded(!expanded)}
      title={expanded ? 'Click to collapse' : 'Click to expand'}
    >
      {expanded ? value : truncateAddress(value, truncLen)}
    </span>
  );
}

/* ─── SectionTitle ─────────────────────────────────────────────────────
   White uppercase header with letter-spacing and bottom border.
   ──────────────────────────────────────────────────────────────────── */
function SectionTitle({ children }) {
  return <h2 className="inkwell-section-title">{children}</h2>;
}

/* ─── StatCell ─────────────────────────────────────────────────────────
   Individual cell within a stats grid. Supports positive (green),
   negative (red), or neutral (white) coloring based on variant prop.
   ──────────────────────────────────────────────────────────────────── */
function StatCell({ label, value, variant }) {
  let cls = '';
  if (variant === 'positive') cls = 'positive';
  else if (variant === 'negative') cls = 'negative';

  return (
    <div className="inkwell-stat-cell">
      <div className="inkwell-stat-label">{label}</div>
      <div className={`inkwell-stat-value ${cls}`}>{value}</div>
    </div>
  );
}

/* ─── DataRow ──────────────────────────────────────────────────────────
   Key-value row used in data panels. Accepts either a value string
   with variant, or children for custom rendering (e.g. ExpandableHash).
   Variants: positive (green), negative (red), dim (muted), addr (label gray).
   ──────────────────────────────────────────────────────────────────── */
function DataRow({ label, value, variant, children }) {
  let cls = '';
  if (variant === 'positive') cls = 'positive';
  else if (variant === 'negative') cls = 'negative';
  else if (variant === 'dim') cls = 'dim';
  else if (variant === 'addr') cls = 'mono-addr';

  return (
    <div className="inkwell-data-row">
      <span className="inkwell-data-key">{label}</span>
      {children || <span className={`inkwell-data-val ${cls}`}>{value}</span>}
    </div>
  );
}

/* ─── AccountCard ──────────────────────────────────────────────────────
   Displays a single account panel (minting or payments) with
   address, network, EGAZ balance, and ETI balance.
   ──────────────────────────────────────────────────────────────────── */
function AccountCard({ title, address, network, egazBalance, etiBalance }) {
  return (
    <div className="inkwell-data-rows">
      <DataRow label={title}>
        <span className="inkwell-data-val mono-addr">
          {truncateAddress(address, 10)}
        </span>
      </DataRow>
      <DataRow label="Network" value={network} />
      <DataRow
        label="EGAZ Balance"
        value={`${rawToFormatted(egazBalance)} EGAZ`}
        variant="positive"
      />
      <DataRow
        label="ETI Balance"
        value={`${rawToFormatted(etiBalance)} ETI`}
        variant="positive"
      />
    </div>
  );
}

/* ─── MinerRow ─────────────────────────────────────────────────────────
   Single table row for the miners table. Separated for clarity.
   ──────────────────────────────────────────────────────────────────── */
function MinerRow({ miner, rank }) {
  return (
    <tr>
      <td className="col-rank">{rank}</td>
      <td className="col-addr">
        {truncateAddress(miner.minerEthAddress, 8)}
      </td>
      <td className="col-positive">
        {formatHashrate(miner.avgHashrate)}
      </td>
      <td className="col-positive">
        {rawToFormatted(miner.alltimeTokenBalance)}
      </td>
      <td className="col-positive">
        {rawToFormatted(miner.tokensReceived)}
      </td>
      <td>{miner.entryport}</td>
      <td className="col-muted">{timeAgo(miner.lastSeen)}</td>
    </tr>
  );
}

/* ─── BlockRow ─────────────────────────────────────────────────────────
   Single table row for the recent blocks table.
   ──────────────────────────────────────────────────────────────────── */
function BlockRow({ block }) {
  return (
    <tr>
      <td>{formatNumber(block.epoch)}</td>
      <td className="col-addr">
        {truncateAddress(block.hash, 10)}
      </td>
      <td className="col-positive">{block.reward} ETI</td>
      <td className="col-addr">{block.finder}</td>
      <td className="col-muted">{timeAgo(block.time)}</td>
    </tr>
  );
}

/* ─── PayoutRow ────────────────────────────────────────────────────────
   Single table row for the recent payouts table. Status renders as
   green "confirmed" or muted gray for pending.
   ──────────────────────────────────────────────────────────────────── */
function PayoutRow({ payout }) {
  const statusCls =
    payout.status === 'confirmed'
      ? 'inkwell-status-confirmed'
      : 'inkwell-status-pending';

  return (
    <tr>
      <td className="col-addr">{payout.address}</td>
      <td className="col-positive">{payout.amount} ETI</td>
      <td className="col-addr">
        {truncateAddress(payout.txHash, 8)}
      </td>
      <td className="col-muted">{timeAgo(payout.time)}</td>
      <td>
        <span className={statusCls}>{payout.status}</span>
      </td>
    </tr>
  );
}

/* ─── StratumPortCard ──────────────────────────────────────────────────
   Renders a single stratum port cell with port number, label,
   and difficulty value.
   ──────────────────────────────────────────────────────────────────── */
function StratumPortCard({ port, label, difficulty }) {
  return (
    <div className="inkwell-port-cell">
      <div className="inkwell-port-number">{port}</div>
      <div className="inkwell-port-label">{label}</div>
      <div className="inkwell-port-diff">
        diff {formatNumber(difficulty)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Dashboard — Main Component
   ═══════════════════════════════════════════════════════════════════════ */

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
  } = poolData;

  const { mintingAccountBalances, paymentsAccountBalances, poolFeesMetrics } =
    poolStatus;

  return (
    <div className="inkwell-dashboard">

      {/* ════════════════════════════════════════════════════════════════
          HEADER — Logo, pool name, LIVE indicator, URL, back link
          ════════════════════════════════════════════════════════════ */}
      <header className="inkwell-header">
        <div className="inkwell-container">
          <div className="inkwell-header-inner">
            <div className="inkwell-header-left">
              <img
                src="/images/eti-logo.png"
                alt="ETI"
                className="inkwell-logo"
              />
              <span className="inkwell-pool-name">
                {poolNameAndUrl.poolName}
              </span>
              <span className="inkwell-live-badge">
                <span className="inkwell-live-dot" />
                LIVE
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <a
                href={poolNameAndUrl.poolUrl}
                className="inkwell-pool-url"
                target="_blank"
                rel="noreferrer"
              >
                {poolNameAndUrl.poolUrl}
              </a>
              <a href="/" className="inkwell-back-link">
                &larr; Back
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="inkwell-container">

        {/* ════════════════════════════════════════════════════════════
            SECTION 1 — Pool Statistics
            Hashrate (green), miners/workers (neutral), blocks (green),
            pool fee (red)
            ════════════════════════════════════════════════════════ */}
        <section className="inkwell-section">
          <SectionTitle>Pool Statistics</SectionTitle>
          <div className="inkwell-stats-grid">
            <StatCell
              label="Total Hashrate"
              value={formatHashrate(pool.hashrate)}
              variant="positive"
            />
            <StatCell
              label="24h Avg Hashrate"
              value={formatHashrate(pool.hashrate24h)}
              variant="positive"
            />
            <StatCell
              label="Active Miners"
              value={formatNumber(pool.miners)}
            />
            <StatCell
              label="Workers"
              value={formatNumber(pool.workers)}
            />
            <StatCell
              label="Blocks Found"
              value={formatNumber(pool.blocksFound)}
              variant="positive"
            />
            <StatCell
              label="Last Block"
              value={timeAgo(pool.lastBlockTime)}
            />
            <StatCell
              label="Pool Share"
              value={`${pool.poolSharePercent}%`}
            />
            <StatCell
              label="Pool Fee"
              value={`${pool.poolFee}%`}
              variant="negative"
            />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 2 — Network Information
            Block height, difficulty, ETI prices, gas price (red), epoch
            ════════════════════════════════════════════════════════ */}
        <section className="inkwell-section">
          <SectionTitle>Network Information</SectionTitle>
          <div className="inkwell-stats-grid">
            <StatCell
              label="Block Height"
              value={formatNumber(network.blockHeight)}
            />
            <StatCell
              label="Network Difficulty"
              value={formatNumber(network.difficulty)}
            />
            <StatCell
              label="ETI Price (USD)"
              value={`$${network.etiPriceUsd.toFixed(2)}`}
              variant="positive"
            />
            <StatCell
              label="ETI Price (ETH)"
              value={network.etiPrice.toFixed(4)}
            />
            <StatCell
              label="Gas Price"
              value={`${network.gasPrice} GWei`}
              variant="negative"
            />
            <StatCell
              label="Epoch"
              value={formatNumber(network.epoch)}
            />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 3 — Mining Contract Data
            RandomX blob, seedhash, challenge (click-to-expand),
            epoch count, mining difficulty, mining target
            ════════════════════════════════════════════════════════ */}
        <section className="inkwell-section">
          <SectionTitle>Mining Contract Data</SectionTitle>
          <div className="inkwell-data-rows">
            <DataRow label="RandomX Blob">
              <ExpandableHash
                value={miningContract.randomxBlob}
                truncLen={24}
              />
            </DataRow>
            <DataRow label="Seedhash">
              <ExpandableHash
                value={miningContract.randomxSeedhash}
                truncLen={20}
              />
            </DataRow>
            <DataRow label="Challenge Number">
              <ExpandableHash
                value={miningContract.challengeNumber}
                truncLen={12}
              />
            </DataRow>
            <DataRow
              label="Epoch Count"
              value={formatNumber(miningContract.epochCount)}
            />
            <DataRow
              label="Mining Difficulty"
              value={formatNumber(miningContract.miningDifficulty)}
            />
            <DataRow label="Mining Target">
              <ExpandableHash
                value={miningContract.miningTarget}
                truncLen={20}
              />
            </DataRow>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 4 — Minting Account
            Address, network, EGAZ and ETI balances (green)
            ════════════════════════════════════════════════════════ */}
        <section className="inkwell-section">
          <SectionTitle>Minting Account</SectionTitle>
          <AccountCard
            title="Address"
            address={poolData.mintingAddress}
            network={poolData.mintingNetwork}
            egazBalance={mintingAccountBalances.ETH}
            etiBalance={mintingAccountBalances.token}
          />
        </section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 5 — Payments Account
            Address, network, EGAZ and ETI balances (green)
            ════════════════════════════════════════════════════════ */}
        <section className="inkwell-section">
          <SectionTitle>Payments Account</SectionTitle>
          <AccountCard
            title="Address"
            address={poolData.paymentsAddress}
            network={poolData.paymentsNetwork}
            egazBalance={paymentsAccountBalances.ETH}
            etiBalance={paymentsAccountBalances.token}
          />
        </section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 6 — Contracts
            Smart contract address, batched payments address,
            minimum balance for payment
            ════════════════════════════════════════════════════════ */}
        <section className="inkwell-section">
          <SectionTitle>Contracts</SectionTitle>
          <div className="inkwell-data-rows">
            <DataRow label="Smart Contract">
              <ExpandableHash
                value={poolData.smartContractAddress}
                truncLen={14}
              />
            </DataRow>
            <DataRow label="Batched Payments">
              <ExpandableHash
                value={poolData.batchedPaymentsContractAddress}
                truncLen={14}
              />
            </DataRow>
            <DataRow
              label="Min Balance for Payment"
              value={`${rawToFormatted(poolData.minBalanceForPayment)} ETI`}
              variant="positive"
            />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 7 — Pool Fees & Metrics
            Mining reward (green), ratio, base fee (red),
            avg gas (red), rewards bonus
            ════════════════════════════════════════════════════════ */}
        <section className="inkwell-section">
          <SectionTitle>Pool Fees &amp; Metrics</SectionTitle>
          <div className="inkwell-stats-grid">
            <StatCell
              label="Mining Reward"
              value={`${rawToFormatted(poolFeesMetrics.miningRewardRaw)} ETI`}
              variant="positive"
            />
            <StatCell
              label="ETI / EGAZ Ratio"
              value={poolFeesMetrics.token_Eth_Price_Ratio.toFixed(4)}
            />
            <StatCell
              label="Pool Base Fee"
              value={`${(poolFeesMetrics.poolBaseFee * 100).toFixed(1)}%`}
              variant="negative"
            />
            <StatCell
              label="Avg Gas Price"
              value={`${poolFeesMetrics.avgGasPriceGWei} GWei`}
              variant="negative"
            />
            <StatCell
              label="Rewards Bonus"
              value={poolFeesMetrics.poolRewardsBonus}
            />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 8 — Active Miners Table
            Rank, address, hashrate (green), total ETI (green),
            ETI received (green), port, last seen
            ════════════════════════════════════════════════════════ */}
        <section className="inkwell-section">
          <SectionTitle>Active Miners</SectionTitle>
          <div className="inkwell-table-wrapper">
            <table className="inkwell-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Address</th>
                  <th>Hashrate</th>
                  <th>Total ETI</th>
                  <th>ETI Received</th>
                  <th>Port</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {miners.map((miner, idx) => (
                  <MinerRow
                    key={miner.minerEthAddress}
                    miner={miner}
                    rank={idx + 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 9 — Recent Blocks
            Epoch, hash, reward (green), finder, time
            ════════════════════════════════════════════════════════ */}
        <section className="inkwell-section">
          <SectionTitle>Recent Blocks</SectionTitle>
          <div className="inkwell-table-wrapper">
            <table className="inkwell-table">
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
                {recentBlocks.map((block) => (
                  <BlockRow key={block.hash} block={block} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 10 — Recent Payouts
            Address, amount (green), tx hash, time, status (confirmed=green)
            ════════════════════════════════════════════════════════ */}
        <section className="inkwell-section">
          <SectionTitle>Recent Payouts</SectionTitle>
          <div className="inkwell-table-wrapper">
            <table className="inkwell-table">
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
                {payouts.map((payout) => (
                  <PayoutRow key={payout.txHash} payout={payout} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 11 — Stratum Ports
            All 4 ports with labels and difficulty values
            ════════════════════════════════════════════════════════ */}
        <section className="inkwell-section">
          <SectionTitle>Stratum Ports</SectionTitle>
          <div className="inkwell-ports-grid">
            {stratumPorts.map((sp) => (
              <StratumPortCard
                key={sp.port}
                port={sp.port}
                label={sp.label}
                difficulty={sp.difficulty}
              />
            ))}
          </div>
        </section>

      </main>

      {/* ════════════════════════════════════════════════════════════════
          FOOTER — Pool name, current block/epoch, mining type
          ════════════════════════════════════════════════════════════ */}
      <footer className="inkwell-footer">
        <div className="inkwell-container">
          <div className="inkwell-footer-inner">
            <span>{poolNameAndUrl.poolName}</span>
            <span>
              Block #{formatNumber(network.blockHeight)} &middot; Epoch{' '}
              {formatNumber(network.epoch)}
            </span>
            <span>Etica RandomX Mining</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
