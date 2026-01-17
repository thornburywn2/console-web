/**
 * TemplateCard Component
 * Selectable card for project template options
 */

export default function TemplateCard({ template, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className="w-full p-4 rounded-xl text-left transition-all duration-200"
      style={{
        background: selected
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1))'
          : 'var(--bg-tertiary)',
        border: selected
          ? '2px solid var(--accent-primary)'
          : '2px solid var(--border-default)',
        boxShadow: selected ? '0 0 30px rgba(16, 185, 129, 0.2)' : 'none',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: selected
              ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
              : 'var(--bg-secondary)',
          }}
        >
          <span className="text-2xl">{template.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {template.name}
            </span>
            {template.recommended && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: 'var(--accent-primary)'
                }}
              >
                RECOMMENDED
              </span>
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {template.description}
          </p>
          {template.stack && (
            <div className="flex flex-wrap gap-1 mt-2">
              {template.stack.map((tech) => (
                <span
                  key={tech}
                  className="text-[10px] px-2 py-0.5 rounded"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>
        {selected && (
          <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        )}
      </div>
    </button>
  );
}
