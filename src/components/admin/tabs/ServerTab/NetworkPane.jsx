/**
 * NetworkPane Component
 * Network diagnostics and interface management
 */

import { useState, useEffect, useCallback } from 'react';
import { formatBytes } from '../../utils';

export function NetworkPane() {
  const [interfaces, setInterfaces] = useState([]);
  const [connections, setConnections] = useState([]);
  const [pingResult, setPingResult] = useState(null);
  const [dnsResult, setDnsResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pingHost, setPingHost] = useState('');
  const [dnsHost, setDnsHost] = useState('');

  const fetchNetworkInterfaces = useCallback(async () => {
    try {
      setLoading(true);
      const [ifaceRes, connRes] = await Promise.all([
        fetch('/api/infra/network/interfaces'),
        fetch('/api/infra/network/connections')
      ]);

      if (ifaceRes.ok) {
        const data = await ifaceRes.json();
        setInterfaces(data.interfaces || []);
      }
      if (connRes.ok) {
        const data = await connRes.json();
        setConnections(data.connections || []);
      }
    } catch (err) {
      console.error('Error fetching network data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const runPing = useCallback(async () => {
    if (!pingHost.trim()) return;
    try {
      setLoading(true);
      setPingResult(null);
      const res = await fetch('/api/infra/network/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: pingHost })
      });
      if (res.ok) {
        const data = await res.json();
        setPingResult(data);
      }
    } catch (err) {
      console.error('Error running ping:', err);
      setPingResult({ error: 'Ping failed' });
    } finally {
      setLoading(false);
    }
  }, [pingHost]);

  const runDnsLookup = useCallback(async () => {
    if (!dnsHost.trim()) return;
    try {
      setLoading(true);
      setDnsResult(null);
      const res = await fetch('/api/infra/network/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: dnsHost })
      });
      if (res.ok) {
        const data = await res.json();
        setDnsResult(data);
      }
    } catch (err) {
      console.error('Error running DNS lookup:', err);
      setDnsResult({ error: 'DNS lookup failed' });
    } finally {
      setLoading(false);
    }
  }, [dnsHost]);

  useEffect(() => {
    fetchNetworkInterfaces();
  }, [fetchNetworkInterfaces]);

  return (
    <div className="space-y-6">
      {/* Network Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-green">{interfaces.length}</div>
          <div className="stat-label">INTERFACES</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-cyan">
            {interfaces.filter(i => i.operstate === 'up').length}
          </div>
          <div className="stat-label">UP</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-purple">{connections.length}</div>
          <div className="stat-label">CONNECTIONS</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-warning">
            {connections.filter(c => c.state === 'ESTABLISHED').length}
          </div>
          <div className="stat-label">ESTABLISHED</div>
        </div>
      </div>

      {/* Network Interfaces */}
      <div className="hacker-card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-hacker-green uppercase tracking-wider">
            NETWORK INTERFACES
          </h4>
          <button
            onClick={fetchNetworkInterfaces}
            disabled={loading}
            className="hacker-btn text-xs"
          >
            {loading ? '[LOADING...]' : '[REFRESH]'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {interfaces.map((iface, idx) => (
            <div key={idx} className="p-3 bg-hacker-surface rounded border border-hacker-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-hacker-cyan">{iface.name}</span>
                <span className={`hacker-badge text-[10px] ${
                  iface.operstate === 'up' ? 'hacker-badge-green' : 'hacker-badge-error'
                }`}>
                  {iface.operstate?.toUpperCase()}
                </span>
              </div>
              <div className="text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-hacker-text-dim">IPv4</span>
                  <span className="text-hacker-text">{iface.ipv4 || 'N/A'}</span>
                </div>
                {iface.ipv6 && (
                  <div className="flex justify-between">
                    <span className="text-hacker-text-dim">IPv6</span>
                    <span className="text-hacker-text truncate max-w-[60%]">{iface.ipv6}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-hacker-text-dim">MAC</span>
                  <span className="text-hacker-text">{iface.mac || 'N/A'}</span>
                </div>
                {iface.rx !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-hacker-text-dim">RX/TX</span>
                    <span className="text-hacker-text">
                      {formatBytes(iface.rx)} / {formatBytes(iface.tx)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ping Tool */}
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider">
            PING TEST
          </h4>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Host or IP (e.g., 8.8.8.8)"
              value={pingHost}
              onChange={(e) => setPingHost(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runPing()}
              className="input-glass flex-1 text-sm"
            />
            <button
              onClick={runPing}
              disabled={loading || !pingHost.trim()}
              className="hacker-btn text-xs"
            >
              PING
            </button>
          </div>
          {pingResult && (
            <div className={`p-3 rounded font-mono text-xs ${
              pingResult.error
                ? 'bg-hacker-error/10 border border-hacker-error/30'
                : 'bg-hacker-green/10 border border-hacker-green/30'
            }`}>
              {pingResult.error ? (
                <span className="text-hacker-error">{pingResult.error}</span>
              ) : (
                <div className="space-y-1">
                  <div>Host: <span className="text-hacker-cyan">{pingResult.host}</span></div>
                  <div>Packets: {pingResult.transmitted}/{pingResult.received}</div>
                  <div>Loss: <span className={pingResult.loss > 0 ? 'text-hacker-error' : 'text-hacker-green'}>{pingResult.loss}%</span></div>
                  {pingResult.rtt && (
                    <div>RTT: min={pingResult.rtt.min}ms avg={pingResult.rtt.avg}ms max={pingResult.rtt.max}ms</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* DNS Lookup */}
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
            DNS LOOKUP
          </h4>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Domain (e.g., google.com)"
              value={dnsHost}
              onChange={(e) => setDnsHost(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runDnsLookup()}
              className="input-glass flex-1 text-sm"
            />
            <button
              onClick={runDnsLookup}
              disabled={loading || !dnsHost.trim()}
              className="hacker-btn text-xs"
            >
              LOOKUP
            </button>
          </div>
          {dnsResult && (
            <div className={`p-3 rounded font-mono text-xs ${
              dnsResult.error
                ? 'bg-hacker-error/10 border border-hacker-error/30'
                : 'bg-hacker-purple/10 border border-hacker-purple/30'
            }`}>
              {dnsResult.error ? (
                <span className="text-hacker-error">{dnsResult.error}</span>
              ) : (
                <div className="space-y-1">
                  <div>Domain: <span className="text-hacker-purple">{dnsResult.host}</span></div>
                  {dnsResult.addresses?.map((addr, i) => (
                    <div key={i}>IP: <span className="text-hacker-cyan">{addr}</span></div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Connections */}
      {connections.length > 0 && (
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider">
            ACTIVE CONNECTIONS [{connections.filter(c => c.state === 'ESTABLISHED').length}]
          </h4>
          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-left text-hacker-text-dim border-b border-hacker-border">
                  <th className="py-2 px-2">PROTO</th>
                  <th className="py-2 px-2">LOCAL</th>
                  <th className="py-2 px-2">REMOTE</th>
                  <th className="py-2 px-2">STATE</th>
                  <th className="py-2 px-2">PID</th>
                </tr>
              </thead>
              <tbody>
                {connections.filter(c => c.state === 'ESTABLISHED').slice(0, 20).map((conn, idx) => (
                  <tr key={idx} className="border-b border-hacker-border/30 hover:bg-hacker-surface/30">
                    <td className="py-1.5 px-2 text-hacker-cyan">{conn.proto}</td>
                    <td className="py-1.5 px-2 text-hacker-text">{conn.local}</td>
                    <td className="py-1.5 px-2 text-hacker-text">{conn.remote}</td>
                    <td className="py-1.5 px-2 text-hacker-green">{conn.state}</td>
                    <td className="py-1.5 px-2 text-hacker-text-dim">{conn.pid || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default NetworkPane;
