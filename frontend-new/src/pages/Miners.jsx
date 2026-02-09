import React from 'react';
import { Link } from 'react-router-dom';
import { useMiners } from '../hooks/useMiners';
import DataTable from '../components/DataTable';
import PortBadge from '../components/PortBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { formatHashrate, timeAgo, truncateAddress, rawToFormatted } from '../lib/formatters';

export default function Miners() {
  const { data: miners, isLoading, isError } = useMiners();

  if (isLoading) {
    return (
      <div>
        <div className="os-heading">
          <h1 className="os-heading-title">Active Miners</h1>
          <p className="os-heading-sub">Loading...</p>
        </div>
        <LoadingSkeleton type="table" />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <div className="os-heading">
          <h1 className="os-heading-title">Active Miners</h1>
        </div>
        <div className="text-center py-12 faded">
          Failed to load miners. Please try again later.
        </div>
      </div>
    );
  }

  const minerList = miners || [];
  const totalWorkers = minerList.reduce((sum, m) => sum + (m.workers || 0), 0);

  return (
    <div>
      <div className="os-heading">
        <h1 className="os-heading-title">Active Miners</h1>
        <p className="os-heading-sub">
          {minerList.length} miners, {totalWorkers} workers
        </p>
      </div>

      <DataTable
        columns={[
          { label: '#' },
          { label: 'Address' },
          { label: 'Hashrate', align: 'right' },
          { label: 'Total ETI', align: 'right' },
          { label: 'Received', align: 'right' },
          { label: 'Port' },
          { label: 'Last Seen' },
        ]}
        data={minerList}
        emptyMessage="No active miners"
        renderRow={(miner, idx) => (
          <tr key={miner.minerEthAddress} className="os-table-row">
            <td className="py-3 px-3 faded">{idx + 1}</td>
            <td className="py-3 px-3">
              <Link to={`/miner/${miner.minerEthAddress}`} className="os-link">
                {truncateAddress(miner.minerEthAddress, 8)}
              </Link>
            </td>
            <td className="py-3 px-3 text-right">
              <span className="cyan">{formatHashrate(miner.avgHashrate || 0)}</span>
            </td>
            <td className="py-3 px-3 text-right">
              <span className="emerald">{rawToFormatted(miner.alltimeTokenBalance)} ETI</span>
            </td>
            <td className="py-3 px-3 text-right">
              <span className="emerald">{rawToFormatted(miner.tokensReceived)} ETI</span>
            </td>
            <td className="py-3 px-3">
              <PortBadge port={miner.entryport} />
            </td>
            <td className="py-3 px-3 faded">{timeAgo(miner.lastSubmittedSolutionTime)}</td>
          </tr>
        )}
      />
    </div>
  );
}
