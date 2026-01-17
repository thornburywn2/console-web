/**
 * DiffView Component
 * Displays differences between two env files
 */

export default function DiffView({ source, target, differences }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="font-mono">{source}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <span className="font-mono">{target}</span>
      </div>
      {differences.added?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-green-400 font-medium">+ Added ({differences.added.length})</div>
          {differences.added.map(key => (
            <div key={key} className="text-xs font-mono pl-3 text-green-400/80">{key}</div>
          ))}
        </div>
      )}
      {differences.removed?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-red-400 font-medium">- Removed ({differences.removed.length})</div>
          {differences.removed.map(key => (
            <div key={key} className="text-xs font-mono pl-3 text-red-400/80">{key}</div>
          ))}
        </div>
      )}
      {differences.changed?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-yellow-400 font-medium">~ Changed ({differences.changed.length})</div>
          {differences.changed.map(key => (
            <div key={key} className="text-xs font-mono pl-3 text-yellow-400/80">{key}</div>
          ))}
        </div>
      )}
      {!differences.added?.length && !differences.removed?.length && !differences.changed?.length && (
        <div className="text-xs text-green-400">Files are in sync</div>
      )}
    </div>
  );
}
