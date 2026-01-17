/**
 * MiniStat Component
 * Compact statistic display for dashboard
 */

export default function MiniStat({ icon, value, label, color }) {
  return (
    <div className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-glass)' }}>
      <div className="text-sm mb-0.5">{icon}</div>
      <div className="text-base font-bold font-mono" style={{ color }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
