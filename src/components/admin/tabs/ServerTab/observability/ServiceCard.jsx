/**
 * Observability Service Card
 */

import { SERVICE_ICONS } from './constants';

export function ServiceCard({ serviceKey, service }) {
  const icon = SERVICE_ICONS[serviceKey] || '\u{1F4E1}';

  return (
    <div className="hacker-card bg-hacker-surface/30">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-semibold text-hacker-cyan flex items-center gap-2">
          <span>{icon}</span>
          {service.name || serviceKey.toUpperCase()}
        </h5>
        <span className={`hacker-badge text-[10px] ${
          service.running ? 'hacker-badge-green' : 'hacker-badge-error'
        }`}>
          {service.status?.toUpperCase() || 'UNKNOWN'}
        </span>
      </div>
      <div className="text-xs text-hacker-text-dim font-mono space-y-1">
        {service.container && <p>Container: {service.container}</p>}
        {service.ports && <p>Port: {service.ports}</p>}
        {service.uptime && <p>Uptime: {service.uptime}</p>}
        {service.cpu && <p>CPU: {service.cpu}%</p>}
        {service.memory?.percent && <p>Memory: {service.memory.percent}%</p>}
      </div>
      <div className="mt-3">
        <div className="hacker-progress h-1">
          <div
            className="hacker-progress-bar"
            style={{
              width: service.running ? '100%' : '0%',
              background: service.running
                ? 'linear-gradient(90deg, #00cc33, #00ff41)'
                : 'linear-gradient(90deg, #cc3333, #ff3333)'
            }}
          />
        </div>
      </div>
    </div>
  );
}
