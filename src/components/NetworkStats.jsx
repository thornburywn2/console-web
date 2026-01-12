/**
 * Network Stats Component
 * Bandwidth monitoring and network traffic analysis
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const COLORS = {
  inbound: '#2ecc71',
  outbound: '#3498db',
  errors: '#e74c3c',
};

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

function formatBytesPerSecond(bps) {
  if (!bps || bps === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bps) / Math.log(k));
  return parseFloat((bps / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function LiveChart({ inbound, outbound, height = 60 }) {
  const canvasRef = useRef(null);
  const dataRef = useRef({ in: [], out: [] });

  useEffect(() => {
    // Add new data points
    dataRef.current.in.push(inbound || 0);
    dataRef.current.out.push(outbound || 0);

    // Keep last 60 points (1 minute at 1s intervals)
    if (dataRef.current.in.length > 60) {
      dataRef.current.in.shift();
      dataRef.current.out.shift();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    const allData = [...dataRef.current.in, ...dataRef.current.out];
    const max = Math.max(...allData, 1024);
    const pointCount = dataRef.current.in.length;

    // Draw inbound
    ctx.beginPath();
    ctx.strokeStyle = COLORS.inbound;
    ctx.lineWidth = 2;
    dataRef.current.in.forEach((value, i) => {
      const x = (i / (pointCount - 1 || 1)) * w;
      const y = h - (value / max) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw outbound
    ctx.beginPath();
    ctx.strokeStyle = COLORS.outbound;
    ctx.lineWidth = 2;
    dataRef.current.out.forEach((value, i) => {
      const x = (i / (pointCount - 1 || 1)) * w;
      const y = h - (value / max) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [inbound, outbound]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height, display: 'block' }}
    />
  );
}

function InterfaceCard({ iface, expanded, onToggle }) {
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
        {/* Status */}
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: iface.isUp ? COLORS.inbound : COLORS.errors }}
        />

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-primary">{iface.name}</div>
          <div className="text-xs text-muted">{iface.address || 'No IP assigned'}</div>
        </div>

        {/* Live rates */}
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="text-xs text-muted">In</div>
            <div style={{ color: COLORS.inbound }}>{formatBytesPerSecond(iface.rxRate)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted">Out</div>
            <div style={{ color: COLORS.outbound }}>{formatBytesPerSecond(iface.txRate)}</div>
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

      {/* Expanded */}
      {expanded && (
        <div className="p-3 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {/* Live chart */}
          <div>
            <div className="text-xs text-muted mb-1">Live Traffic (1 min)</div>
            <LiveChart inbound={iface.rxRate} outbound={iface.txRate} />
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: COLORS.inbound }}>Inbound</span>
              <span className="text-xs" style={{ color: COLORS.outbound }}>Outbound</span>
            </div>
          </div>

          {/* Total stats */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted mb-1">Total Received</div>
              <div className="text-lg font-bold" style={{ color: COLORS.inbound }}>
                {formatBytes(iface.rxBytes)}
              </div>
              <div className="text-xs text-muted">{iface.rxPackets?.toLocaleString()} packets</div>
            </div>
            <div>
              <div className="text-xs text-muted mb-1">Total Sent</div>
              <div className="text-lg font-bold" style={{ color: COLORS.outbound }}>
                {formatBytes(iface.txBytes)}
              </div>
              <div className="text-xs text-muted">{iface.txPackets?.toLocaleString()} packets</div>
            </div>
          </div>

          {/* Errors */}
          {(iface.rxErrors > 0 || iface.txErrors > 0) && (
            <div className="p-2 rounded text-xs" style={{ background: 'rgba(231, 76, 60, 0.1)' }}>
              <span style={{ color: COLORS.errors }}>
                Errors: {iface.rxErrors || 0} RX, {iface.txErrors || 0} TX
              </span>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted">MAC: </span>
              <span className="text-secondary font-mono">{iface.mac || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted">Speed: </span>
              <span className="text-secondary">{iface.speed || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-muted">MTU: </span>
              <span className="text-secondary">{iface.mtu || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted">Status: </span>
              <span style={{ color: iface.isUp ? COLORS.inbound : COLORS.errors }}>
                {iface.isUp ? 'Up' : 'Down'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NetworkStats({ isOpen, onClose }) {
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/network');
      if (response.ok) {
        const data = await response.json();
        setInterfaces(data.interfaces || []);
      }
    } catch (error) {
      console.error('Failed to fetch network stats:', error);
      // Demo data
      setInterfaces([
        {
          name: 'eth0',
          address: '192.168.1.100',
          mac: '00:11:22:33:44:55',
          isUp: true,
          rxBytes: 1024 * 1024 * 512,
          txBytes: 1024 * 1024 * 128,
          rxRate: 1024 * 50,
          txRate: 1024 * 20,
          rxPackets: 1250000,
          txPackets: 450000,
          rxErrors: 0,
          txErrors: 0,
          speed: '1 Gbps',
          mtu: 1500,
        },
        {
          name: 'docker0',
          address: '172.17.0.1',
          mac: 'aa:bb:cc:dd:ee:ff',
          isUp: true,
          rxBytes: 1024 * 1024 * 64,
          txBytes: 1024 * 1024 * 32,
          rxRate: 1024 * 5,
          txRate: 1024 * 2,
          rxPackets: 125000,
          txPackets: 45000,
          rxErrors: 0,
          txErrors: 0,
          mtu: 1500,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
      const interval = setInterval(fetchStats, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchStats]);

  // Aggregate stats
  const totalRx = interfaces.reduce((sum, i) => sum + (i.rxRate || 0), 0);
  const totalTx = interfaces.reduce((sum, i) => sum + (i.txRate || 0), 0);
  const totalRxBytes = interfaces.reduce((sum, i) => sum + (i.rxBytes || 0), 0);
  const totalTxBytes = interfaces.reduce((sum, i) => sum + (i.txBytes || 0), 0);

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Network Monitor</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Aggregate Stats */}
        <div
          className="grid grid-cols-4 gap-4 p-4"
          style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: COLORS.inbound }}>
              {formatBytesPerSecond(totalRx)}
            </div>
            <div className="text-xs text-muted">Total Inbound</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: COLORS.outbound }}>
              {formatBytesPerSecond(totalTx)}
            </div>
            <div className="text-xs text-muted">Total Outbound</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{formatBytes(totalRxBytes)}</div>
            <div className="text-xs text-muted">Received</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{formatBytes(totalTxBytes)}</div>
            <div className="text-xs text-muted">Sent</div>
          </div>
        </div>

        {/* Interfaces */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-muted py-8">Loading network stats...</div>
          ) : interfaces.length === 0 ? (
            <div className="text-center text-muted py-8">No network interfaces found</div>
          ) : (
            interfaces.map(iface => (
              <InterfaceCard
                key={iface.name}
                iface={iface}
                expanded={expandedId === iface.name}
                onToggle={() => setExpandedId(expandedId === iface.name ? null : iface.name)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs text-muted"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <span>{interfaces.length} interfaces</span>
          <span>Updates every 2s</span>
        </div>
      </div>
    </div>
  );
}

// Widget version
export function NetworkWidget() {
  const [stats, setStats] = useState({ rx: 0, tx: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/network');
        if (response.ok) {
          const data = await response.json();
          const totalRx = data.interfaces?.reduce((sum, i) => sum + (i.rxRate || 0), 0) || 0;
          const totalTx = data.interfaces?.reduce((sum, i) => sum + (i.txRate || 0), 0) || 0;
          setStats({ rx: totalRx, tx: totalTx });
        }
      } catch (error) {
        setStats({ rx: 52428, tx: 20480 }); // Demo
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span style={{ color: COLORS.inbound }}>In: {formatBytesPerSecond(stats.rx)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span style={{ color: COLORS.outbound }}>Out: {formatBytesPerSecond(stats.tx)}</span>
      </div>
    </div>
  );
}
