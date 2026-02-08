import React from 'react';
import SectionTitle from '../components/SectionTitle';
import DataTable from '../components/DataTable';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useNetwork } from '../hooks/useNetwork';
import {
  formatHashrate,
  formatNumber,
  timeAgo,
  truncateAddress,
} from '../lib/formatters';
import { ETICASCAN_URL } from '../config/constants';

export default function Network() {
  const { data, isLoading, isError } = useNetwork();

  const poolList = data?.poolList || [];
  const mintAddresses = data?.mintAddresses || [];

  const totalMiners = poolList.reduce((sum, p) => sum + (p.Numberminers || 0), 0);
  const totalHashrate = formatHashrate(
    poolList.reduce((sum, p) => sum + (p.Hashrate || 0), 0),
  );

  return (
    <div>
      <div className="os-heading">
        <h1 className="os-heading-title">NETWORK</h1>
      </div>

      {/* Network Pools */}
      <div className="os-block">
        <SectionTitle color="emerald">
          Active Pools — {formatNumber(totalMiners)} miners, {totalHashrate} total
        </SectionTitle>

        {isLoading ? (
          <LoadingSkeleton type="table" />
        ) : isError ? (
          <p className="faded">Failed to load network data.</p>
        ) : (
          <DataTable
            columns={[
              { label: 'Pool Name' },
              { label: 'URL' },
              { label: 'Mint Address' },
              { label: 'Miners', align: 'right' },
              { label: 'Hashrate', align: 'right' },
              { label: 'Last Update' },
            ]}
            data={poolList}
            emptyMessage="No pools found"
            renderRow={(pool, idx) => (
              <tr
                key={idx}
                className="os-table-row"
                style={pool.poolserver ? { background: 'rgba(52, 211, 153, 0.06)' } : undefined}
              >
                <td className="py-3 px-3">
                  <a
                    href={pool.url}
                    target="_blank"
                    rel="noreferrer"
                    className="os-link"
                  >
                    {pool.name}
                    {pool.poolserver && <span className="emerald"> (this pool)</span>}
                  </a>
                </td>
                <td className="py-3 px-3 faded">{pool.url}</td>
                <td className="py-3 px-3 mono">
                  <a
                    href={`${ETICASCAN_URL}/address/${pool.mintAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="os-link-cyan"
                  >
                    {truncateAddress(pool.mintAddress, 8)}
                  </a>
                </td>
                <td className="py-3 px-3 right">{pool.Numberminers}</td>
                <td className="py-3 px-3 right">
                  <span className="cyan">{formatHashrate(pool.Hashrate || 0)}</span>
                </td>
                <td className="py-3 px-3 faded">{timeAgo(pool.lastupdate)}</td>
              </tr>
            )}
          />
        )}
      </div>

      {/* Mint Addresses */}
      <div className="os-block">
        <SectionTitle color="cyan">Mint Addresses</SectionTitle>

        {isLoading ? (
          <LoadingSkeleton type="table" />
        ) : isError ? (
          <p className="faded">Failed to load mint addresses.</p>
        ) : (
          <DataTable
            columns={[
              { label: 'Mint Address' },
              { label: 'Pool Name' },
              { label: 'Pool URL' },
            ]}
            data={mintAddresses}
            emptyMessage="No mint addresses found"
            renderRow={(item, idx) => (
              <tr key={idx} className="os-table-row">
                <td className="py-3 px-3">
                  <a
                    href={`${ETICASCAN_URL}/address/${item.mintAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="os-link-cyan"
                  >
                    {truncateAddress(item.mintAddress, 10)}
                  </a>
                </td>
                <td className="py-3 px-3">{item.name}</td>
                <td className="py-3 px-3 faded">{item.url}</td>
              </tr>
            )}
          />
        )}
      </div>
    </div>
  );
}
