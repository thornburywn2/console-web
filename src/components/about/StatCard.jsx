/**
 * StatCard Component
 * Display platform statistic in a card
 */

export default function StatCard({ stat }) {
  return (
    <div className="relative group">
      <div
        className="p-4 rounded-xl text-center transition-all duration-300 group-hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="text-xs font-mono text-accent/60 mb-1">{stat.icon}</div>
        <div className="text-3xl font-bold text-accent font-mono">{stat.value}</div>
        <div className="text-xs text-muted mt-1">{stat.label}</div>
      </div>
    </div>
  );
}
