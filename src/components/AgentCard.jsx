/**
 * AgentCard Component
 * Displays a single agent from the marketplace catalog
 *
 * Uses hacker theme to match Console.web styling
 */

export default function AgentCard({
  agent,
  categoryIcon,
  triggerLabels,
  isInstalling,
  onSelect,
  onUninstall
}) {
  const { isInstalled } = agent;

  return (
    <div
      className={`p-4 bg-hacker-surface border rounded-lg transition-all font-mono ${
        isInstalled
          ? 'border-hacker-green/50 hover:border-hacker-green'
          : 'border-hacker-border hover:border-hacker-cyan/50 cursor-pointer'
      }`}
      onClick={() => !isInstalled && onSelect()}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`p-2 rounded-lg ${
          isInstalled ? 'bg-hacker-green/20 text-hacker-green' : 'bg-hacker-surface text-hacker-cyan'
        }`}>
          {categoryIcon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-hacker-text truncate">{agent.name}</h3>
            {isInstalled && (
              <span className="px-2 py-0.5 bg-hacker-green/20 text-hacker-green text-xs rounded-full flex-shrink-0 border border-hacker-green/30">
                Installed
              </span>
            )}
          </div>

          <p className="text-sm text-hacker-text-dim line-clamp-2 mt-1">
            {agent.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {agent.tags?.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-hacker-surface text-hacker-text-dim text-xs rounded border border-hacker-border"
              >
                {tag}
              </span>
            ))}
            {agent.tags?.length > 3 && (
              <span className="px-1.5 py-0.5 text-hacker-text-dim text-xs">
                +{agent.tags.length - 3} more
              </span>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-3 text-xs text-hacker-text-dim">
            <span>{agent.author}</span>
            <span className="text-hacker-border">|</span>
            <span className="px-1.5 py-0.5 bg-hacker-surface text-hacker-cyan rounded border border-hacker-border">
              {triggerLabels[agent.defaultTrigger] || agent.defaultTrigger}
            </span>
            <span className="px-1.5 py-0.5 bg-hacker-surface text-hacker-purple rounded border border-hacker-border">
              v{agent.version}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-hacker-border">
        {isInstalled ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUninstall();
              }}
              className="flex-1 px-3 py-1.5 text-sm text-hacker-error hover:bg-hacker-error/10 rounded transition-colors border border-transparent hover:border-hacker-error/30"
            >
              Uninstall
            </button>
            <span className="flex items-center gap-1 text-hacker-green text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Active
            </span>
          </>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            disabled={isInstalling}
            className="flex-1 px-3 py-1.5 text-sm bg-hacker-green/20 hover:bg-hacker-green/30 text-hacker-green rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-hacker-green/30"
          >
            {isInstalling ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Installing...
              </span>
            ) : (
              'Install'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
