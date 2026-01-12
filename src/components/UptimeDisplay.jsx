/**
 * Uptime Display Component
 * Service uptime tracking and history
 */

import { useState, useEffect, useCallback } from 'react';

const STATUS_COLORS = {
  up: '#2ecc71',
  down: '#e74c3c',
  degraded: '#f39c12',
  unknown: '#95a5a6',
};

function UptimeBar({ history = [], days = 30 }) {
  // Generate 30 days of status (or use provided history)
  const statusDays = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayStatus = history.find(h => h.date === dateStr);
    statusDays.push({
      date: dateStr,
      status: dayStatus?.status || 'unknown',
      uptime: dayStatus?.uptime || null,
    });
  }

  return (
    <div className="flex gap-0.5">
      {statusDays.map((day, i) => (
        <div
          key={i}
          className="flex-1 h-6 rounded-sm cursor-pointer group relative"
          style={{ background: STATUS_COLORS[day.status], minWidth: 4, maxWidth: 12 }}
          title={`${day.date}: ${day.uptime ? day.uptime.toFixed(2) + '%' : day.status}`}
        >
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            <div className="font-medium">{day.date}</div>
            <div className="text-muted">
              {day.uptime !== null ? `${day.uptime.toFixed(2)}% uptime` : day.status}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ServiceCard({ service, expanded, onToggle }) {
  const isUp = service.status === 'up';
  const statusColor = STATUS_COLORS[service.status] || STATUS_COLORS.unknown;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5"
      >
        {/* Status indicator */}
        <div
          className={'w-3 h-3 rounded-full ' + (isUp ? 'animate-pulse' : '')}
          style={{ background: statusColor }}
        />

        {/* Service info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-primary">{service.name}</div>
          <div className="text-xs text-muted">{service.url || service.endpoint}</div>
        </div>

        {/* Uptime percentage */}
        <div className="text-right">
          <div className="text-lg font-bold" style={{ color: statusColor }}>
            {service.uptime?.toFixed(2) || '---'}%
          </div>
          <div className="text-xs text-muted">
            {service.responseTime ? `${service.responseTime}ms` : 'N/A'}
          </div>
        </div>

        {/* Expand icon */}
        <svg
          className={'w-5 h-5 text-muted transition-transform ' + (expanded ? 'rotate-180' : '')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="p-3 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {/* Uptime bar */}
          <div>
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>30-Day History</span>
              <span>{service.uptime?.toFixed(2) || 0}% overall</span>
            </div>
            <UptimeBar history={service.history} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-xs text-muted">Checks</div>
              <div className="text-sm font-medium text-primary">{service.totalChecks || 0}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Failures</div>
              <div className="text-sm font-medium text-red-400">{service.failures || 0}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Avg Response</div>
              <div className="text-sm font-medium text-primary">{service.avgResponseTime || 0}ms</div>
            </div>
            <div>
              <div className="text-xs text-muted">Last Check</div>
              <div className="text-sm font-medium text-primary">
                {service.lastCheck ? new Date(service.lastCheck).toLocaleTimeString() : 'Never'}
              </div>
            </div>
          </div>

          {/* Recent incidents */}
          {service.incidents && service.incidents.length > 0 && (
            <div>
              <div className="text-xs text-muted mb-2">Recent Incidents</div>
              <div className="space-y-1">
                {service.incidents.slice(0, 3).map((incident, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS.down }} />
                    <span className="text-muted">{new Date(incident.date).toLocaleDateString()}</span>
                    <span className="text-secondary">{incident.duration}</span>
                    <span className="text-muted truncate">{incident.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(service.url, '_blank');
              }}
              className="flex-1 py-1.5 text-xs rounded bg-white/5 hover:bg-white/10"
              disabled={!service.url}
            >
              Visit Service
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('check-service', { detail: service.id }));
              }}
              className="flex-1 py-1.5 text-xs rounded bg-white/5 hover:bg-white/10"
            >
              Check Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UptimeDisplay({ isOpen, onClose }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const fetchServices = useCallback(async () => {
    try {
      const response = await fetch('/api/uptime');
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error('Failed to fetch uptime data:', error);
      // Demo data
      setServices([
        {
          id: '1',
          name: 'Command Portal',
          url: 'http://localhost:5275',
          status: 'up',
          uptime: 99.95,
          responseTime: 45,
          avgResponseTime: 52,
          totalChecks: 1440,
          failures: 2,
          lastCheck: new Date().toISOString(),
          history: [],
        },
        {
          id: '2',
          name: 'PostgreSQL',
          endpoint: 'localhost:5432',
          status: 'up',
          uptime: 100,
          responseTime: 12,
          avgResponseTime: 15,
          totalChecks: 1440,
          failures: 0,
          lastCheck: new Date().toISOString(),
          history: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchServices();
      const interval = setInterval(fetchServices, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchServices]);

  // Calculate overall stats
  const overallUptime = services.length > 0
    ? services.reduce((sum, s) => sum + (s.uptime || 0), 0) / services.length
    : 0;
  const servicesUp = services.filter(s => s.status === 'up').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Service Uptime</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Overview Stats */}
        <div
          className="grid grid-cols-3 gap-4 p-4"
          style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{servicesUp}/{services.length}</div>
            <div className="text-xs text-muted">Services Up</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{overallUptime.toFixed(2)}%</div>
            <div className="text-xs text-muted">Overall Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">30d</div>
            <div className="text-xs text-muted">History Period</div>
          </div>
        </div>

        {/* Services List */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-muted py-8">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted mb-2">No services configured</p>
              <p className="text-xs text-muted">
                Services will appear here when monitoring is enabled
              </p>
            </div>
          ) : (
            services.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                expanded={expandedId === service.id}
                onToggle={() => setExpandedId(expandedId === service.id ? null : service.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs text-muted"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <button onClick={fetchServices} className="text-accent hover:underline">
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

// Widget for dashboard
export function UptimeWidget() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/uptime');
        if (response.ok) {
          const data = await response.json();
          setServices(data.services || []);
        }
      } catch (error) {
        // Fallback
        setServices([
          { name: 'API', status: 'up', uptime: 99.9 },
          { name: 'Database', status: 'up', uptime: 100 },
        ]);
      }
    };

    fetchServices();
    const interval = setInterval(fetchServices, 60000);
    return () => clearInterval(interval);
  }, []);

  const allUp = services.every(s => s.status === 'up');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: allUp ? STATUS_COLORS.up : STATUS_COLORS.degraded }}
          />
          <span className="text-xs text-secondary">
            {allUp ? 'All Systems Operational' : 'Some Issues Detected'}
          </span>
        </div>
      </div>
      {services.slice(0, 4).map(service => (
        <div key={service.name} className="flex items-center justify-between text-xs">
          <span className="text-muted">{service.name}</span>
          <span style={{ color: STATUS_COLORS[service.status] }}>
            {service.uptime?.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}
