/**
 * InputField Component
 * Text input with label, description, and error support
 */

export default function InputField({ label, value, onChange, placeholder, description, type = 'text', required, error }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label} {required && <span style={{ color: 'var(--status-error)' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-glass w-full px-4 py-3 text-base transition-all"
        style={{
          borderColor: error ? 'var(--status-error)' : undefined,
        }}
      />
      {description && (
        <p className="text-xs" style={{ color: error ? 'var(--status-error)' : 'var(--text-muted)' }}>
          {error || description}
        </p>
      )}
    </div>
  );
}
