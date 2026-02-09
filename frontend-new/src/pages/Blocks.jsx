import React, { useMemo } from 'react';
import DataTable from '../components/DataTable';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useBlocks } from '../hooks/useBlocks';
import { useNetwork } from '../hooks/useNetwork';
import { formatNumber, truncateAddress } from '../lib/formatters';
import { ETICASCAN_URL } from '../config/constants';

export default function Epochs() {
  const { data: blocks, isLoading, isError } = useBlocks();
  const { data: networkData } = useNetwork();
  const blockList = Array.isArray(blocks) ? blocks : [];

  // Build address → pool name lookup from poolList
  const poolNameMap = useMemo(() => {
    const map = {};
    if (networkData?.poolList) {
      networkData.poolList.forEach(pool => {
        if (pool.mintAddress) {
          map[pool.mintAddress.toLowerCase()] = pool.name;
        }
      });
    }
    return map;
  }, [networkData?.poolList]);

  function getMinerDisplay(address) {
    if (!address) return '—';
    const poolName = poolNameMap[address.toLowerCase()];
    return poolName || truncateAddress(address, 8);
  }

  return (
    <div>
      <div className="os-heading">
        <h1 className="os-heading-title">EPOCHS</h1>
        {blockList.length > 0 && (
          <p className="os-heading-sub">
            Last miner:{' '}
            <span className="emerald">{getMinerDisplay(blockList[0].from)}</span>
          </p>
        )}
      </div>

      <div className="os-block">
        {isLoading ? (
          <LoadingSkeleton type="table" />
        ) : isError ? (
          <p className="faded">Failed to load blocks data.</p>
        ) : (
          <DataTable
            columns={[
              { label: 'Epoch' },
              { label: 'Transaction Hash' },
              { label: 'Miner' },
            ]}
            data={blockList}
            emptyMessage="No blocks found"
            renderRow={(item, idx) => (
              <tr key={idx} className="os-table-row">
                <td className="py-3 px-3">
                  <span className="emerald">{formatNumber(item.epochCount)}</span>
                </td>
                <td className="py-3 px-3 mono">
                  <a
                    href={`${ETICASCAN_URL}/tx/${item.transactionhash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="os-link-cyan"
                  >
                    {truncateAddress(item.transactionhash, 10)}
                  </a>
                </td>
                <td className="py-3 px-3 mono">
                  <a
                    href={`${ETICASCAN_URL}/address/${item.from}`}
                    target="_blank"
                    rel="noreferrer"
                    className="os-link"
                  >
                    {getMinerDisplay(item.from)}
                  </a>
                </td>
              </tr>
            )}
          />
        )}
      </div>
    </div>
  );
}
