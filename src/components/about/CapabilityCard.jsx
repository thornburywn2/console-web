/**
 * CapabilityCard Component
 * Expandable card for infrastructure capabilities
 */

import { useState } from 'react';

export default function CapabilityCard({ capability }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-300"
      style={{
        background: 'var(--bg-secondary)',
        border: `1px solid ${capability.color}30`,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/5 transition-colors"
      >
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold"
          style={{ background: `${capability.color}20`, color: capability.color }}
        >
          {capability.icon === 'docker' && '🐳'}
          {capability.icon === 'systemd' && '⚙️'}
          {capability.icon === 'shield' && '🛡️'}
          {capability.icon === 'chart' && '📊'}
        </div>
        <div className="flex-1">
          <h4 className="text-primary font-semibold">{capability.category}</h4>
          <p className="text-xs text-muted">{capability.items.length} capabilities</p>
        </div>
        <svg
          className={`w-5 h-5 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          {capability.items.map((item, i) => (
            <div
              key={i}
              className="p-3 rounded-lg"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <div className="text-sm text-primary font-medium">{item.name}</div>
              <div className="text-xs text-muted">{item.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
