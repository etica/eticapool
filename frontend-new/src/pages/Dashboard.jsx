import React, { useState } from 'react';
import { usePoolOverview } from '../hooks/usePoolOverview';
import TabNav from '../components/TabNav';
import DataCard from '../components/DataCard';
import DataRow from '../components/DataRow';
import DataTable from '../components/DataTable';
import ExpandableHash from '../components/ExpandableHash';
import SectionTitle from '../components/SectionTitle';
import PortBadge from '../components/PortBadge';
import LiveDot from '../components/LiveDot';
import StatusBadge from '../components/StatusBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { formatNumber, formatHashrate, truncateAddress, rawToFormatted, formatPoolName } from '../lib/formatters';
import { ETICASCAN_URL, buildStratumPorts } from '../config/constants';

const TABS = ['Mining Data', 'Getting Started', 'Pool Status', 'Recent Transactions'];

/* ---------- Tab: Mining Data ---------- */

function MiningDataTab({ poolData, poolStatus, poolName, fees }) {
  const miningContract = poolData?.miningContract;
  const isActive = poolStatus?.poolStatus !== 'suspended';

  return (
    <div className="space-y-6">
      {/* Pool Status */}
      <div className="os-status-line" style={{ justifyContent: 'flex-start' }}>
        <span className="os-status-badge">
          <LiveDot />
          {poolName} is {isActive ? 'Active' : 'Suspended'}
        </span>
        {!isActive && poolStatus?.suspensionReason && (
          <span className="text-xs orange">
            ({poolStatus.suspensionReason})
          </span>
        )}
        {isActive && fees?.poolRewardsBonus > 0 && (
          <span className="text-xs orange">
            (Bonus Activated: +{fees.poolRewardsBonus * 100}% on all mining rewards)
          </span>
        )}
      </div>

      {/* Minting + Payments */}
      <div className="os-split">
        <DataCard
          accent="linear-gradient(90deg, #34d399, #06b6d4)"
          tag="MINT"
          tagColor="emerald"
          title="Minting Account"
        >
          <DataRow label="Address">
            <a
              href={`${ETICASCAN_URL}/address/${poolData?.mintingAddress}`}
              target="_blank"
              rel="noreferrer"
              className="os-link-cyan"
            >
              {truncateAddress(poolData?.mintingAddress, 10)}
            </a>
          </DataRow>
          <DataRow label="Network">{poolData?.mintingNetwork}</DataRow>
          <DataRow label="EGAZ Balance">
            {rawToFormatted(poolStatus?.mintingAccountBalances?.ETH)} EGAZ
          </DataRow>
          <DataRow label="ETI Balance" className="emerald">
            {rawToFormatted(poolStatus?.mintingAccountBalances?.token)} ETI
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
              href={`${ETICASCAN_URL}/address/${poolData?.paymentsAddress}`}
              target="_blank"
              rel="noreferrer"
              className="os-link-cyan"
            >
              {truncateAddress(poolData?.paymentsAddress, 10)}
            </a>
          </DataRow>
          <DataRow label="Network">{poolData?.paymentsNetwork}</DataRow>
          <DataRow label="EGAZ Balance">
            {rawToFormatted(poolStatus?.paymentsAccountBalances?.ETH)} EGAZ
          </DataRow>
          <DataRow label="Batched Payments">
            <a
              href={`${ETICASCAN_URL}/address/${poolData?.batchedPaymentsContractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="os-link-cyan"
            >
              {truncateAddress(poolData?.batchedPaymentsContractAddress, 10)}
            </a>
          </DataRow>
          <DataRow label="Pool Balance" className="orange">
            {rawToFormatted(poolStatus?.paymentsAccountBalances?.token)} ETI
          </DataRow>
        </DataCard>
      </div>

      {/* Block Info */}
      <DataCard accent="linear-gradient(90deg, #6b7280, #374151)">
        <DataRow label="Last Known Block">{formatNumber(poolData?.ethBlockNumber)}</DataRow>
        <DataRow label="Min Payment" className="orange">
          {rawToFormatted(poolData?.minBalanceForPayment)} ETI
        </DataRow>
        <p className="os-note mt-3">
          Low Balance Payments: every 24 hours for balances between 0.01 ETI and{' '}
          {rawToFormatted(poolData?.minBalanceForPayment)} ETI
        </p>
      </DataCard>

      {/* Mining Contract */}
      {miningContract && (
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
      )}
    </div>
  );
}

/* ---------- Tab: Getting Started ---------- */

function GettingStartedTab({ poolUrl, stratumPorts }) {
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
          {(poolUrl || '').replace(/^https?:\/\//, '')}:3333
        </p>
      </DataCard>

      <DataCard accent="linear-gradient(90deg, #06b6d4, #34d399)" title="Connection Details">
        <DataRow label="Pool URL" className="emerald">
          {poolUrl}
        </DataRow>
      </DataCard>

      <div>
        <SectionTitle color="orange">Mining Ports</SectionTitle>
        <div className="os-ports-grid">
          {stratumPorts.map((sp) => (
            <DataCard
              key={sp.port}
              accent={
                sp.port === 3333 ? '#34d399' :
                sp.port === 5555 ? '#f97316' :
                sp.port === 7777 ? '#fbbf24' : '#f87171'
              }
            >
              <div className="text-center">
                <PortBadge port={sp.port} />
                <p className="os-label mt-3">Starting Difficulty</p>
                <p className="text-sm font-bold text-white mt-1">{formatNumber(sp.difficulty)}</p>
                <p className="faded text-xs mt-2">{sp.label}</p>
              </div>
            </DataCard>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Tab: Pool Status ---------- */

function PoolStatusTab({ poolStatus, poolName, stratumPorts, fees }) {
  const isActive = poolStatus?.poolStatus !== 'suspended';

  return (
    <div className="space-y-6">
      <DataCard
        accent={isActive
          ? 'linear-gradient(90deg, #34d399, #06b6d4)'
          : 'linear-gradient(90deg, #f97316, #f87171)'}
        tag="STATUS"
        tagColor={isActive ? 'emerald' : 'orange'}
      >
        <div className="flex items-center gap-2 mb-4">
          <LiveDot />
          <span className={`text-sm font-semibold ${isActive ? 'emerald' : 'orange'}`}>
            Pool Status: {poolName} is {isActive ? 'Active' : 'Suspended'}
          </span>
        </div>
        {!isActive && poolStatus?.suspensionReason && (
          <p className="text-xs orange mb-4">Reason: {poolStatus.suspensionReason}</p>
        )}

        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Stratum Ports</h3>
        {stratumPorts.map((sp) => (
          <DataRow key={sp.port} label={`Port ${sp.port}`}>
            Minimum Shares Difficulty: {formatNumber(sp.difficulty)}
          </DataRow>
        ))}
      </DataCard>

      {fees && (
        <DataCard
          accent="linear-gradient(90deg, #f97316, #f87171)"
          tag="FEES"
          tagColor="orange"
          title="Fees & Rewards"
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
      )}
    </div>
  );
}

/* ---------- Tab: Recent Transactions ---------- */

function RecentTransactionsTab({ recentPayments }) {
  return (
    <div>
      <DataCard
        accent="linear-gradient(90deg, #06b6d4, #34d399)"
        tag="TX"
        tagColor="cyan"
        title="Recent Payments"
      >
        <DataTable
          columns={[
            { label: 'Block' },
            { label: 'TxHash' },
            { label: 'Status', align: 'right' },
          ]}
          data={recentPayments}
          emptyMessage="No recent transactions"
          renderRow={(tx, idx) => (
            <tr key={idx} className="os-table-row">
              <td className="py-3 px-3 text-white font-medium">{tx.block}</td>
              <td className="py-3 px-3">
                <a
                  href={`${ETICASCAN_URL}/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="os-link-cyan"
                >
                  {truncateAddress(tx.txHash, 12)}
                </a>
              </td>
              <td className="py-3 px-3 text-right">
                <StatusBadge status={tx.status} />
              </td>
            </tr>
          )}
        />
      </DataCard>
    </div>
  );
}

