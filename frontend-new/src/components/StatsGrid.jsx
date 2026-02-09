import React from 'react';

export default function StatsGrid({ children, cols = 2 }) {
  return (
    <div className="os-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {children}
    </div>
  );
}
