import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchInput({ placeholder = '0x... search miner', className = '' }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    const addr = query.trim();
    if (addr.length >= 10) {
      navigate(`/miner/${addr}`);
      setQuery('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <input
        type="text"
        placeholder={placeholder}
        className="os-search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </form>
  );
}