/* ---------- Main Dashboard ---------- */

export default function Dashboard() {
  const { data, isLoading, isError } = usePoolOverview();
  const [activeTab, setActiveTab] = useState('Mining Data');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton type="card" />
        <LoadingSkeleton type="card" />
        <LoadingSkeleton type="card" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 faded">
        Failed to load pool overview. Please try again later.
      </div>
    );
  }

  const { poolData, poolStatus, config } = data || {};

  // Resolve pool name and URL
  const poolNameAndUrl = data?.poolNameAndUrl || {};
  const poolName = poolNameAndUrl.poolName || config?.poolName || 'Etica Mining Pool';
  const poolUrl = poolNameAndUrl.poolUrl || config?.poolUrl || '';

  // Build stratum port objects from plain number array
  const rawPorts = config?.stratumPorts || data?.stratumPorts || poolData?.stratumPorts || [];
  const stratumPorts = buildStratumPorts(rawPorts);

  // poolFeesMetrics can be a number (e.g. 1) when diagnostics hasn't populated yet
  const fees = (poolStatus?.poolFeesMetrics && typeof poolStatus.poolFeesMetrics === 'object')
    ? poolStatus.poolFeesMetrics
    : null;

  // statsRecord is an array — get first element; recentPaymentsBatched lives in poolData
  // REST returns statsRecord; socket poolUpdate sends LastpoolStatsRecord
  const rawStats = data?.statsRecord || data?.LastpoolStatsRecord;
  const statsRecord = Array.isArray(rawStats) ? rawStats[0] : rawStats;
  const recentPayments = data?.recentPaymentTxs || [];

  const { base: poolBase, suffix: poolSuffix } = formatPoolName(poolName);

  // Pool-level metrics from latest stats record
  const poolHashrate = statsRecord?.Hashrate || 0;
  const poolMiners = statsRecord?.Numberminers || 0;
  const poolWorkers = statsRecord?.Numberworkers || 0;

  return (
    <div>
      {/* Centered hero header */}
      <div className="os-header">
        <div className="os-header-title">
          <img src="/images/eti-logo.png" alt="ETI" className="w-10 h-10" />
          {poolBase} <span className="accent">{poolSuffix}</span>
        </div>
        <p className="os-header-sub">Pool Overview &mdash; Mining Data &amp; Status</p>
        <p className="os-header-mono">{poolUrl}</p>
        {stratumPorts.length > 0 && (
          <div className="os-status-line" style={{ marginTop: '0.75rem' }}>
            {stratumPorts.map((sp) => (
              <span key={sp.port} className={`os-port-tag os-port-${sp.port}`}>
                {sp.port} &middot; {sp.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pool metrics */}
      <div className="os-metrics-bar">
        <div className="os-metric-item">
          <span className="os-metric-label">POOL HASHRATE</span>
          <span className="os-metric-value emerald">{formatHashrate(poolHashrate)}</span>
        </div>
        <div className="os-metric-item">
          <span className="os-metric-label">MINERS</span>
          <span className="os-metric-value cyan">{poolMiners}</span>
        </div>
        <div className="os-metric-item">
          <span className="os-metric-label">WORKERS</span>
          <span className="os-metric-value cyan">{poolWorkers}</span>
        </div>
        <div className="os-metric-item">
          <span className="os-metric-label">POOL FEE</span>
          <span className="os-metric-value orange">{config?.poolFee || 0}%</span>
        </div>
      </div>

      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'Mining Data' && (
        <MiningDataTab poolData={poolData} poolStatus={poolStatus} poolName={poolName} fees={fees} />
      )}
      {activeTab === 'Getting Started' && (
        <GettingStartedTab poolUrl={poolUrl} stratumPorts={stratumPorts} />
      )}
      {activeTab === 'Pool Status' && (
        <PoolStatusTab poolStatus={poolStatus} poolName={poolName} stratumPorts={stratumPorts} fees={fees} />
      )}
      {activeTab === 'Recent Transactions' && (
        <RecentTransactionsTab recentPayments={recentPayments} />
      )}
    </div>
  );
}
