/**
 * MCPServerCatalog Component
 * Browse and install pre-configured MCP servers from the catalog
 * Categories: Official, Cloud, Database, Developer, Productivity, Search
 *
 * Uses hacker theme to match Console.web styling
 */

import { useState, useEffect, useCallback } from 'react';

// Category icons
const CATEGORY_ICONS = {
  'official': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  'cloud': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  ),
  'database': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  'developer': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  'productivity': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  'search': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
};

export default function MCPServerCatalog({ onInstall, onClose }) {
  const [catalog, setCatalog] = useState({ categories: [], servers: [] });
  const [installed, setInstalled] = useState({});
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServer, setSelectedServer] = useState(null);
  const [configValues, setConfigValues] = useState({});
  const [error, setError] = useState(null);

  // Fetch catalog and installed status
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catalogRes, installedRes] = await Promise.all([
          fetch('/api/mcp/catalog'),
          fetch('/api/mcp/catalog/installed')
        ]);

        if (catalogRes.ok) {
          const data = await catalogRes.json();
          setCatalog(data);
        }

        if (installedRes.ok) {
          const data = await installedRes.json();
          setInstalled(data);
        }
      } catch (err) {
        setError('Failed to load catalog');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter servers based on category and search
  const filteredServers = catalog.servers.filter(server => {
    const matchesCategory = selectedCategory === 'all' || server.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Install a server from catalog
  const handleInstall = async (server) => {
    setInstalling(server.id);
    setError(null);

    try {
      // Build config from form values
      const config = {};

      // Handle env variables
      if (server.configurable) {
        const env = {};
        server.configurable.forEach(field => {
          if (field.key.startsWith('GITHUB_') || field.key.startsWith('SLACK_') ||
              field.key.startsWith('NOTION_') || field.key.startsWith('SENTRY_') ||
              field.key.startsWith('BRAVE_') || field.key.startsWith('AZURE_') ||
              field.key.startsWith('AWS_') || field.key.startsWith('EXA_') ||
              field.key.startsWith('GOOGLE_') || field.key.startsWith('EVERART_') ||
              field.key.startsWith('POSTGRES_')) {
            if (configValues[field.key]) {
              env[field.key] = configValues[field.key];
            }
          } else if (field.key === 'directories') {
            if (configValues.directories) {
              config.directories = configValues.directories.split('\n').filter(d => d.trim());
            }
          } else if (configValues[field.key]) {
            config[field.key] = configValues[field.key];
          }
        });
        if (Object.keys(env).length > 0) {
          config.env = env;
        }
      }

      const response = await fetch(`/api/mcp/catalog/install/${server.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          isGlobal: true,
          autoStart: true
        })
      });

      if (response.ok) {
        const newServer = await response.json();
        setInstalled(prev => ({
          ...prev,
          [server.id]: {
            installed: true,
            serverId: newServer.id,
            status: newServer.status,
            enabled: true
          }
        }));
        setSelectedServer(null);
        setConfigValues({});
        if (onInstall) onInstall(newServer);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to install server');
      }
    } catch (err) {
      setError('Failed to install server');
      console.error(err);
    } finally {
      setInstalling(null);
    }
  };

  // Server card component
  const ServerCard = ({ server }) => {
    const isInstalled = installed[server.id]?.installed;
    const isCurrentlyInstalling = installing === server.id;

    return (
      <div
        className={`p-4 bg-hacker-surface border rounded-lg hover:border-hacker-cyan/50 transition-all cursor-pointer font-mono ${
          isInstalled ? 'border-hacker-green/50' : 'border-hacker-border'
        }`}
        onClick={() => !isInstalled && setSelectedServer(server)}
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
                  setSelectedServer(server);
                } else {
                  handleInstall(server);
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
  };

  // Configuration modal
  const ConfigModal = ({ server, onClose: closeConfig }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-hacker-bg border border-hacker-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-hacker-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-hacker-green font-mono">Configure {server.name}</h3>
            <p className="text-sm text-hacker-text-dim mt-1 font-mono">{server.description}</p>
          </div>
          <button
            onClick={closeConfig}
            className="p-2 text-hacker-text-dim hover:text-hacker-green hover:bg-hacker-surface rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-auto max-h-[60vh] space-y-4">
          {server.configurable?.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-hacker-text mb-1 font-mono">
                {field.label}
                {field.required && <span className="text-hacker-error ml-1">*</span>}
              </label>
              {field.type === 'array' ? (
                <textarea
                  value={configValues[field.key] || ''}
                  onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder || 'One per line...'}
                  rows={3}
                  className="w-full px-3 py-2 bg-hacker-surface border border-hacker-border rounded-lg text-hacker-text placeholder-hacker-text-dim focus:outline-none focus:border-hacker-green/50 font-mono"
                />
              ) : (
                <input
                  type={field.type === 'password' ? 'password' : 'text'}
                  value={configValues[field.key] || ''}
                  onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 bg-hacker-surface border border-hacker-border rounded-lg text-hacker-text placeholder-hacker-text-dim focus:outline-none focus:border-hacker-green/50 font-mono"
                />
              )}
              {field.description && (
                <p className="text-xs text-hacker-text-dim mt-1 font-mono">{field.description}</p>
              )}
            </div>
          ))}

          {server.tools && (
            <div className="pt-4 border-t border-hacker-border">
              <h4 className="text-sm font-medium text-hacker-text-dim mb-2 font-mono">Available Tools</h4>
              <div className="flex flex-wrap gap-1">
                {server.tools.map(tool => (
                  <span key={tool} className="text-xs px-2 py-1 bg-hacker-surface text-hacker-cyan rounded-full font-mono border border-hacker-border">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-hacker-border flex items-center justify-between bg-hacker-surface/50">
          {server.repository && (
            <a
              href={server.repository}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-hacker-cyan hover:text-hacker-cyan/80 font-mono"
            >
              View Repository
            </a>
          )}
          <div className="flex gap-2">
            <button
              onClick={closeConfig}
              className="px-4 py-2 text-hacker-text-dim hover:text-hacker-text transition-colors border border-hacker-border rounded-lg font-mono"
            >
              Cancel
            </button>
            <button
              onClick={() => handleInstall(server)}
              disabled={installing === server.id}
              className="px-4 py-2 bg-hacker-green/20 hover:bg-hacker-green/30 disabled:opacity-50 text-hacker-green rounded-lg transition-colors flex items-center gap-2 border border-hacker-green/30 font-mono"
            >
              {installing === server.id ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Installing...
                </>
              ) : (
                'Install Server'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-hacker-text-dim flex items-center gap-2 font-mono">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading catalog...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-hacker-bg">
      {/* Header */}
      <div className="p-4 border-b border-hacker-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-hacker-green font-mono uppercase tracking-wider">
              {'>'} MCP_SERVER_CATALOG
            </h2>
            <p className="text-sm text-hacker-text-dim font-mono">{catalog.totalServers} pre-configured servers available</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-hacker-text-dim hover:text-hacker-green hover:bg-hacker-surface rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hacker-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search servers..."
            className="w-full pl-10 pr-4 py-2 bg-hacker-surface border border-hacker-border rounded-lg text-hacker-text placeholder-hacker-text-dim focus:outline-none focus:border-hacker-green/50 font-mono"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors font-mono ${
              selectedCategory === 'all'
                ? 'bg-hacker-green/20 text-hacker-green border border-hacker-green/30'
                : 'bg-hacker-surface text-hacker-text-dim border border-hacker-border hover:border-hacker-green/30'
            }`}
          >
            All ({catalog.totalServers})
          </button>
          {catalog.categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center gap-2 font-mono ${
                selectedCategory === cat.id
                  ? 'bg-hacker-green/20 text-hacker-green border border-hacker-green/30'
                  : 'bg-hacker-surface text-hacker-text-dim border border-hacker-border hover:border-hacker-green/30'
              }`}
            >
              {CATEGORY_ICONS[cat.id]}
              {cat.name} ({cat.serverCount})
            </button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-hacker-error/10 border border-hacker-error/50 rounded-lg text-hacker-error text-sm flex items-center gap-2 font-mono">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-hacker-error hover:text-hacker-error/80">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Server grid */}
      <div className="flex-1 overflow-auto p-4">
        {filteredServers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-hacker-text-dim font-mono">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No servers found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-hacker-cyan hover:text-hacker-cyan/80 text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredServers.map(server => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        )}
      </div>

      {/* Configuration modal */}
      {selectedServer && (
        <ConfigModal
          server={selectedServer}
          onClose={() => {
            setSelectedServer(null);
            setConfigValues({});
          }}
        />
      )}
    </div>
  );
}
