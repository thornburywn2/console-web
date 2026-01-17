/**
 * TechBadge Component
 * Technology badge with count
 */

const TECH_COLORS = {
  React: '#61dafb',
  TypeScript: '#3178c6',
  JavaScript: '#f7df1e',
  'Node.js': '#68a063',
  Python: '#3776ab',
  Docker: '#2496ed',
  Tailwind: '#38bdf8',
};

export default function TechBadge({ name, count }) {
  const color = TECH_COLORS[name] || 'var(--accent-primary)';
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-mono"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {name} ({count})
    </span>
  );
}
