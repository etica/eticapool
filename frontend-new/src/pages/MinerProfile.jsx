import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMinerProfile } from '../hooks/useMinerProfile';
import { useMinerShares, useMinerSharesChart } from '../hooks/useMinerShares';
import { useMinerPayments } from '../hooks/useMinerPayments';
import { useMinerRewards, useMinerRewardsChart } from '../hooks/useMinerRewards';
import DataCard from '../components/DataCard';
import DataRow from '../components/DataRow';
import DataTable from '../components/DataTable';
import TabNav from '../components/TabNav';
import SectionTitle from '../components/SectionTitle';
import PortBadge from '../components/PortBadge';
import StatusBadge from '../components/StatusBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import StatsGrid from '../components/StatsGrid';
import PoolChart from '../components/PoolChart';
import {
  formatHashrate,
  timeAgo,
  formatNumber,
  truncateAddress,
  rawToFormatted,
} from '../lib/formatters';
import { ETICASCAN_URL } from '../config/constants';

const TABS = ['Overview', 'Shares', 'Payments', 'Rewards'];

/* ---------- Graph Tab ---------- */

function ChartLoadingPlaceholder({ label }) {
  return (
    <div className="os-block" style={{ minHeight: 280 }}>
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <div className="h-6 w-6 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
        <span className="text-sm faded">Loading {label}...</span>
      </div>
    </div>
  );
}

