import React from 'react';

const STATUS_STYLES = {
  confirmed: 'text-[#34d399] bg-[#34d399]/10',
  pending: 'text-[#fbbf24] bg-[#fbbf24]/10',
  unprocessed: 'text-[#9ca3af] bg-[#9ca3af]/10',
};

export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase().replace(/\s+/g, '');
  let label = status;
  let style = STATUS_STYLES.unprocessed;

  if (normalized === 'confirmed' || normalized === 'processed' || normalized === 'processedwithrewards' || normalized === 'processed+rewards') {
    style = STATUS_STYLES.confirmed;
    label = normalized.includes('reward') ? 'processed + rewards' : 'confirmed';
  } else if (normalized === 'pending') {
    style = STATUS_STYLES.pending;
    label = 'pending';
  } else if (normalized === 'unprocessed') {
    label = 'unprocessed';
  }

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style}`}>
      {label}
    </span>
  );
}
