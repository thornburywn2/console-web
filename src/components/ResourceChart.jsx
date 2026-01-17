/**
 * Resource Chart Component
 * Historical CPU/memory/disk time-series charts
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { metricsApi } from '../services/api.js';

const CHART_COLORS = {
  cpu: '#3498db',
  memory: '#2ecc71',
  disk: '#9b59b6',
  network_in: '#e74c3c',
  network_out: '#f39c12',
};

const TIME_RANGES = [
  { value: '1h', label: '1 Hour', minutes: 60 },
  { value: '6h', label: '6 Hours', minutes: 360 },
  { value: '24h', label: '24 Hours', minutes: 1440 },
  { value: '7d', label: '7 Days', minutes: 10080 },
];

function MiniChart({ data, color, height = 40, width = '100%' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = rect.width;
    const h = rect.height;
    const padding = 2;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Find min/max
    const values = data.map(d => d.value);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    data.forEach((point, i) => {
      const x = padding + (i / (data.length - 1)) * (w - 2 * padding);
      const y = h - padding - ((point.value - min) / range) * (h - 2 * padding);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Fill area under line
    ctx.lineTo(w - padding, h - padding);
    ctx.lineTo(padding, h - padding);
    ctx.closePath();
    ctx.fillStyle = color + '20';
    ctx.fill();
  }, [data, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
    />
  );
}

function FullChart({ data, color, metric, timeRange }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = rect.width;
    const h = rect.height;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 30;

    const chartW = w - paddingLeft - paddingRight;
    const chartH = h - paddingTop - paddingBottom;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Find min/max
    const values = data.map(d => d.value);
    const max = Math.ceil(Math.max(...values, 10) / 10) * 10;
    const min = 0;
    const range = max - min || 1;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = paddingTop + (i / gridLines) * chartH;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();

      // Y-axis labels
      const value = max - (i / gridLines) * range;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value.toFixed(0) + '%', paddingLeft - 5, y + 4);
    }

    ctx.setLineDash([]);

    // Draw data line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    data.forEach((point, i) => {
      const x = paddingLeft + (i / (data.length - 1)) * chartW;
      const y = paddingTop + chartH - ((point.value - min) / range) * chartH;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Fill gradient
    const gradient = ctx.createLinearGradient(0, paddingTop, 0, h - paddingBottom);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '00');

    ctx.lineTo(paddingLeft + chartW, h - paddingBottom);
    ctx.lineTo(paddingLeft, h - paddingBottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw time labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    const timeLabels = 5;
    for (let i = 0; i <= timeLabels; i++) {
      const x = paddingLeft + (i / timeLabels) * chartW;
      const dataIndex = Math.floor((i / timeLabels) * (data.length - 1));
      const point = data[dataIndex];
      if (point?.timestamp) {
        const date = new Date(point.timestamp);
        const label = timeRange === '7d'
          ? date.toLocaleDateString('en-US', { weekday: 'short' })
          : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        ctx.fillText(label, x, h - 10);
      }
    }
  }, [data, color, timeRange]);

  const handleMouseMove = (e) => {
    if (!data || data.length === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const paddingLeft = 45;
    const chartW = rect.width - 45 - 15;

    const index = Math.round(((x - paddingLeft) / chartW) * (data.length - 1));
    if (index >= 0 && index < data.length) {
      const point = data[index];
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        value: point.value,
        time: new Date(point.timestamp).toLocaleString(),
      });
    }
  };

  return (
    <div className="relative" style={{ height: 200 }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none px-2 py-1 text-xs rounded"
          style={{
            left: tooltip.x,
            top: tooltip.y - 40,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-medium" style={{ color }}>{tooltip.value.toFixed(1)}%</div>
          <div className="text-muted">{tooltip.time}</div>
        </div>
      )}
    </div>
  );
}

export default function ResourceChart({
  metric = 'cpu',
  title,
  showMini = false,
  height,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1h');
  const [currentValue, setCurrentValue] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const range = TIME_RANGES.find(r => r.value === timeRange);
      const result = await metricsApi.get(metric, range?.minutes || 60);
      setData(result.data || []);
      if (result.data?.length > 0) {
        setCurrentValue(result.data[result.data.length - 1].value);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error.getUserMessage?.() || error.message);
    } finally {
      setLoading(false);
    }
  }, [metric, timeRange]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  const color = CHART_COLORS[metric] || '#3498db';
  const displayTitle = title || metric.toUpperCase().replace('_', ' ');

  if (showMini) {
    return (
      <div className="p-3 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted">{displayTitle}</span>
          {currentValue !== null && (
            <span className="text-sm font-medium" style={{ color }}>
              {currentValue.toFixed(1)}%
            </span>
          )}
        </div>
        <MiniChart data={data} color={color} height={height || 40} />
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: color }}
          />
          <span className="font-medium text-primary">{displayTitle}</span>
          {currentValue !== null && (
            <span className="text-sm text-muted">
              Current: <span style={{ color }}>{currentValue.toFixed(1)}%</span>
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {TIME_RANGES.map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={'px-2 py-1 text-xs rounded ' +
                (timeRange === range.value
                  ? 'bg-accent/20 text-accent'
                  : 'text-muted hover:text-primary')}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="p-3">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-muted">
            Loading metrics...
          </div>
        ) : data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted">
            No data available
          </div>
        ) : (
          <FullChart data={data} color={color} metric={metric} timeRange={timeRange} />
        )}
      </div>

      {/* Stats */}
      {data.length > 0 && (
        <div
          className="grid grid-cols-4 gap-4 p-3 text-center"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div>
            <div className="text-xs text-muted">Min</div>
            <div className="text-sm font-medium text-primary">
              {Math.min(...data.map(d => d.value)).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">Max</div>
            <div className="text-sm font-medium text-primary">
              {Math.max(...data.map(d => d.value)).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">Avg</div>
            <div className="text-sm font-medium text-primary">
              {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">Data Points</div>
            <div className="text-sm font-medium text-primary">{data.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Multi-metric overview widget
export function ResourceOverview() {
  const metrics = ['cpu', 'memory', 'disk'];

  return (
    <div className="grid grid-cols-3 gap-3">
      {metrics.map(metric => (
        <ResourceChart key={metric} metric={metric} showMini />
      ))}
    </div>
  );
}
