/**
 * Trace Result Card
 */

export function TraceResult({ trace }) {
  return (
    <div className="hacker-card bg-hacker-surface/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-hacker-cyan font-mono">
          {trace.traceID?.substring(0, 16) || 'Unknown'}...
        </span>
        <span className="text-xs text-hacker-text-dim">
          {trace.spans?.[0]?.operationName || 'Unknown operation'}
        </span>
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-hacker-text-dim">
        <span>Spans: {trace.spans?.length || 0}</span>
        <span>Duration: {(trace.spans?.[0]?.duration / 1000 || 0).toFixed(2)}ms</span>
      </div>
    </div>
  );
}
