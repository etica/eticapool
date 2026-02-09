import React from 'react';

export default function TabNav({ tabs, activeTab, onTabChange }) {
  return (
    <div className="os-tabs">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`os-tab ${activeTab === tab ? 'active' : ''}`}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
