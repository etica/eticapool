import React from 'react';

export default function PortBadge({ port }) {
  return <span className={`os-port-tag os-port-${port}`}>{port}</span>;
}
