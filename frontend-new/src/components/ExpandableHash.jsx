import React, { useState } from 'react';

export default function ExpandableHash({ label, value }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-3">
      <div className="os-label mb-1.5">{label}</div>
      <div
        className={`os-hash-field ${expanded ? 'expanded' : ''}`}
        onClick={() => setExpanded(!expanded)}
        title="Click to expand/collapse"
      >
        {value}
      </div>
    </div>
  );
}
