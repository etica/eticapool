import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getNavDropdowns } from '../config/navigation';
import { usePoolOverview } from '../hooks/usePoolOverview';
import { formatPoolName } from '../lib/formatters';
import LiveDot from './LiveDot';
import SearchInput from './SearchInput';

export default function Navbar() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data } = usePoolOverview();

  const poolName = data?.poolNameAndUrl?.poolName || data?.config?.poolName || 'Etica Pool';
  const { base: poolBase, suffix: poolSuffix } = formatPoolName(poolName);
  const navDropdowns = useMemo(() => getNavDropdowns(poolName), [poolName]);

  return (
    <nav className="os-navbar">
      <Link to="/" className="os-navbar-brand">
        <img src="/images/eti-logo.png" alt="ETI" className="w-8 h-8" />
        <span className="os-navbar-brand-text">
          {poolBase} <span className="accent">{poolSuffix}</span>
        </span>
        <span className="os-status-badge">
          <LiveDot />
          Active
        </span>
      </Link>

      <button
        className="os-nav-toggle"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
      >
        {mobileNavOpen ? '\u2715' : '\u2630'}
      </button>

      <div className={`os-navbar-nav ${mobileNavOpen ? 'open' : ''}`}>
        {navDropdowns.map((dd) => (
          <div key={dd.title} className="os-nav-dropdown">
            <button className={`os-nav-btn ${dd.title === 'POOL' ? 'active' : ''}`}>
              {dd.title} <span className="ml-1 text-[8px]">&#9662;</span>
            </button>
            <div className="os-nav-dropdown-menu">
              {dd.rows.map((row) =>
                row.external ? (
                  <a
                    key={row.title}
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                    className="os-nav-dropdown-link"
                  >
                    {row.title}
                  </a>
                ) : (
                  <Link
                    key={row.title}
                    to={row.url}
                    className="os-nav-dropdown-link"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {row.title}
                  </Link>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <SearchInput className="hidden sm:block" />
    </nav>
  );
}