function MinerGraphTab({ sharesChartData, sharesLoading, rewardsChartData, rewardsLoading }) {
  // Build uPlot-ready data from pre-computed linedata (parallel arrays)
  const sharesChart = useMemo(() => {
    if (!sharesChartData || !sharesChartData.timestamps || sharesChartData.timestamps.length < 2) return null;
    const ts = sharesChartData.timestamps;
    const diff = sharesChartData.series.difficulty;
    const n = ts.length;

    // Normalize timestamps to seconds
    const timestamps = new Array(n);
    for (let i = 0; i < n; i++) {
      timestamps[i] = ts[i] < 1e12 ? ts[i] : Math.floor(ts[i] / 1000);
    }

    let min = Infinity, max = 0, sum = 0;
    for (let i = 0; i < n; i++) {
      const d = diff[i];
      if (d > max) max = d;
      if (d < min) min = d;
      sum += d;
    }

    return {
      data: [timestamps, diff],
      current: diff[n - 1],
      avg: sum / n,
      min: min === Infinity ? 0 : min,
      max,
    };
  }, [sharesChartData]);

  // Build uPlot-ready data from pre-computed rewards linedata
  const rewardsChart = useMemo(() => {
    if (!rewardsChartData || !rewardsChartData.timestamps || rewardsChartData.timestamps.length < 2) return null;
    const ts = rewardsChartData.timestamps;
    const earnedArr = rewardsChartData.series.earned;
    const poolPctArr = rewardsChartData.series.poolPercent;
    const n = ts.length;

    const timestamps = new Array(n);
    for (let i = 0; i < n; i++) {
      timestamps[i] = ts[i] < 1e12 ? ts[i] : Math.floor(ts[i] / 1000);
    }

    let sumETI = 0, maxETI = 0, sumPct = 0;
    for (let i = 0; i < n; i++) {
      sumETI += earnedArr[i];
      if (earnedArr[i] > maxETI) maxETI = earnedArr[i];
      sumPct += poolPctArr[i];
    }

    return {
      data: [timestamps, earnedArr, poolPctArr],
      totalETI: sumETI,
      avgETI: sumETI / n,
      maxETI,
      avgPct: sumPct / n,
    };
  }, [rewardsChartData]);

  // Compact formatter for Y axis labels (e.g. 400000 → "400K")
  const fmtDiff = (u, v) => {
    if (v == null) return '--';
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
    return v.toFixed(0);
  };

  return (
    <div className="space-y-6">
      {/* Share Difficulty Chart */}
      {sharesLoading ? (
        <ChartLoadingPlaceholder label="share difficulty chart" />
      ) : (
        <div className="os-block">
          <SectionTitle color="emerald">Share Difficulty</SectionTitle>
          <PoolChart
            data={sharesChart?.data || null}
            title="Share Difficulty — Recent"
            height={260}
            series={[
              {
                label: 'Difficulty',
                color: '#34d399',
                fill: 'rgba(52, 211, 153, 0.08)',
                width: 2,
                value: (u, v) => v == null ? '--' : formatNumber(Math.round(v)),
              },
            ]}
            axes={[
              {
                stroke: 'rgba(255,255,255,0.15)',
                grid: { stroke: 'rgba(255,255,255,0.04)', width: 1 },
                ticks: { stroke: 'rgba(255,255,255,0.08)', width: 1 },
                font: '11px "JetBrains Mono", monospace',
                gap: 8,
              },
              {
                stroke: '#34d399',
                grid: { stroke: 'rgba(255,255,255,0.04)', width: 1 },
                ticks: { stroke: 'rgba(255,255,255,0.08)', width: 1 },
                font: '11px "JetBrains Mono", monospace',
                gap: 8,
                size: 56,
                values: (u, vals) => vals.map(v => fmtDiff(u, v)),
              },
            ]}
            stats={sharesChart ? [
              { label: 'Current', value: formatNumber(Math.round(sharesChart.current)), color: '#34d399' },
              { label: 'Average', value: formatNumber(Math.round(sharesChart.avg)), color: '#9ca3af' },
              { label: 'Peak', value: formatNumber(Math.round(sharesChart.max)), color: '#f97316' },
              { label: 'Low', value: formatNumber(Math.round(sharesChart.min)), color: '#6b7280' },
            ] : undefined}
            legend={[{ label: 'Share Difficulty', color: '#34d399' }]}
          />
        </div>
      )}

      {/* Rewards Chart */}
      {rewardsLoading ? (
        <ChartLoadingPlaceholder label="rewards chart" />
      ) : (
        <div className="os-block">
          <SectionTitle color="orange">Earnings Per Epoch</SectionTitle>
          <PoolChart
            data={rewardsChart?.data || null}
            title="PPLNS Rewards"
            height={260}
            series={[
              {
                label: 'ETI Earned',
                color: '#f97316',
                fill: 'rgba(249, 115, 22, 0.08)',
                width: 2,
                value: (u, v) => v == null ? '--' : v.toFixed(4) + ' ETI',
              },
              {
                label: '% of Pool',
                color: '#06b6d4',
                width: 1.5,
                scale: 'pct',
                dash: [4, 4],
                value: (u, v) => v == null ? '--' : v.toFixed(2) + '%',
              },
            ]}
            scales={{
              x: { time: true },
              y: { auto: true },
              pct: { auto: true },
            }}
            axes={[
              {
                stroke: 'rgba(255,255,255,0.15)',
                grid: { stroke: 'rgba(255,255,255,0.04)', width: 1 },
                ticks: { stroke: 'rgba(255,255,255,0.08)', width: 1 },
                font: '11px "JetBrains Mono", monospace',
                gap: 8,
              },
              {
                stroke: '#f97316',
                grid: { stroke: 'rgba(255,255,255,0.04)', width: 1 },
                ticks: { stroke: 'rgba(255,255,255,0.08)', width: 1 },
                font: '11px "JetBrains Mono", monospace',
                gap: 8,
                size: 70,
                values: (u, vals) => vals.map(v => v == null ? '' : v.toFixed(2) + ' ETI'),
              },
              {
                side: 1,
                scale: 'pct',
                stroke: '#06b6d4',
                grid: { show: false },
                ticks: { stroke: 'rgba(255,255,255,0.08)', width: 1 },
                font: '11px "JetBrains Mono", monospace',
                gap: 8,
                size: 56,
                values: (u, vals) => vals.map(v => v == null ? '' : v.toFixed(0) + '%'),
              },
            ]}
            stats={rewardsChart ? [
              { label: 'Total Earned', value: rewardsChart.totalETI.toFixed(4) + ' ETI', color: '#f97316' },
              { label: 'Avg / Epoch', value: rewardsChart.avgETI.toFixed(4) + ' ETI', color: '#9ca3af' },
              { label: 'Best Epoch', value: rewardsChart.maxETI.toFixed(4) + ' ETI', color: '#34d399' },
              { label: 'Avg Pool %', value: rewardsChart.avgPct.toFixed(2) + '%', color: '#06b6d4' },
            ] : undefined}
            legend={[
              { label: 'ETI Earned (left axis)', color: '#f97316' },
              { label: '% of Pool (right axis)', color: '#06b6d4' },
            ]}
          />
        </div>
      )}
    </div>
  );
}

