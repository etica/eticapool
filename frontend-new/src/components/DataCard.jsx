import React from 'react';

export default function DataCard({ accent, tag, tagColor, title, children }) {
  return (
    <div className="os-data-card">
      <div className="os-data-card-accent" style={{ background: accent }} />
      <div className="os-data-card-body">
        {tag && (
          <div className="os-card-top mb-3">
            <span className={`os-tag os-tag-${tagColor}`}>{tag}</span>
          </div>
        )}
        {title && (
          <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">{title}</h3>
        )}
        {children}
      </div>
    </div>
  );
}
