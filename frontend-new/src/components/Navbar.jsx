import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { NAV_DROPDOWNS } from '../config/navigation';
import LiveDot from './LiveDot';
import SearchInput from './SearchInput';

export default function Navbar() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <nav className="os-navbar">
      <Link to="/" className="os-navbar-brand">
        <img src="/images/eti-logo.png" alt="ETI" className="w-8 h-8" />
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
        {NAV_DROPDOWNS.map((dd) => (
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
