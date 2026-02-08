import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMinerProfile } from '../hooks/useMinerProfile';
import { useMinerShares } from '../hooks/useMinerShares';
import { useMinerPayments } from '../hooks/useMinerPayments';
import { useMinerRewards } from '../hooks/useMinerRewards';
import DataCard from '../components/DataCard';
import DataRow from '../components/DataRow';
import DataTable from '../components/DataTable';
import TabNav from '../components/TabNav';
import SectionTitle from '../components/SectionTitle';
import PortBadge from '../components/PortBadge';
import StatusBadge from '../components/StatusBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import StatsGrid from '../components/StatsGrid';
import {
  formatHashrate,
  timeAgo,
  formatNumber,
  truncateAddress,
  rawToFormatted,
} from '../lib/formatters';
import { ETICASCAN_URL } from '../config/constants';

const TABS = ['Overview', 'Shares', 'Payments', 'Rewards'];

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
      {/* 1. Header */}
      <div className="os-heading">
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
                  <td className="py-3 px-3"><StatusBadge status={payment.status} /></td>
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
                { label: 'Port' },
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
                    <td className="py-3 px-3"><PortBadge port={r.minerport} /></td>
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
