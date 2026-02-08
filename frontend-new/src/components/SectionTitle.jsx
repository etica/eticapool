import React from 'react';

export default function SectionTitle({ children, color = 'white' }) {
  return <h3 className={`os-section-title ${color}`}>{children}</h3>;
}
