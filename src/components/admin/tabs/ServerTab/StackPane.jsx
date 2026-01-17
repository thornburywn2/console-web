/**
 * StackPane Component
 * Sovereign Stack services health monitoring
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { formatTime } from '../../utils';
import { stackApi } from '../../../../services/api.js';

export function StackPane() {
  const [stackServices, setStackServices] = useState([]);
  const [stackHealth, setStackHealth] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStackData = useCallback(async () => {
    try {
      setLoading(true);
      const [servicesData, healthData] = await Promise.all([
        stackApi.getServices(),
        stackApi.getHealth()
      ]);

      setStackServices(servicesData.services || []);
      setStackHealth(healthData);
    } catch (err) {
      console.error('Error fetching stack data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStackRestart = useCallback(async (serviceId) => {
    try {
      setLoading(true);
      await stackApi.restartService(serviceId);
      fetchStackData();
    } catch (err) {
      console.error('Error restarting service:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchStackData]);

  useEffect(() => {
    fetchStackData();
    const interval = setInterval(fetchStackData, 15000);
    return () => clearInterval(interval);
  }, [fetchStackData]);

  const icons = {
    authentik: '\u{1F6E1}', // 🛡
    openwebui: '\u{1F4AC}', // 💬
    silverbullet: '\u{1F4DD}', // 📝
    plane: '\u{1F4CB}', // 📋
    n8n: '\u26A1', // ⚡
    voiceRouter: '\u{1F3A4}', // 🎤
    monitoring: '\u{1F4CA}', // 📊
  };

  return (
    <div className="space-y-6">
      {/* Stack Health Summary */}
      {stackHealth && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="hacker-card text-center">
            <div className="stat-value">{stackHealth.total || stackServices.length}</div>
            <div className="stat-label">TOTAL SERVICES</div>
          </div>
          <div className="hacker-card text-center">
            <div className="stat-value" style={{color: '#00ff41'}}>{stackHealth.healthy || 0}</div>
            <div className="stat-label">HEALTHY</div>
          </div>
          <div className="hacker-card text-center">
            <div className="stat-value" style={{color: '#ffb000'}}>{stackHealth.unhealthy || 0}</div>
            <div className="stat-label">UNHEALTHY</div>
          </div>
          <div className="hacker-card text-center">
            <div className="stat-value" style={{color: stackHealth.status === 'healthy' ? '#00ff41' : '#ff3333'}}>
              {stackHealth.status?.toUpperCase() || 'UNKNOWN'}
            </div>
            <div className="stat-label">OVERALL STATUS</div>
          </div>
        </div>
      )}

      {/* Services Grid */}
      <div className="hacker-card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-hacker-purple uppercase tracking-wider">
            SOVEREIGN STACK SERVICES
          </h4>
          <button
            onClick={fetchStackData}
            disabled={loading}
            className="hacker-btn text-xs"
          >
            {loading ? '[LOADING...]' : '[REFRESH]'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {stackServices.length === 0 ? (
            <div className="col-span-full text-center">
              <p className="text-hacker-text-dim font-mono">Loading stack services...</p>
            </div>
          ) : (
            stackServices.map(service => {
              const isHealthy = service.status === 'healthy';
              const icon = icons[service.id] || '\u{1F527}'; // 🔧

              return (
                <div key={service.id} className="hacker-card bg-hacker-surface/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-hacker-cyan flex items-center gap-2">
                      <span>{icon}</span> {service.name}
                    </h4>
                    <span className={`hacker-badge text-[10px] ${
                      isHealthy ? 'hacker-badge-green' : 'hacker-badge-error'
                    }`}>
                      {service.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                  <p className="text-xs text-hacker-text-dim font-mono mb-2">{service.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-hacker-text-dim">Port: {service.port}</span>
                    <div className="flex items-center gap-2">
                      {service.url && (
                        <a
                          href={service.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hacker-btn text-[10px] px-2 py-1"
                        >
                          OPEN
                        </a>
                      )}
                      <button
                        onClick={() => handleStackRestart(service.id)}
                        disabled={loading}
                        className="hacker-btn text-[10px] px-2 py-1 border-hacker-warning/30 text-hacker-warning hover:bg-hacker-warning/10"
                      >
                        RESTART
                      </button>
                    </div>
                  </div>
                  {/* Health indicator bar */}
                  <div className="mt-3">
                    <div className="hacker-progress h-1">
                      <div
                        className="hacker-progress-bar"
                        style={{
                          width: isHealthy ? '100%' : '30%',
                          background: isHealthy
                            ? 'linear-gradient(90deg, #00cc33, #00ff41)'
                            : 'linear-gradient(90deg, #cc3333, #ff3333)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {stackServices.filter(s => s.url).length > 0 && (
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider flex items-center gap-2">
            <span>&#9654;</span> QUICK LAUNCH
          </h4>
          <div className="flex flex-wrap gap-2">
            {stackServices.filter(s => s.url).map(service => (
              <a
                key={service.id}
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`hacker-btn text-xs flex items-center gap-2 ${
                  service.status === 'healthy'
                    ? 'border-hacker-green/30 text-hacker-green hover:bg-hacker-green/10'
                    : 'border-hacker-error/30 text-hacker-error hover:bg-hacker-error/10'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  service.status === 'healthy' ? 'bg-hacker-green' : 'bg-hacker-error'
                }`} />
                {service.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Last Check Time */}
      {stackHealth?.timestamp && (
        <p className="text-xs text-hacker-text-dim font-mono text-right">
          Last health check: {formatTime(stackHealth.timestamp)}
        </p>
      )}
    </div>
  );
}

export default StackPane;
