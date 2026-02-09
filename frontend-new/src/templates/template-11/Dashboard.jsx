import React from 'react';
import { Link } from 'react-router-dom';
import { poolData, poolNameAndUrl, formatHashrate, timeAgo, formatNumber, truncateAddress, rawToFormatted } from '../../mock-data';
import './styles.css';

/* ────── Helpers ────── */

function portColorClass(port) {
  const map = { 3333: 'void-port-3333', 5555: 'void-port-5555', 7777: 'void-port-7777', 9999: 'void-port-9999' };
  return map[port] || 'text-zinc-400';
}

/* ────── Main Dashboard ────── */

export default function Dashboard() {
  const { pool, miners, recentBlocks, network, payouts, miningContract, poolStatus, stratumPorts } = poolData;
  const fees = poolStatus.poolFeesMetrics;

  return (
    <div className="void-bg min-h-screen font-jetbrains text-zinc-200">

      {/* ══════ HEADER ══════ */}
      <header className="px-4 sm:px-8 pt-6 pb-4">
        <div className="max-w-6xl mx-auto">
          {/* Top line */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <img src="/images/eti-logo.png" alt="ETI" className="w-8 h-8" />
              <span className="text-sm font-bold text-zinc-100 tracking-widest uppercase">
                {poolNameAndUrl.poolName}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="void-dot-active" />
                <span className="text-[10px] text-green-500 uppercase tracking-widest font-bold">
                  {poolStatus.poolStatus}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="0x... search address"
                className="void-search px-3 py-1.5 text-xs w-48 sm:w-56 rounded"
                readOnly
              />
              <Link
                to="/"
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                &larr; back
              </Link>
            </div>
          </div>

          {/* Ports line */}
          <div className="text-[10px] text-zinc-600 mt-2 tracking-wider">
            {poolNameAndUrl.poolUrl}
            {stratumPorts.map((sp) => (
              <span key={sp.port}>
                {' '}| <span className={portColorClass(sp.port)}>:{sp.port}</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="void-rule max-w-6xl mx-auto" />

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-10">

        {/* ══════ STATS BLOCK ══════ */}
        <section>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-8 gap-y-6">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Hashrate</div>
              <div className="text-xl font-bold void-cyan">{formatHashrate(pool.hashrate)}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Miners</div>
              <div className="text-xl font-bold text-zinc-100">{pool.miners}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Workers</div>
              <div className="text-xl font-bold text-zinc-100">{pool.workers}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Blocks</div>
              <div className="text-xl font-bold text-zinc-100">{formatNumber(pool.blocksFound)}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Share</div>
              <div className="text-xl font-bold text-zinc-100">{pool.poolSharePercent}%</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Fee</div>
              <div className="text-xl font-bold text-zinc-100">{pool.poolFee}%</div>
            </div>
          </div>
        </section>

        <div className="void-rule" />

        {/* ══════ MINING CONTRACT ══════ */}
        <section>
          <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Mining Contract</h2>
          <div className="space-y-2 text-xs">
            <div className="flex gap-4">
              <span className="text-zinc-500 w-28 shrink-0">RANDOMX BLOB</span>
              <span className="text-zinc-600 void-hash truncate">{miningContract.randomxBlob}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-zinc-500 w-28 shrink-0">SEEDHASH</span>
              <span className="text-zinc-600 void-hash truncate">{miningContract.randomxSeedhash}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-zinc-500 w-28 shrink-0">CHALLENGE</span>
              <span className="text-zinc-600 void-hash truncate">{miningContract.challengeNumber}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-zinc-500 w-28 shrink-0">EPOCH</span>
              <span className="text-zinc-100">{formatNumber(miningContract.epochCount)}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-zinc-500 w-28 shrink-0">DIFFICULTY</span>
              <span className="text-zinc-100">{formatNumber(miningContract.miningDifficulty)}</span>
            </div>
          </div>
        </section>

        <div className="void-rule" />

        {/* ══════ ACCOUNTS ══════ */}
        <section>
          <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
            {/* Minting */}
            <div className="space-y-1">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Minting</div>
              <div className="text-zinc-400 void-hash truncate">{poolData.mintingAddress}</div>
              <div className="text-zinc-600">{poolData.mintingNetwork}</div>
              <div className="mt-2">
                <span className="text-zinc-400">{rawToFormatted(poolStatus.mintingAccountBalances.ETH)} EGAZ</span>
                <span className="text-zinc-600 mx-2">|</span>
                <span className="void-cyan">{rawToFormatted(poolStatus.mintingAccountBalances.token)} ETI</span>
              </div>
            </div>
            {/* Payments */}
            <div className="space-y-1">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Payments</div>
              <div className="text-zinc-400 void-hash truncate">{poolData.paymentsAddress}</div>
              <div className="text-zinc-600">{poolData.paymentsNetwork}</div>
              <div className="mt-2">
                <span className="text-zinc-400">{rawToFormatted(poolStatus.paymentsAccountBalances.ETH)} EGAZ</span>
                <span className="text-zinc-600 mx-2">|</span>
                <span className="void-cyan">{rawToFormatted(poolStatus.paymentsAccountBalances.token)} ETI</span>
              </div>
            </div>
          </div>
        </section>

        <div className="void-rule" />

        {/* ══════ CONTRACTS ══════ */}
        <section>
          <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Contracts</h2>
          <div className="space-y-2 text-xs">
            <div className="flex gap-4">
              <span className="text-zinc-500 w-28 shrink-0">SMART CONTRACT</span>
              <span className="text-zinc-400 void-hash truncate">{poolData.smartContractAddress}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-zinc-500 w-28 shrink-0">PAYMENTS</span>
              <span className="text-zinc-400 void-hash truncate">{poolData.batchedPaymentsContractAddress}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-zinc-500 w-28 shrink-0">MIN PAYOUT</span>
              <span className="void-cyan">{rawToFormatted(poolData.minBalanceForPayment)} ETI</span>
            </div>
          </div>
        </section>

        <div className="void-rule" />

        {/* ══════ FEES — one line ══════ */}
        <section>
          <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Fees</h2>
          <div className="text-xs flex flex-wrap gap-x-6 gap-y-1">
            <span>
              <span className="text-zinc-500">REWARD:</span>{' '}
              <span className="void-cyan">{rawToFormatted(fees.miningRewardRaw)} ETI</span>
            </span>
            <span className="text-zinc-700">|</span>
            <span>
              <span className="text-zinc-500">ETI/EGAZ:</span>{' '}
              <span className="text-zinc-200">{fees.token_Eth_Price_Ratio}</span>
            </span>
            <span className="text-zinc-700">|</span>
            <span>
              <span className="text-zinc-500">BASE FEE:</span>{' '}
              <span className="text-zinc-200">{fees.poolBaseFee}</span>
            </span>
            <span className="text-zinc-700">|</span>
            <span>
              <span className="text-zinc-500">GAS:</span>{' '}
              <span className="text-zinc-200">{fees.avgGasPriceGWei} GWei</span>
            </span>
          </div>
        </section>

        <div className="void-rule" />

        {/* ══════ NETWORK — one line ══════ */}
        <section>
          <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Network</h2>
          <div className="text-xs flex flex-wrap gap-x-6 gap-y-1">
            <span>
              <span className="text-zinc-500">BLOCK:</span>{' '}
              <span className="text-zinc-200">{formatNumber(network.blockHeight)}</span>
            </span>
            <span className="text-zinc-700">|</span>
            <span>
              <span className="text-zinc-500">DIFF:</span>{' '}
              <span className="text-zinc-200">{formatNumber(network.difficulty)}</span>
            </span>
            <span className="text-zinc-700">|</span>
            <span>
              <span className="text-zinc-500">ETI:</span>{' '}
              <span className="void-cyan">${network.etiPriceUsd}</span>
              <span className="text-zinc-600"> / {network.etiPrice} ETH</span>
            </span>
            <span className="text-zinc-700">|</span>
            <span>
              <span className="text-zinc-500">GAS:</span>{' '}
              <span className="text-zinc-200">{network.gasPrice} GWei</span>
            </span>
          </div>
        </section>

        <div className="void-rule" />

        {/* ══════ MINER TABLE ══════ */}
        <section>
          <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Top Miners</h2>
          <div className="overflow-x-auto void-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-600 text-[10px] uppercase tracking-widest">
                  <th className="text-left py-2 pr-4 font-normal">#</th>
                  <th className="text-left py-2 pr-4 font-normal">Address</th>
                  <th className="text-right py-2 pr-4 font-normal">Hashrate</th>
                  <th className="text-right py-2 pr-4 font-normal">Earned</th>
                  <th className="text-right py-2 pr-4 font-normal">Received</th>
                  <th className="text-right py-2 font-normal">Port</th>
                </tr>
              </thead>
              <tbody>
                {miners.slice(0, 10).map((miner, idx) => (
                  <tr key={miner.minerEthAddress} className="void-row border-b border-zinc-900">
                    <td className="py-2.5 pr-4 text-zinc-600">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-2.5 pr-4 text-zinc-400">
                      {truncateAddress(miner.minerEthAddress, 8)}
                    </td>
                    <td className="py-2.5 pr-4 text-right void-cyan">
                      {formatHashrate(miner.avgHashrate)}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-zinc-300">
                      {rawToFormatted(miner.alltimeTokenBalance)} ETI
                    </td>
                    <td className="py-2.5 pr-4 text-right text-zinc-300">
                      {rawToFormatted(miner.tokensReceived)} ETI
                    </td>
                    <td className={`py-2.5 text-right ${portColorClass(miner.entryport)}`}>
                      {miner.entryport}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="void-rule" />

        {/* ══════ BLOCKS + PAYOUTS ══════ */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Recent Blocks */}
          <div>
            <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Recent Blocks</h2>
            <div className="space-y-0 void-scroll max-h-80 overflow-y-auto">
              {recentBlocks.map((block) => (
                <div
                  key={block.epoch}
                  className="void-row py-2.5 border-b border-zinc-900 text-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-zinc-400">EPOCH {formatNumber(block.epoch)}</span>
                    <span className="void-cyan">{block.reward} ETI</span>
                    <span className="text-zinc-600 truncate hidden sm:inline">{block.finder}</span>
                  </div>
                  <span className="text-zinc-600 shrink-0">{timeAgo(block.time)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payouts */}
          <div>
            <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Recent Payouts</h2>
            <div className="space-y-0 void-scroll max-h-80 overflow-y-auto">
              {payouts.map((payout, idx) => (
                <div
                  key={idx}
                  className="void-row py-2.5 border-b border-zinc-900 text-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-zinc-400 truncate">{payout.address}</span>
                    <span className="void-cyan">{payout.amount} ETI</span>
                    <span className="text-zinc-700 truncate hidden sm:inline">
                      TX: {truncateAddress(payout.txHash, 6)}
                    </span>
                  </div>
                  <span className="text-zinc-600 shrink-0">{timeAgo(payout.time)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="void-rule" />

        {/* ══════ FOOTER ══════ */}
        <footer className="pb-8 text-[10px] text-zinc-600 tracking-wider">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>CONTRACT: {truncateAddress(poolData.smartContractAddress, 8)}</span>
            <span>
              STRATUM:{' '}
              {stratumPorts.map((sp, i) => (
                <span key={sp.port}>
                  {i > 0 && ' | '}
                  <span className={portColorClass(sp.port)}>:{sp.port}</span>
                </span>
              ))}
            </span>
            <span>MIN PAYOUT: {pool.minimumPayout} ETI</span>
            <span>FEE: {pool.poolFee}%</span>
          </div>
          <div className="mt-2 text-zinc-700">
            Etica Mining Pool &mdash; Decentralized Protocol Research
          </div>
        </footer>
      </main>
    </div>
  );
}
