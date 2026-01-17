/**
 * Config Item Component
 * Renders different input types for configuration values
 */

export default function ConfigItem({ label, value, type = 'text', options, onChange }) {
  if (type === 'checkbox') {
    return (
      <label className="flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <input type="checkbox" checked={value || false} onChange={(e) => onChange(e.target.checked)}
          className="rounded" />
      </label>
    );
  }

  if (options) {
    return (
      <label className="flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}
          className="px-2 py-1 rounded bg-surface border border-border text-foreground text-sm">
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </label>
    );
  }

  if (type === 'color') {
    return (
      <label className="flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <input type="color" value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)}
            className="h-8 w-16 rounded cursor-pointer" />
          <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)}
            placeholder="#ffffff"
            className="px-2 py-1 rounded bg-surface border border-border text-foreground text-sm w-24 font-mono" />
        </div>
      </label>
    );
  }

  return (
    <label className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 rounded bg-surface border border-border text-foreground text-sm w-48" />
    </label>
  );
}
