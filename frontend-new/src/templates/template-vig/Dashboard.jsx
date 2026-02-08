import React, { useState } from 'react';
import { poolData, poolNameAndUrl, formatHashrate, timeAgo, formatNumber, truncateAddress, rawToFormatted } from '../../mock-data';

/* ── VIG-style decorative Plus SVG ── */
function Plus({ className = '' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M8 1V15M1 8H15" stroke="inherit" strokeLinecap="square" />
    </svg>
  );
}

/* ── VIG-style section divider line ── */
function Divider() {
  return <div style={{ height: 1, background: 'white', opacity: 0.08, margin: '2rem 0' }} />;
}

/* ── VIG-style section line with label ── */
function SectionLine({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '3.5rem 0' }}>
      <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.12)' }} />
      <Plus className="stroke-white" />
      <span style={{ fontSize: 12, fontWeight: 500, color: 'white', letterSpacing: '0.14em' }}>{label}</span>
      <Plus className="stroke-white" />
      <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.12)' }} />
    </div>
  );
}

export default function VigDashboard() {
  const [activePage, setActivePage] = useState('Dashboard');
  const { pool, network, miningContract, poolStatus, stratumPorts } = poolData;
  const fees = poolStatus.poolFeesMetrics;

  const navItems = ['Dashboard', 'Miners', 'Blocks', 'Payments', 'Network'];

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase' }}>
      {/* ─── GOOGLE FONT ─── */}
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* ═══ HEADER ═══ */}
      <header style={{ padding: '1.75rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="px-8 xl:px-16" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/images/eti-logo.png" alt="ETI" style={{ width: 32, height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.1em' }}>ETICA POOL</span>
          </div>

          {/* Nav — VIG bordered buttons with dividers */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Plus className="stroke-white" style={{ marginRight: 16 }} />
            <div style={{ display: 'flex', border: '1px solid white' }}>
              {navItems.map((item, i) => (
                <React.Fragment key={item}>
                  {i > 0 && <div style={{ width: 1, background: 'white' }} />}
                  <button
                    onClick={() => setActivePage(item)}
                    style={{
                      padding: '0.4rem 1.25rem',
                      fontSize: 12,
                      fontWeight: 500,
                      fontFamily: 'inherit',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: activePage === item ? '#fff' : 'transparent',
                      color: activePage === item ? '#000' : '#fff',
                    }}
                    onMouseEnter={(e) => { if (activePage !== item) { e.target.style.background = 'rgba(255,255,255,0.15)'; } }}
                    onMouseLeave={(e) => { if (activePage !== item) { e.target.style.background = 'transparent'; } }}
                  >
                    {item}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <Plus className="stroke-white" style={{ marginLeft: 16 }} />
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search 0x..."
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: 12,
              padding: '0.4rem 1rem',
              width: 200,
              outline: 'none',
              textTransform: 'uppercase',
            }}
          />
        </div>
      </header>

      {/* ═══ HERO SECTION ═══ */}
      <div className="px-8 xl:px-16" style={{ paddingTop: '4rem', paddingBottom: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 300, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            MINING
          </h1>
          <h1 style={{ fontSize: '3rem', fontWeight: 300, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            DASHBOARD
          </h1>
        </div>

        {/* Mission box — VIG style bordered with Plus corners */}
        <div style={{ position: 'relative', width: '320px', border: '1px solid rgba(255,255,255,0.3)', padding: 14, margin: '2.5rem 0 0 0' }}>
          <p style={{ fontSize: 12, fontWeight: 400, lineHeight: 1.7, opacity: 0.85, textTransform: 'none' }}>
            Etica mining pool — RandomX proof of work. Join the decentralized scientific research network.
          </p>
          <Plus className="stroke-white" style={{ position: 'absolute', top: 0, left: 0, transform: 'translate(-50%,-50%)' }} />
          <Plus className="stroke-white" style={{ position: 'absolute', bottom: 0, right: 0, transform: 'translate(50%,50%)' }} />
          <p style={{ position: 'absolute', top: '-1.6rem', left: 0, color: '#06b6d4', fontSize: 11, fontWeight: 500 }}>
            {'/// LIVE'}
          </p>
        </div>
      </div>

      {/* ═══ POOL STATS ═══ */}
      <SectionLine label="Pool Stats" />

      <div className="px-8 xl:px-16">
        {/* About-style: 2 columns like VIG's About section */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '3rem' }}>
          {/* Left: Big stats */}
          <div style={{ width: '100%', maxWidth: 500 }}>
            <Plus className="stroke-[#06b6d4]" />
            <p style={{ fontSize: '1.5rem', fontWeight: 300, marginTop: 8 }}>
              {formatHashrate(pool.hashrate)} Hashrate
            </p>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
              <div style={{ height: 1, flex: 1, background: '#06b6d4' }} />
              <Plus className="stroke-[#06b6d4]" style={{ marginLeft: 8 }} />
            </div>
            <p style={{ fontSize: 14, marginTop: '2.5rem', opacity: 0.65, fontWeight: 400, textTransform: 'none', lineHeight: 1.8 }}>
              24h Average: {formatHashrate(pool.hashrate24h)} — {formatNumber(pool.miners)} active miners with {formatNumber(pool.workers)} workers. {formatNumber(pool.blocksFound)} blocks found. Pool share: {pool.poolSharePercent}% of network.
            </p>
          </div>

          {/* Right: Stats cards in VIG card grid style */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, flex: 1, minWidth: 300 }}>
            {[
              { label: 'Hashrate', value: formatHashrate(pool.hashrate), color: '#06b6d4' },
              { label: '24h Avg', value: formatHashrate(pool.hashrate24h), color: '#06b6d4' },
              { label: 'Miners', value: formatNumber(pool.miners), color: '#fff' },
              { label: 'Workers', value: formatNumber(pool.workers), color: '#fff' },
              { label: 'Blocks', value: formatNumber(pool.blocksFound), color: '#06b6d4' },
              { label: 'Pool Share', value: pool.poolSharePercent + '%', color: '#06b6d4' },
            ].map((stat, i) => (
              <div key={i} style={{ width: '50%', padding: '1.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 6 }}>{stat.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ NETWORK ═══ */}
      <SectionLine label="Network" />

      <div className="px-8 xl:px-16">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem 4rem', fontSize: 14 }}>
          {[
            { label: 'Block', value: formatNumber(network.blockHeight), color: '#fff' },
            { label: 'Difficulty', value: formatNumber(network.difficulty), color: '#fff' },
            { label: 'ETI Price', value: '$' + network.etiPriceUsd, color: '#22c55e' },
            { label: 'Gas', value: network.gasPrice + ' gwei', color: '#ef4444' },
            { label: 'Epoch', value: formatNumber(network.epoch), color: '#fff' },
          ].map((item, i) => (
            <div key={i}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginRight: 8 }}>{item.label}</span>
              <span style={{ color: item.color, fontWeight: 600 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ KEY FEATURES / MINING CONTRACT ═══ */}
      <SectionLine label="Mining Contract" />

      <div className="px-8 xl:px-16">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {[
            { label: 'RandomX Blob', value: miningContract.randomxBlob.slice(0, 32) + '...' },
            { label: 'Seedhash', value: miningContract.randomxSeedhash.slice(0, 28) + '...' },
            { label: 'Challenge', value: miningContract.challengeNumber.slice(0, 20) + '...' },
            { label: 'Epoch Count', value: formatNumber(miningContract.epochCount) },
            { label: 'Mining Diff', value: formatNumber(miningContract.miningDifficulty) },
          ].map((item, i) => (
            <div key={i} style={{ width: '100%', maxWidth: '48%', padding: '2rem 1rem 2rem 0' }}>
              <Plus className="stroke-white" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 300, marginTop: 6 }}>{item.label}</h2>
              <div style={{ height: 1, background: 'white', opacity: 0.08, margin: '1rem 0 1.5rem 0' }} />
              <p style={{ opacity: 0.65, fontSize: 13, wordBreak: 'break-all', textTransform: 'none' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ACCOUNTS ═══ */}
      <SectionLine label="Accounts" />

      <div className="px-8 xl:px-16">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '2rem' }}>
          {/* Minting Account */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <Plus className="stroke-[#06b6d4]" />
            <p style={{ fontSize: '1.25rem', fontWeight: 300, marginTop: 8 }}>Minting Account</p>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
              <div style={{ height: 1, flex: 1, background: '#06b6d4' }} />
              <Plus className="stroke-[#06b6d4]" style={{ marginLeft: 8 }} />
            </div>
            <div style={{ marginTop: '2rem' }}>
              {[
                { k: 'Address', v: truncateAddress(poolData.mintingAddress, 12), c: 'rgba(255,255,255,0.6)' },
                { k: 'Network', v: poolData.mintingNetwork, c: '#fff' },
                { k: 'EGAZ', v: rawToFormatted(poolStatus.mintingAccountBalances.ETH) + ' EGAZ', c: '#fff' },
                { k: 'ETI', v: rawToFormatted(poolStatus.mintingAccountBalances.token) + ' ETI', c: '#22c55e' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>{row.k}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: row.c }}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payments Account */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <Plus className="stroke-[#06b6d4]" />
            <p style={{ fontSize: '1.25rem', fontWeight: 300, marginTop: 8 }}>Payments Account</p>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
              <div style={{ height: 1, flex: 1, background: '#06b6d4' }} />
              <Plus className="stroke-[#06b6d4]" style={{ marginLeft: 8 }} />
            </div>
            <div style={{ marginTop: '2rem' }}>
              {[
                { k: 'Address', v: truncateAddress(poolData.paymentsAddress, 12), c: 'rgba(255,255,255,0.6)' },
                { k: 'Network', v: poolData.paymentsNetwork, c: '#fff' },
                { k: 'EGAZ', v: rawToFormatted(poolStatus.paymentsAccountBalances.ETH) + ' EGAZ', c: '#fff' },
                { k: 'ETI', v: rawToFormatted(poolStatus.paymentsAccountBalances.token) + ' ETI', c: '#22c55e' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>{row.k}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: row.c }}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ POOL FEES ═══ */}
      <SectionLine label="Pool Fees" />

      <div className="px-8 xl:px-16">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {[
            { label: 'Mining Reward', value: rawToFormatted(fees.miningRewardRaw) + ' ETI', color: '#22c55e' },
            { label: 'ETI/EGAZ Ratio', value: fees.token_Eth_Price_Ratio, color: '#fff' },
            { label: 'Pool Fee', value: (fees.poolBaseFee * 100).toFixed(0) + '%', color: '#ef4444' },
            { label: 'Gas Price', value: fees.avgGasPriceGWei + ' gwei', color: '#ef4444' },
            { label: 'Bonus', value: String(fees.poolRewardsBonus), color: '#fff' },
          ].map((item, i) => (
            <div key={i} style={{ width: '100%', maxWidth: '48%', padding: '2rem 1rem 2rem 0' }}>
              <Plus className="stroke-white" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 300, marginTop: 6 }}>{item.label}</h2>
              <div style={{ height: 1, background: 'white', opacity: 0.08, margin: '1rem 0 1.5rem 0' }} />
              <p style={{ color: item.color, fontSize: 20, fontWeight: 700 }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RECENT BLOCKS ═══ */}
      <SectionLine label="Recent Blocks" />

      <div className="px-8 xl:px-16">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {['Epoch', 'Hash', 'Reward', 'Finder', 'Time'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {poolData.recentBlocks.slice(0, 8).map((block, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '1rem 1.5rem' }}>{block.epoch}</td>
                <td style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.5)' }}>{truncateAddress(block.hash, 10)}</td>
                <td style={{ padding: '1rem 1.5rem', color: '#22c55e', fontWeight: 600 }}>{block.reward} ETI</td>
                <td style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.5)' }}>{truncateAddress(block.finder)}</td>
                <td style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.3)' }}>{timeAgo(block.time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ RECENT PAYOUTS ═══ */}
      <SectionLine label="Recent Payouts" />

      <div className="px-8 xl:px-16">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {['Address', 'Amount', 'Tx Hash', 'Time', 'Status'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {poolData.payouts.map((payout, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '1rem 1.5rem' }}>{payout.address}</td>
                <td style={{ padding: '1rem 1.5rem', color: '#22c55e', fontWeight: 600 }}>{payout.amount} ETI</td>
                <td style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.5)' }}>{truncateAddress(payout.txHash)}</td>
                <td style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.3)' }}>{timeAgo(payout.time)}</td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{ color: payout.status === 'confirmed' ? '#22c55e' : '#f59e0b', fontSize: 11, fontWeight: 600 }}>
                    {payout.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ GETTING STARTED ═══ */}
      <SectionLine label="Getting Started" />

      <div className="px-8 xl:px-16" style={{ paddingBottom: '3rem' }}>
        {/* Stratum URL */}
        <div style={{ position: 'relative', border: '1px solid rgba(255,255,255,0.2)', padding: 16, marginBottom: '2rem', maxWidth: 500 }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 4 }}>Pool URL</p>
          <p style={{ color: '#06b6d4', fontWeight: 600 }}>{poolNameAndUrl.poolUrl}</p>
          <Plus className="stroke-white" style={{ position: 'absolute', top: 0, left: 0, transform: 'translate(-50%,-50%)' }} />
          <Plus className="stroke-white" style={{ position: 'absolute', bottom: 0, right: 0, transform: 'translate(50%,50%)' }} />
        </div>

        {/* Ports — VIG card-grid style */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px', background: 'rgba(255,255,255,0.06)' }}>
          {stratumPorts.map((sp) => {
            const portColors = { 3333: '#06b6d4', 5555: '#a78bfa', 7777: '#f59e0b', 9999: '#f43f5e' };
            return (
              <div key={sp.port} style={{ flex: '1 1 200px', background: '#000', padding: '2rem 1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: portColors[sp.port] || '#fff', marginBottom: 6 }}>{sp.port}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', marginBottom: 4 }}>{sp.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>diff {formatNumber(sp.difficulty)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '2.5rem 0' }}>
        <div className="px-8 xl:px-16" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ fontSize: 14, fontWeight: 300 }}>{poolNameAndUrl.poolName}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            Fee: {pool.poolFee}% &middot; Min Payout: {pool.minimumPayout} ETI &middot; ETI ${network.etiPriceUsd}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            Block #{formatNumber(network.blockHeight)} &middot; Epoch {formatNumber(network.epoch)}
          </span>
        </div>
      </div>
    </div>
  );
}