export default function MinerProfile() {
  const { address: rawAddress, worker: routeWorker } = useParams();
  const [activeTab, setActiveTab] = useState('Overview');

  // Handle both route formats:
  //   /miner/:address/:worker  (address=bare, worker=name)
  //   /miner/:address          (address may contain ".workerName" suffix)
  let baseAddress = rawAddress;
  let workerName = routeWorker || null;
  if (!workerName && rawAddress && rawAddress.length > 42 && rawAddress.indexOf('.') >= 42) {
    baseAddress = rawAddress.substring(0, 42);
    workerName = rawAddress.substring(43); // skip the dot
  }
  const isWorker = !!workerName;

  // Always fetch profile by bare blockchain address to get main + all workers
  const { data: profileData, isLoading: profileLoading, isError: profileError } = useMinerProfile(baseAddress);
  // For shares/payments/rewards, use full worker address when viewing a worker
  // (these collections store records by exact minerEthAddress including worker suffix)
  const queryAddress = isWorker ? `${baseAddress}.${workerName}`.toLowerCase() : baseAddress;
  const { data: sharesData, isLoading: sharesLoading } = useMinerShares(activeTab === 'Shares' ? queryAddress : null);
  const { data: paymentsData, isLoading: paymentsLoading } = useMinerPayments(activeTab === 'Payments' ? queryAddress : null);
  const { data: rewardsData, isLoading: rewardsLoading } = useMinerRewards(activeTab === 'Rewards' ? queryAddress : null);
  // Chart hooks — fetch pre-computed linedata for Graph tab only
  const { data: sharesChartData, isLoading: sharesChartLoading } = useMinerSharesChart(queryAddress, activeTab === 'Graph');
  const { data: rewardsChartData, isLoading: rewardsChartLoading } = useMinerRewardsChart(queryAddress, activeTab === 'Graph');

  const minerData = profileData?.minerData;
  // API returns challengeDetails as an array; take the first (current) entry
  const challengeDetails = Array.isArray(profileData?.challengeDetails)
    ? profileData.challengeDetails[0]
    : profileData?.challengeDetails;

  // Case-insensitive worker match (DB may store "Rx-9951" while URL has "rx-9951")
  const currentWorker = isWorker
    ? minerData?.workers?.find((w) => w.workerName?.toLowerCase() === workerName.toLowerCase())
    : null;

  const poolDiff = Number(challengeDetails?.TotalDiffHard?.totaldiff || 0);
  const minerDiff = Number(challengeDetails?.miner_challengediff?.totaldiff || 0);
  const minerSharePct = poolDiff > 0 ? ((minerDiff / poolDiff) * 100).toFixed(2) + '%' : '0%';

  // Use most recent lastSubmittedSolutionTime across main + workers
  // (main record may be 0 if auto-created and never mined directly)
  const lastShareTime = Math.max(
    minerData?.lastSubmittedSolutionTime || 0,
    ...(minerData?.workers || []).map((w) => w.lastSubmittedSolutionTime || 0),
  );

  if (profileError) {
    return (
      <div className="os-page os-wrap">
        <div className="os-heading">
          <div className="os-heading-title">Miner Not Found</div>
          <div className="os-heading-sub">
            Could not load data for {truncateAddress(baseAddress)}. Check the address and try again.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="os-page os-wrap">
      {/* 1. Header with Graph button top-right */}
      <div className="os-heading" style={{ position: 'relative' }}>
        <div className="os-heading-title" title={baseAddress}>
          {truncateAddress(baseAddress, 10)}
        </div>
        <div className="os-heading-sub">
          {profileLoading ? (
            <LoadingSkeleton type="text" lines={1} />
          ) : isWorker ? (
            <>Worker: {currentWorker?.workerName || workerName}</>
          ) : (
            <>Main Mining Account &mdash; {minerData?.workers?.length || 0} workers</>
          )}
        </div>
        <button
          className={`os-tab ${activeTab === 'Graph' ? 'active' : ''}`}
          style={{ position: 'absolute', top: 0, right: 0 }}
          onClick={() => setActiveTab(activeTab === 'Graph' ? 'Overview' : 'Graph')}
        >
          Graph
        </button>
      </div>

      {/* Tab Navigation */}
      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Overview Tab */}
      {activeTab === 'Overview' && (
        <>
          {/* 2. Overview Stats */}
          <div className="os-block">
            <SectionTitle color="emerald">Overview</SectionTitle>
            {profileLoading ? (
              <StatsGrid cols={3}>
                {Array.from({ length: 6 }, (_, i) => (
                  <LoadingSkeleton key={i} type="card" />
                ))}
              </StatsGrid>
            ) : isWorker && currentWorker ? (
              <StatsGrid cols={3}>
                <DataCard
                  accent="linear-gradient(90deg, #34d399, #06b6d4)"
                  tag="HASHRATE"
                  tagColor="emerald"
                >
                  <div className="os-metric-value emerald">
                    {formatHashrate(currentWorker.avgHashrate || 0)}
                  </div>
                </DataCard>
                <DataCard
                  accent="linear-gradient(90deg, #06b6d4, #34d399)"
                  tag="EARNED 24H"
                  tagColor="cyan"
                >
                  <div className="os-metric-value">
                    {rawToFormatted(currentWorker.last24hTokenBalance)} ETI
                  </div>
                </DataCard>
                <DataCard
                  accent="linear-gradient(90deg, #34d399, #06b6d4)"
                  tag="TOTAL EARNED"
                  tagColor="emerald"
                >
                  <div className="os-metric-value">
                    {rawToFormatted(currentWorker.alltimeTokenBalance)} ETI
                  </div>
                  <div className="os-metric-sub faded">All PPLNS rewards</div>
                </DataCard>
                <DataCard
                  accent="linear-gradient(90deg, #f97316, #fbbf24)"
                  tag="TOTAL PAID"
                  tagColor="orange"
                >
                  <div className="os-metric-value">
                    {rawToFormatted(currentWorker.tokensAwarded)} ETI
                  </div>
                </DataCard>
                <DataCard
                  accent="linear-gradient(90deg, #06b6d4, #34d399)"
                  tag="TOTAL RECEIVED"
                  tagColor="cyan"
                >
                  <div className="os-metric-value">
                    {rawToFormatted(currentWorker.tokensReceived)} ETI
                  </div>
                </DataCard>
                <DataCard
                  accent="linear-gradient(90deg, #4b5563, #6b7280)"
                  tag="LAST SHARE"
                  tagColor="gray"
                >
                  <div className="os-metric-value faded">
                    {timeAgo(currentWorker.lastSubmittedSolutionTime)}
                  </div>
                </DataCard>
              </StatsGrid>
            ) : minerData ? (
              <StatsGrid cols={3}>
                <DataCard
                  accent="linear-gradient(90deg, #34d399, #06b6d4)"
                  tag="HASHRATE"
                  tagColor="emerald"
                >
                  <div className="os-metric-value emerald">
                    {formatHashrate(minerData.totalAvgHashrate || 0)}
                  </div>
                </DataCard>
                <DataCard
                  accent="linear-gradient(90deg, #06b6d4, #34d399)"
                  tag="EARNED 24H"
                  tagColor="cyan"
                >
                  <div className="os-metric-value">
                    {rawToFormatted(minerData.totalLast24hTokenBalance)} ETI
                  </div>
                </DataCard>
                <DataCard
                  accent="linear-gradient(90deg, #34d399, #06b6d4)"
                  tag="TOTAL EARNED"
                  tagColor="emerald"
                >
                  <div className="os-metric-value">
                    {rawToFormatted(minerData.totalAlltimeTokenBalance)} ETI
                  </div>
                  <div className="os-metric-sub faded">All PPLNS rewards</div>
                </DataCard>
                <DataCard
                  accent="linear-gradient(90deg, #f97316, #fbbf24)"
                  tag="TOTAL PAID"
                  tagColor="orange"
                >
                  <div className="os-metric-value">
                    {rawToFormatted(minerData.totalTokensAwarded)} ETI
                  </div>
                </DataCard>
                <DataCard
                  accent="linear-gradient(90deg, #06b6d4, #34d399)"
                  tag="TOTAL RECEIVED"
                  tagColor="cyan"
                >
                  <div className="os-metric-value">
                    {rawToFormatted(minerData.totalTokensReceived)} ETI
                  </div>
                </DataCard>
                <DataCard
                  accent="linear-gradient(90deg, #4b5563, #6b7280)"
                  tag="LAST SHARE"
                  tagColor="gray"
                >
                  <div className="os-metric-value faded">
                    {timeAgo(lastShareTime)}
                  </div>
                </DataCard>
              </StatsGrid>
            ) : null}
          </div>

          {/* 3. Current Challenge */}
          <div className="os-block">
            <SectionTitle color="cyan">Current Challenge</SectionTitle>
            {profileLoading ? (
              <LoadingSkeleton type="card" />
            ) : (
              <DataCard accent="linear-gradient(90deg, #06b6d4, #34d399)">
                <DataRow label="Pool Total Diff">{formatNumber(poolDiff)}</DataRow>
                <DataRow label="Miner Diff">{formatNumber(minerDiff)}</DataRow>
                <DataRow label="Miner Share %" className="emerald">{minerSharePct}</DataRow>
                <DataRow label="Port">
                  <PortBadge port={challengeDetails?.miner_challengediff?.minerport} />
                </DataRow>
              </DataCard>
            )}
          </div>

          {/* 4. Workers Table (main account only) */}
          {!isWorker && (
            <div className="os-block">
              <SectionTitle color="orange">Workers</SectionTitle>
              {profileLoading ? (
                <LoadingSkeleton type="table" />
              ) : (
                <DataTable
                  columns={[
                    { label: 'Worker' },
                    { label: 'Address' },
                    { label: 'Port' },
                    { label: 'Hashrate', align: 'right' },
                    { label: 'Total ETI', align: 'right' },
                    { label: 'Last Share' },
                  ]}
                  data={minerData?.workers || []}
                  emptyMessage="No workers found"
                  renderRow={(w, idx) => (
                    <tr key={idx} className="os-table-row">
                      <td className="py-3 px-3">
                        <Link to={`/miner/${baseAddress}/${w.workerName}`} className="os-link">
                          {w.workerName}
                        </Link>
                      </td>
                      <td className="py-3 px-3 mono">{truncateAddress(w.minerEthAddress, 8)}</td>
                      <td className="py-3 px-3"><PortBadge port={w.entryport} /></td>
                      <td className="py-3 px-3 right emerald">{formatHashrate(w.avgHashrate || 0)}</td>
                      <td className="py-3 px-3 right">{rawToFormatted(w.alltimeTokenBalance)} ETI</td>
                      <td className="py-3 px-3 faded">{timeAgo(w.lastSubmittedSolutionTime)}</td>
                    </tr>
                  )}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Graph Tab */}
      {activeTab === 'Graph' && (
        <MinerGraphTab
          sharesChartData={sharesChartData}
          sharesLoading={sharesChartLoading}
          rewardsChartData={rewardsChartData}
          rewardsLoading={rewardsChartLoading}
        />
      )}

      {/* Shares Tab */}
      {activeTab === 'Shares' && (
        <div className="os-block">
          <SectionTitle color="emerald">Recent Shares</SectionTitle>
          {sharesLoading ? (
            <LoadingSkeleton type="table" />
          ) : (
            <DataTable
              columns={[
                { label: 'Block' },
                { label: 'Difficulty' },
                { label: 'Challenge Number' },
                { label: 'Port' },
              ]}
              data={(sharesData || []).slice(0, 100)}
              emptyMessage="No shares found"
              renderRow={(share, idx) => (
                <tr key={idx} className="os-table-row">
                  <td className="py-3 px-3">{share.block}</td>
                  <td className="py-3 px-3">{formatNumber(share.difficulty)}</td>
                  <td className="py-3 px-3 mono">{truncateAddress(share.challengeNumber, 8)}</td>
                  <td className="py-3 px-3"><PortBadge port={share.entryport} /></td>
                </tr>
              )}
            />
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'Payments' && (
        <div className="os-block">
          <SectionTitle color="cyan">Payouts</SectionTitle>
          {paymentsLoading ? (
            <LoadingSkeleton type="table" />
          ) : (
            <DataTable
              columns={[
                { label: 'Block' },
                { label: 'Amount', align: 'right' },
                { label: 'Batch UUID' },
                { label: 'Tx Hash' },
                { label: 'Status' },
              ]}
              data={paymentsData || []}
              emptyMessage="No payments found"
              renderRow={(payment, idx) => (
                <tr key={idx} className="os-table-row">
                  <td className="py-3 px-3">{payment.block}</td>
                  <td className="py-3 px-3 right emerald">{rawToFormatted(payment.amountToPay)} ETI</td>
                  <td className="py-3 px-3 mono">{truncateAddress(payment.batchedPaymentUuid, 6)}</td>
                  <td className="py-3 px-3">
                    {payment.txHash ? (
                      <a
                        href={`${ETICASCAN_URL}/tx/${payment.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="os-link-cyan"
                      >
                        {truncateAddress(payment.txHash, 8)}
                      </a>
                    ) : (
                      <span className="faded">--</span>
                    )}
                  </td>
                  <td className="py-3 px-3"><StatusBadge status={payment.confirmed ? 'confirmed' : (payment.batchedPaymentUuid ? 'pending' : 'unprocessed')} /></td>
                </tr>
              )}
            />
          )}
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'Rewards' && (
        <div className="os-block">
          <SectionTitle color="orange">PPNLS Rewards</SectionTitle>
          {rewardsLoading ? (
            <LoadingSkeleton type="table" />
          ) : (
            <DataTable
              columns={[
                { label: 'Epoch' },
                { label: 'Challenge' },
                { label: 'Pool Shares', align: 'right' },
                { label: 'My Shares', align: 'right' },
                { label: '% of Pool', align: 'right' },
                { label: 'Reward', align: 'right' },
              ]}
              data={rewardsData || []}
              emptyMessage="No rewards found"
              renderRow={(r, idx) => {
                const pct = r.poolshares > 0
                  ? ((r.shares / r.poolshares) * 100).toFixed(2) + '%'
                  : '0%';
                const reward = rawToFormatted(r.tokensAwarded) + ' ETI';
                const bonus =
                  r.bonusAwarded && r.bonusAwarded !== '0'
                    ? ' + ' + rawToFormatted(r.bonusAwarded)
                    : '';
                return (
                  <tr key={idx} className="os-table-row">
                    <td className="py-3 px-3">{r.epochCount}</td>
                    <td className="py-3 px-3 mono">{truncateAddress(r.ChallengeNumber, 6)}</td>
                    <td className="py-3 px-3 right">{r.poolshares}</td>
                    <td className="py-3 px-3 right">{r.shares}</td>
                    <td className="py-3 px-3 right emerald">{pct}</td>
                    <td className="py-3 px-3 right emerald">{reward}{bonus}</td>
                  </tr>
                );
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
