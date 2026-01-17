/**
 * Cost Dashboard Component
 * API cost tracking and analytics
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { aiCostsApi } from '../services/api.js';

const PROVIDER_COLORS = {
  anthropic: '#d4a27f',
  openai: '#10a37f',
  google: '#4285f4',
  other: '#95a5a6',
};

const MODEL_PRICING = {
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-opus-4': { input: 15, output: 75 },
  'claude-sonnet-4': { input: 3, output: 15 },
  'gpt-4': { input: 30, output: 60 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
};

function MiniChart({ data, color, height = 40 }) {
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

    ctx.clearRect(0, 0, w, h);

    const max = Math.max(...data, 1);

    // Draw bars
    const barWidth = (w - (data.length - 1) * 2) / data.length;
    data.forEach((value, i) => {
      const barHeight = (value / max) * (h - 4);
      const x = i * (barWidth + 2);
      const y = h - barHeight - 2;

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }, [data, color, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height, display: 'block' }}
    />
  );
}

function CostCard({ title, value, change, trend, icon }) {
  const isPositive = trend === 'up';
  const trendColor = isPositive ? '#e74c3c' : '#2ecc71';

  return (
    <div
      className="p-4 rounded-lg"
      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted mb-1">{title}</div>
          <div className="text-2xl font-bold text-primary">{value}</div>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: trendColor }}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isPositive ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            )}
          </svg>
          <span>{change}% vs last period</span>
        </div>
      )}
    </div>
  );
}

function ProviderBreakdown({ usage }) {
  const total = Object.values(usage).reduce((sum, v) => sum + v.cost, 0);

  return (
    <div className="space-y-3">
      {Object.entries(usage).map(([provider, data]) => {
        const percentage = total > 0 ? (data.cost / total) * 100 : 0;
        const color = PROVIDER_COLORS[provider] || PROVIDER_COLORS.other;

        return (
          <div key={provider}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="capitalize text-primary">{provider}</span>
              <span className="text-secondary">${data.cost.toFixed(2)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${percentage}%`, background: color }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>{data.requests.toLocaleString()} requests</span>
              <span>{percentage.toFixed(1)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModelUsageTable({ models }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <th className="py-2">Model</th>
            <th className="py-2 text-right">Input Tokens</th>
            <th className="py-2 text-right">Output Tokens</th>
            <th className="py-2 text-right">Cost</th>
          </tr>
        </thead>
        <tbody>
          {models.map((model, i) => (
            <tr
              key={model.name}
              className="hover:bg-white/5"
              style={{ borderBottom: i < models.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
            >
              <td className="py-2 text-primary">{model.name}</td>
              <td className="py-2 text-right text-secondary">{model.inputTokens.toLocaleString()}</td>
              <td className="py-2 text-right text-secondary">{model.outputTokens.toLocaleString()}</td>
              <td className="py-2 text-right font-medium text-accent">${model.cost.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CostDashboard({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  const fetchData = useCallback(async () => {
    try {
      const result = await aiCostsApi.getCosts(timeRange);
      setData(result);
    } catch (error) {
      console.error('Failed to fetch cost data:', error);
      // Demo data
      setData({
        totalCost: 12.45,
        totalTokens: 1250000,
        totalRequests: 342,
        costChange: -15,
        dailyCosts: [1.2, 1.8, 1.5, 2.1, 1.9, 2.3, 1.7],
        byProvider: {
          anthropic: { cost: 10.20, requests: 280 },
          openai: { cost: 2.25, requests: 62 },
        },
        byModel: [
          { name: 'claude-3-sonnet', inputTokens: 450000, outputTokens: 120000, cost: 5.85 },
          { name: 'claude-3-haiku', inputTokens: 350000, outputTokens: 80000, cost: 1.88 },
          { name: 'claude-3-opus', inputTokens: 50000, outputTokens: 15000, cost: 2.47 },
          { name: 'gpt-4-turbo', inputTokens: 100000, outputTokens: 25000, cost: 1.75 },
        ],
        projectedMonthly: 53.21,
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">API Cost Dashboard</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-2 py-1 text-xs rounded"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center text-muted py-8">Loading cost data...</div>
          ) : !data ? (
            <div className="text-center text-muted py-8">No cost data available</div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <CostCard
                  title="Total Spend"
                  value={`$${data.totalCost.toFixed(2)}`}
                  change={data.costChange}
                  trend={data.costChange > 0 ? 'up' : 'down'}
                  icon="💰"
                />
                <CostCard
                  title="Total Tokens"
                  value={data.totalTokens.toLocaleString()}
                  icon="🔤"
                />
                <CostCard
                  title="API Requests"
                  value={data.totalRequests.toLocaleString()}
                  icon="🔄"
                />
                <CostCard
                  title="Projected Monthly"
                  value={`$${data.projectedMonthly.toFixed(2)}`}
                  icon="📊"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Daily Cost Chart */}
                <div
                  className="p-4 rounded-lg"
                  style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
                >
                  <h3 className="text-sm font-medium text-primary mb-3">Daily Costs</h3>
                  <MiniChart data={data.dailyCosts} color="#3498db" height={100} />
                  <div className="flex justify-between text-xs text-muted mt-2">
                    <span>7 days ago</span>
                    <span>Today</span>
                  </div>
                </div>

                {/* Provider Breakdown */}
                <div
                  className="p-4 rounded-lg"
                  style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
                >
                  <h3 className="text-sm font-medium text-primary mb-3">By Provider</h3>
                  <ProviderBreakdown usage={data.byProvider} />
                </div>
              </div>

              {/* Model Usage Table */}
              <div
                className="p-4 rounded-lg"
                style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
              >
                <h3 className="text-sm font-medium text-primary mb-3">Model Usage</h3>
                <ModelUsageTable models={data.byModel} />
              </div>

              {/* Cost Optimization Tips */}
              <div
                className="p-4 rounded-lg"
                style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
              >
                <h3 className="text-sm font-medium text-primary mb-3">Cost Optimization Tips</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">*</span>
                    <span className="text-secondary">
                      Consider using Claude Haiku for simple tasks - 60x cheaper than Opus
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">*</span>
                    <span className="text-secondary">
                      Implement caching for repeated queries to reduce API calls
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">*</span>
                    <span className="text-secondary">
                      Use prompt compression techniques to reduce input tokens
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs text-muted"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <span>Prices based on per-million-token rates</span>
          <button onClick={fetchData} className="text-accent hover:underline">
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

// Widget version for dashboard
export function CostWidget() {
  const [data, setData] = useState({ totalCost: 0, totalTokens: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await aiCostsApi.getCosts('7d');
        setData(result);
      } catch (error) {
        // Fallback
        setData({ totalCost: 12.45, totalTokens: 1250000 });
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">7-Day Spend</span>
        <span className="text-lg font-bold text-accent">${data.totalCost?.toFixed(2) || '0.00'}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">Tokens Used</span>
        <span className="text-secondary">{(data.totalTokens || 0).toLocaleString()}</span>
      </div>
    </div>
  );
}
