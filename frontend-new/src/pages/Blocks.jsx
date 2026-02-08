import React from 'react';
import DataTable from '../components/DataTable';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useBlocks } from '../hooks/useBlocks';
import { formatNumber, truncateAddress } from '../lib/formatters';
import { ETICASCAN_URL } from '../config/constants';

export default function Blocks() {
  const { data: blocks, isLoading, isError } = useBlocks();
  const blockList = Array.isArray(blocks) ? blocks : [];

  return (
    <div>
      <div className="os-heading">
        <h1 className="os-heading-title">BLOCKS & EPOCHS</h1>
        {blockList.length > 0 && (
          <p className="os-heading-sub">
            Last miner:{' '}
            <span className="emerald">{truncateAddress(blockList[0].from, 8)}</span>
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
                    {truncateAddress(item.from, 8)}
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
