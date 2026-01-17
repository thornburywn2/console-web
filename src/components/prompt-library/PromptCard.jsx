/**
 * Prompt Card Component
 */

export function PromptCard({ prompt, onUse, onToggleFavorite, onEdit, onDelete }) {
  return (
    <div
      className="p-3 rounded-lg group hover:bg-white/5 transition-colors"
      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-primary">{prompt.name}</span>
            {prompt.isFavorite && <span className="text-yellow-400">⭐</span>}
            {prompt.category && (
              <span className="text-2xs px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                {prompt.category}
              </span>
            )}
          </div>
          {prompt.description && (
            <p className="text-xs text-secondary mt-1">{prompt.description}</p>
          )}
          <p className="text-xs text-muted mt-1 line-clamp-2 font-mono">
            {prompt.content.slice(0, 100)}...
          </p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onUse(prompt)}
            className="px-2 py-1 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30"
          >
            Use
          </button>
          <button
            onClick={() => onToggleFavorite(prompt)}
            className="p-1 hover:bg-white/10 rounded"
            title={prompt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {prompt.isFavorite ? '⭐' : '☆'}
          </button>
          <button
            onClick={() => onEdit(prompt)}
            className="p-1 hover:bg-white/10 rounded text-xs"
            title="Edit"
          >
            ✎
          </button>
          <button
            onClick={() => onDelete(prompt.id)}
            className="p-1 hover:bg-red-500/20 rounded text-xs text-red-400"
            title="Delete"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
