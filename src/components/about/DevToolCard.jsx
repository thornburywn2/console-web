/**
 * DevToolCard Component
 * Display developer tool features
 */

export default function DevToolCard({ tool }) {
  return (
    <div
      className="p-5 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
          <span className="text-accent font-mono font-bold text-sm">{tool.icon}</span>
        </div>
        <h4 className="text-primary font-semibold">{tool.name}</h4>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {tool.features.map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-accent">+</span>
            <span className="text-secondary">{feature}</span>
          </div>
        ))}
      </div>
      <div
        className="p-3 rounded-lg text-xs"
        style={{ background: 'var(--bg-accent)', border: '1px solid var(--border-accent)' }}
      >
        <span className="text-accent font-medium">Highlight:</span>
        <span className="text-primary ml-2">{tool.highlight}</span>
      </div>
    </div>
  );
}
