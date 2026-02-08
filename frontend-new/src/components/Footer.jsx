import React from 'react';

const FOOTER_COLUMNS = [
  {
    heading: 'Documentation',
    links: [
      { label: 'White Paper', url: 'https://www.eticaprotocol.org/viewwhitepaper' },
      { label: 'How to mine Etica', url: 'https://www.eticaprotocol.org/eticadocs/mining.html' },
      { label: 'How it works', url: 'https://www.eticaprotocol.org/eticadocs/howitworks.html' },
      { label: 'Exchanges', url: 'https://www.eticaprotocol.org/exchanges' },
      { label: 'Create Etica Wallet (Metamask)', url: 'https://www.youtube.com/watch?v=IaIDSLBxzjg' },
      { label: 'Create Etica Wallet (GUI)', url: 'https://github.com/etica/etica-gui/releases' },
      { label: 'How to mine EGAZ', url: 'https://www.youtube.com/watch?v=tPljgu0rez0' },
    ],
  },
  {
    heading: 'Community & Social',
    links: [
      { label: 'Run this pool: Github', url: 'https://github.com/etica/eticapool' },
      { label: 'Reddit', url: 'https://reddit.com/r/etica' },
      { label: 'Discord', url: 'https://discord.gg/CrTKpETKXc' },
      { label: 'Telegram', url: 'https://t.me/eticaprotocol' },
    ],
  },
  {
    heading: 'Explorers',
    links: [
      { label: 'EticaScan', url: 'https://www.eticascan.org' },
      { label: 'Etica Stats Explorer', url: 'http://explorer.etica-stats.org/' },
      { label: 'Mining Pool Stats', url: 'https://miningpoolstats.stream/etica' },
      { label: 'Eticapool v4.0.17', url: 'https://github.com/etica/eticapool' },
    ],
  },
];

export default function Footer({ contractAddress, poolFee, minimumPayout }) {
  return (
    <footer className="pt-10 pb-8">
      <div className="os-footer-line mb-8" />

      <div className="os-footer-columns">
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.heading}>
            <h4 className="os-footer-heading">{col.heading}</h4>
            {col.links.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="os-footer-link"
              >
                {link.label}
              </a>
            ))}
          </div>
        ))}
      </div>

      <div className="os-footer-line mt-8 mb-4" />

      {contractAddress && (
        <div className="os-footer-meta">
          <span className="font-mono text-[#374151] break-all text-[10px]">
            {contractAddress}
          </span>
        </div>
      )}

      <div className="os-footer-meta mt-2">
        <span>Ports: <span className="text-[#6b7280]">3333 / 5555 / 7777 / 9999</span></span>
        {poolFee !== undefined && (
          <span>Fee: <span className="text-[#6b7280]">{poolFee}%</span></span>
        )}
        {minimumPayout !== undefined && (
          <span>Min Payout: <span className="text-[#34d399]">{minimumPayout} ETI</span></span>
        )}
      </div>

      <p className="os-footer-text mt-4">
        Etica Mining Pool &mdash; Science knows no country because knowledge belongs to Humanity
      </p>
    </footer>
  );
}
