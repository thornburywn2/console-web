/**
 * Status Page Component
 * Public service status display
 */

import { useState, useEffect, useCallback } from 'react';

const STATUS_LEVELS = {
  operational: { label: 'Operational', color: '#2ecc71', icon: '✓' },
  degraded: { label: 'Degraded Performance', color: '#f39c12', icon: '!' },
  partial: { label: 'Partial Outage', color: '#e67e22', icon: '⚠' },
  major: { label: 'Major Outage', color: '#e74c3c', icon: '✕' },
  maintenance: { label: 'Maintenance', color: '#3498db', icon: '🔧' }
};

function ServiceStatus({ service }) {
  const status = STATUS_LEVELS[service.status] || STATUS_LEVELS.operational;

  return (
    <div
      className="flex items-center justify-between p-4 rounded-lg"
      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-full"
          style={{ background: status.color }}
        />
        <div>
          <div className="font-medium text-primary">{service.name}</div>
          {service.description && (
            <div className="text-xs text-muted">{service.description}</div>
          )}
        </div>
      </div>
      <div className="text-right">
        <span className="text-sm" style={{ color: status.color }}>{status.label}</span>
        {service.uptime !== undefined && (
          <div className="text-xs text-muted">{service.uptime}% uptime</div>
        )}
      </div>
    </div>
  );
}

function UptimeGraph({ history = [] }) {
  // 90-day history, each day represented by a small bar
  const days = Array.from({ length: 90 }, (_, i) => {
    const day = history[i] || { status: 'operational' };
    return day;
  });

  return (
    <div className="flex items-end gap-0.5 h-8">
      {days.map((day, i) => {
        const status = STATUS_LEVELS[day.status] || STATUS_LEVELS.operational;
        return (
          <div
            key={i}
            className="flex-1 min-w-[2px] rounded-t"
            style={{
              background: status.color,
              height: day.status === 'operational' ? '100%' : '50%',
              opacity: i < days.length - 7 ? 0.5 : 1
            }}
            title={`${90 - i} days ago: ${status.label}`}
          />
        );
      })}
    </div>
  );
}

function IncidentCard({ incident }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_LEVELS[incident.status] || STATUS_LEVELS.operational;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5"
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: status.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-primary">{incident.title}</div>
          <div className="text-xs text-muted">
            {new Date(incident.timestamp).toLocaleString()}
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: status.color + '20', color: status.color }}>
          {incident.resolved ? 'Resolved' : status.label}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {incident.updates?.map((update, i) => (
            <div
              key={i}
              className="flex gap-3 py-2"
              style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}
            >
              <div className="text-xs text-muted whitespace-nowrap">
                {new Date(update.timestamp).toLocaleTimeString()}
              </div>
              <div>
                <div className="text-sm text-secondary">{update.message}</div>
                <div className="text-xs text-muted capitalize">{update.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OverallStatus({ services }) {
  // Calculate overall status from services
  const statuses = services.map(s => s.status);
  let overall = 'operational';
  if (statuses.includes('major')) overall = 'major';
  else if (statuses.includes('partial')) overall = 'partial';
  else if (statuses.includes('degraded')) overall = 'degraded';
  else if (statuses.includes('maintenance')) overall = 'maintenance';

  const status = STATUS_LEVELS[overall];

  return (
    <div
      className="p-6 rounded-xl text-center"
      style={{ background: status.color + '10', border: `2px solid ${status.color}` }}
    >
      <div className="text-4xl mb-2">{status.icon}</div>
      <div className="text-2xl font-bold" style={{ color: status.color }}>
        {overall === 'operational' ? 'All Systems Operational' : status.label}
      </div>
      <div className="text-sm text-muted mt-1">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}

export default function StatusPage({ isPublic = false }) {
  const [services, setServices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/status');
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
        setIncidents(data.incidents || []);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
      // Mock data fallback
      setServices([
        { name: 'Web Application', status: 'operational', uptime: 99.9 },
        { name: 'API', status: 'operational', uptime: 99.8 },
        { name: 'Database', status: 'operational', uptime: 99.99 },
        { name: 'Terminal Sessions', status: 'operational', uptime: 99.5 },
        { name: 'Docker Integration', status: 'operational', uptime: 99.7 },
      ]);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${isPublic ? 'bg-gray-900' : ''}`}
      style={{ background: isPublic ? undefined : 'var(--bg-primary)' }}
    >
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Console.web Status</h1>
          <p className="text-muted">Real-time system status and incident reports</p>
        </div>

        {/* Overall Status */}
        <OverallStatus services={services} />

        {/* Uptime Graph */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary">90-Day Uptime</span>
            <span className="text-sm text-muted">99.9%</span>
          </div>
          <UptimeGraph history={[]} />
          <div className="flex justify-between text-xs text-muted">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Services */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">Services</h2>
          {services.map((service, i) => (
            <ServiceStatus key={i} service={service} />
          ))}
        </div>

        {/* Incidents */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">Recent Incidents</h2>
          {incidents.length === 0 ? (
            <div className="text-center text-muted py-8">
              No incidents in the last 30 days
            </div>
          ) : (
            incidents.map((incident, i) => (
              <IncidentCard key={i} incident={incident} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted pt-8 pb-4">
          <p>
            Subscribe to updates via{' '}
            <a href="/api/status/rss" className="text-accent hover:underline">RSS</a>
            {' '}or{' '}
            <a href="/api/status/webhook" className="text-accent hover:underline">Webhook</a>
          </p>
          {lastUpdate && (
            <p className="mt-2">Last updated: {lastUpdate.toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact status widget for dashboard
export function StatusWidget() {
  const [status, setStatus] = useState('operational');
  const [serviceCount, setServiceCount] = useState(0);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (response.ok) {
          const data = await response.json();
          setServiceCount(data.services?.length || 0);
          const statuses = data.services?.map(s => s.status) || [];
          if (statuses.includes('major')) setStatus('major');
          else if (statuses.includes('partial')) setStatus('partial');
          else if (statuses.includes('degraded')) setStatus('degraded');
          else setStatus('operational');
        }
      } catch {
        setStatus('operational');
      }
    };
    fetchStatus();
  }, []);

  const statusConfig = STATUS_LEVELS[status];

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: statusConfig.color }}
      />
      <span className="text-sm text-secondary">{statusConfig.label}</span>
      <span className="text-xs text-muted">({serviceCount} services)</span>
    </div>
  );
}
