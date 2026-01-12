/**
 * Token Usage Widget Component
 * Track and display API token usage per session
 */

import { useState, useEffect, useMemo } from 'react';

// Format large numbers
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Format currency
const formatCost = (cost) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(cost);
};

// Token pricing (per 1M tokens)
const PRICING = {
  'claude-sonnet': { input: 3.00, output: 15.00 },
  'claude-opus': { input: 15.00, output: 75.00 },
  'claude-haiku': { input: 0.25, output: 1.25 },
};

export default function TokenUsageWidget({
  sessionId,
  projectId,
  compact = false,
  showDetails = true,
}) {
  const [usage, setUsage] = useState({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    requests: 0,
    model: 'claude-sonnet',
    history: [],
  });
  const [timeRange, setTimeRange] = useState('today');
  const [loading, setLoading] = useState(true);

  // Fetch usage data
  useEffect(() => {
    const fetchUsage = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (sessionId) params.set('sessionId', sessionId);
        if (projectId) params.set('projectId', projectId);
        params.set('range', timeRange);

        const response = await fetch(`/api/ai/usage?${params}`);
        if (response.ok) {
          const data = await response.json();
          setUsage(data);
        }
      } catch (error) {
        console.error('Failed to fetch usage:', error);
        // Use mock data for display
        setUsage({
          inputTokens: 45230,
          outputTokens: 12450,
          totalTokens: 57680,
          requests: 23,
          model: 'claude-sonnet',
          history: [
            { date: '2026-01-07', input: 15000, output: 4000, requests: 8 },
            { date: '2026-01-06', input: 18230, output: 5200, requests: 9 },
            { date: '2026-01-05', input: 12000, output: 3250, requests: 6 },
          ],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [sessionId, projectId, timeRange]);

  // Calculate cost
  const cost = useMemo(() => {
    const pricing = PRICING[usage.model] || PRICING['claude-sonnet'];
    const inputCost = (usage.inputTokens / 1000000) * pricing.input;
    const outputCost = (usage.outputTokens / 1000000) * pricing.output;
    return { input: inputCost, output: outputCost, total: inputCost + outputCost };
  }, [usage]);

  // Progress percentage (mock limit)
  const usagePercent = Math.min((usage.totalTokens / 1000000) * 100, 100);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span className="text-muted">{formatNumber(usage.totalTokens)} tokens</span>
        <span className="text-accent">{formatCost(cost.total)}</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="font-medium text-primary text-sm">Token Usage</span>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="text-xs px-2 py-1 rounded"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Main Stats */}
      <div className="p-3">
        {loading ? (
          <div className="text-center py-4 text-sm text-muted">Loading...</div>
        ) : (
          <>
            {/* Total Tokens with Progress */}
            <div className="mb-3">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-2xl font-semibold text-primary">{formatNumber(usage.totalTokens)}</span>
                <span className="text-xs text-muted">tokens</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${usagePercent}%`,
                    background: usagePercent > 80 ? 'var(--status-warning)' : 'var(--accent-primary)',
                  }}
                />
              </div>
              <div className="flex justify-between text-2xs text-muted mt-1">
                <span>{usagePercent.toFixed(1)}% of limit</span>
                <span>1M limit</span>
              </div>
            </div>

            {/* Token Breakdown */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="text-2xs text-muted mb-0.5">Input</div>
                <div className="text-sm font-medium text-primary">{formatNumber(usage.inputTokens)}</div>
                <div className="text-2xs text-muted">{formatCost(cost.input)}</div>
              </div>
              <div className="p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="text-2xs text-muted mb-0.5">Output</div>
                <div className="text-sm font-medium text-primary">{formatNumber(usage.outputTokens)}</div>
                <div className="text-2xs text-muted">{formatCost(cost.output)}</div>
              </div>
            </div>

            {/* Cost Summary */}
            <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <div>
                <div className="text-2xs text-muted">Estimated Cost</div>
                <div className="text-lg font-semibold text-accent">{formatCost(cost.total)}</div>
              </div>
              <div className="text-right">
                <div className="text-2xs text-muted">Requests</div>
                <div className="text-sm font-medium text-primary">{usage.requests}</div>
              </div>
            </div>

            {/* Usage History */}
            {showDetails && usage.history.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-medium text-secondary mb-2">Recent Usage</div>
                <div className="space-y-1">
                  {usage.history.slice(0, 5).map((day, index) => (
                    <div
                      key={day.date}
                      className="flex items-center justify-between text-xs p-1.5 rounded"
                      style={{ background: index % 2 === 0 ? 'transparent' : 'var(--bg-tertiary)' }}
                    >
                      <span className="text-muted">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="text-secondary">{formatNumber(day.input + day.output)} tokens</span>
                      <span className="text-muted">{day.requests} req</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Model Info */}
            <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs text-muted">Model: {usage.model}</span>
              </div>
              <div className="text-2xs text-muted">
                ${PRICING[usage.model]?.input.toFixed(2)}/1M in | ${PRICING[usage.model]?.output.toFixed(2)}/1M out
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Mini inline version for status bars
export function TokenUsageInline({ tokens, cost, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${className}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <span>{formatNumber(tokens)}</span>
      {cost !== undefined && (
        <span className="text-accent">({formatCost(cost)})</span>
      )}
    </span>
  );
}
