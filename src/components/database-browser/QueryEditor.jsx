/**
 * QueryEditor Component
 * SQL query input with run button
 */

export default function QueryEditor({ query, onChange, onRun, running }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-primary">SQL Query</h4>
        <button
          onClick={onRun}
          disabled={running || !query.trim()}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
        >
          {running ? (
            <>
              <div className="w-3 h-3 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
              Run Query
            </>
          )}
        </button>
      </div>
      <textarea
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="SELECT * FROM users LIMIT 10;"
        className="w-full h-32 px-3 py-2 rounded font-mono text-sm resize-none"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
        spellCheck={false}
      />
    </div>
  );
}
