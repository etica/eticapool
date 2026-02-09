import React from 'react';
import DataTable from '../components/DataTable';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useNetwork } from '../hooks/useNetwork';
import { truncateAddress } from '../lib/formatters';
import { ETICASCAN_URL } from '../config/constants';

export default function MintAddresses() {
  const { data, isLoading, isError } = useNetwork();

  const mintAddresses = data?.mintAddresses || [];

  return (
    <div>
      <div className="os-heading">
        <h1 className="os-heading-title">MINT ADDRESSES</h1>
      </div>

      <div className="os-block">
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
