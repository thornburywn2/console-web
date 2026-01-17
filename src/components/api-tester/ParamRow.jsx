/**
 * ParamRow Component
 * Editable parameter key-value row
 */

export default function ParamRow({ param, onChange, onDelete }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <input
        type="text"
        value={param.key}
        onChange={(e) => onChange({ ...param, key: e.target.value })}
        placeholder="Parameter name"
        className="flex-1 px-2 py-1.5 text-sm rounded font-mono"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
      />
      <input
        type="text"
        value={param.value}
        onChange={(e) => onChange({ ...param, value: e.target.value })}
        placeholder="Value"
        className="flex-1 px-2 py-1.5 text-sm rounded font-mono"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
      />
      <button
        onClick={onDelete}
        className="p-1.5 hover:bg-red-500/20 rounded"
      >
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
