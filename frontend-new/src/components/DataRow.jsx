import React from 'react';

export default function DataRow({ label, children, className = '' }) {
  return (
    <div className="os-data-row">
      <span className="os-data-key">{label}</span>
      <span className={`os-data-val ${className}`}>{children}</span>
    </div>
  );
}
