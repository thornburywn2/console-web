/**
 * MCP Server Card Component
 */

import { CATEGORY_ICONS } from './constants';

export function ServerCard({ server, installed, installing, onSelect, onInstall }) {
  const isInstalled = installed[server.id]?.installed;
  const isCurrentlyInstalling = installing === server.id;

  return (
    <div
      className={`p-4 bg-hacker-surface border rounded-lg hover:border-hacker-cyan/50 transition-all cursor-pointer font-mono ${
        isInstalled ? 'border-hacker-green/50' : 'border-hacker-border'
      }`}
      onClick={() => !isInstalled && onSelect(server)}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-hacker-surface rounded-lg text-hacker-cyan border border-hacker-border">
          {CATEGORY_ICONS[server.category] || CATEGORY_ICONS.developer}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-hacker-text">{server.name}</h3>
            {isInstalled && (
              <span className="px-2 py-0.5 bg-hacker-green/20 text-hacker-green text-xs rounded-full border border-hacker-green/30">
                Installed
              </span>
            )}
          </div>
          <p className="text-sm text-hacker-text-dim line-clamp-2 mt-1">{server.description}</p>

          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-hacker-text-dim">{server.author}</span>
            <span className="text-hacker-border">|</span>
            <span className="text-xs px-1.5 py-0.5 bg-hacker-surface text-hacker-cyan rounded border border-hacker-border">
              {server.transport}
            </span>
          </div>

          {server.tags && (
            <div className="flex flex-wrap gap-1 mt-2">
              {server.tags.slice(0, 4).map(tag => (
                <span key={tag} className="text-xs px-1.5 py-0.5 bg-hacker-surface/50 text-hacker-text-dim rounded border border-hacker-border/50">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {!isInstalled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (server.configurable?.length > 0) {
                onSelect(server);
              } else {
                onInstall(server);
              }
            }}
            disabled={isCurrentlyInstalling}
            className="px-3 py-1.5 bg-hacker-green/20 hover:bg-hacker-green/30 disabled:opacity-50 text-hacker-green text-sm rounded transition-colors flex items-center gap-1 border border-hacker-green/30"
          >
            {isCurrentlyInstalling ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Installing
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Install
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
