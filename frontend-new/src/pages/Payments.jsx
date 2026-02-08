import React, { useState } from 'react';
import SectionTitle from '../components/SectionTitle';
import DataCard from '../components/DataCard';
import DataRow from '../components/DataRow';
import DataTable from '../components/DataTable';
import TabNav from '../components/TabNav';
import StatusBadge from '../components/StatusBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { usePayments } from '../hooks/usePayments';
import { usePoolOverview } from '../hooks/usePoolOverview';
import {
  formatNumber,
  truncateAddress,
  rawToFormatted,
  mintStatusLabel,
} from '../lib/formatters';
import { ETICASCAN_URL } from '../config/constants';

const TABS = ['Pool Stats', 'Pool Mints', 'Batched Payments'];

export default function Payments() {
  const [activeTab, setActiveTab] = useState('Pool Stats');
  const { data: payData, isLoading: payLoading, isError: payError } = usePayments();
  const { data: overview, isLoading: ovLoading, isError: ovError } = usePoolOverview();

  const statsPayment = payData?.statsPayment;
  const poolMints = payData?.poolMints || [];
  const recentPayments = payData?.recentPaymentTxs || payData?.recentPayments || [];

  const poolData = overview?.poolData;
  const poolStatus = overview?.poolStatus;

  return (
    <div>
      <div className="os-heading">
        <h1 className="os-heading-title">PAYMENTS</h1>
      </div>

      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Pool Stats Tab */}
      {activeTab === 'Pool Stats' && (
        <div className="os-block">
          <SectionTitle color="emerald">Pool Balance Stats</SectionTitle>

          {payLoading || ovLoading ? (
            <LoadingSkeleton type="card" />
          ) : payError || ovError ? (
            <p className="faded">Failed to load payment data.</p>
          ) : (
            <DataCard accent="linear-gradient(90deg, var(--os-emerald), var(--os-cyan))">
              <div className="os-metrics col-2" style={{ marginBottom: '1rem' }}>
                <div className="os-metric">
                  <div className="os-metric-label">Total ETI Owed</div>
                  <div className="os-metric-value emerald">
                    {rawToFormatted(statsPayment?.actual_total_coins_owed)} ETI
                  </div>
                </div>
                <div className="os-metric">
                  <div className="os-metric-label">Next Batch</div>
                  <div className="os-metric-value emerald">
                    {rawToFormatted(statsPayment?.actual_total_next_coins_batchs)} ETI
                  </div>
                </div>
              </div>

              {statsPayment?.createdAt && (
                <DataRow label="Last Updated" className="faded">
                  {statsPayment.createdAt}
                </DataRow>
              )}
              <DataRow label="Minting Address">
                <a
                  href={`${ETICASCAN_URL}/address/${poolData?.mintingAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="os-link-cyan"
                >
                  {truncateAddress(poolData?.mintingAddress, 10)}
                </a>
              </DataRow>
              <DataRow label="Minting Address EGAZ">
                {rawToFormatted(poolStatus?.mintingAccountBalances?.ETH)} EGAZ
              </DataRow>
              <DataRow label="Minting Address ETI" className="emerald">
                {rawToFormatted(poolStatus?.mintingAccountBalances?.token)} ETI
              </DataRow>
              <DataRow label="Payments Address">
                <a
                  href={`${ETICASCAN_URL}/address/${poolData?.paymentsAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="os-link-cyan"
                >
                  {truncateAddress(poolData?.paymentsAddress, 10)}
                </a>
              </DataRow>
              {poolData?.paymentsNetwork && (
                <DataRow label="Payments Network" className="faded">
                  {poolData.paymentsNetwork}
                </DataRow>
              )}
              <DataRow label="Payments Address EGAZ">
                {rawToFormatted(poolStatus?.paymentsAccountBalances?.ETH)} EGAZ
              </DataRow>
              {poolData?.batchedPaymentsContractAddress && (
                <DataRow label="Batched Payments Contract">
                  <a
                    href={`${ETICASCAN_URL}/address/${poolData.batchedPaymentsContractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="os-link-cyan"
                  >
                    {truncateAddress(poolData.batchedPaymentsContractAddress, 10)}
                  </a>
                </DataRow>
              )}
              <DataRow label="Mining Pool Balance" className="emerald">
                {rawToFormatted(poolStatus?.paymentsAccountBalances?.token)} ETI
              </DataRow>
              <DataRow label="Min Payout" className="emerald">
                {rawToFormatted(poolData?.minBalanceForPayment)} ETI
              </DataRow>
            </DataCard>
          )}
        </div>
      )}

      {/* Pool Mints Tab */}
      {activeTab === 'Pool Mints' && (
        <div className="os-block">
          <SectionTitle color="cyan">Pool Mints</SectionTitle>

          {payLoading ? (
            <LoadingSkeleton type="table" />
          ) : payError ? (
            <p className="faded">Failed to load pool mints.</p>
          ) : (
            <DataTable
              columns={[
                { label: 'Epoch' },
                { label: 'Tx Hash' },
                { label: 'Status' },
                { label: 'Block Reward', align: 'right' },
              ]}
              data={poolMints}
              emptyMessage="No pool mints yet"
              renderRow={(item, idx) => (
                <tr key={idx} className="os-table-row">
                  <td className="py-3 px-3">
                    <span className="cyan">{formatNumber(item.epochCount)}</span>
                  </td>
                  <td className="py-3 px-3">
                    <a
                      href={`${ETICASCAN_URL}/tx/${item.transactionhash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="os-link-cyan"
                    >
                      {truncateAddress(item.transactionhash, 10)}
                    </a>
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={mintStatusLabel(item.poolstatus)} />
                  </td>
                  <td className="py-3 px-3 right">
                    <span className="emerald">{rawToFormatted(item.blockreward)} ETI</span>
                  </td>
                </tr>
              )}
            />
          )}
        </div>
      )}

      {/* Batched Payments Tab */}
      {activeTab === 'Batched Payments' && (
        <div className="os-block">
          <SectionTitle color="orange">Batched Payments</SectionTitle>

          {payLoading ? (
            <LoadingSkeleton type="table" />
          ) : payError ? (
            <p className="faded">Failed to load batched payments.</p>
          ) : (
            <DataTable
              columns={[
                { label: 'Block' },
                { label: 'Tx Hash' },
                { label: 'Status' },
              ]}
              data={recentPayments}
              emptyMessage="No batched payments yet"
              renderRow={(item, idx) => (
                <tr key={idx} className="os-table-row">
                  <td className="py-3 px-3">
                    <span className="faded">{formatNumber(item.block)}</span>
                  </td>
                  <td className="py-3 px-3">
                    <a
                      href={`${ETICASCAN_URL}/tx/${item.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="os-link-cyan"
                    >
                      {truncateAddress(item.txHash, 10)}
                    </a>
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}
