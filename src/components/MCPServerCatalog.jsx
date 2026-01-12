/**
 * MCPServerCatalog Component
 * Browse and install pre-configured MCP servers from the catalog
 * Categories: Official, Cloud, Database, Developer, Productivity, Search
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
        className={`p-4 bg-gray-800 border rounded-lg hover:border-blue-500 transition-all cursor-pointer ${
          isInstalled ? 'border-green-500/50' : 'border-gray-700'
        }`}
        onClick={() => !isInstalled && setSelectedServer(server)}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-700 rounded-lg text-blue-400">
            {CATEGORY_ICONS[server.category] || CATEGORY_ICONS.developer}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-200">{server.name}</h3>
              {isInstalled && (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                  Installed
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 line-clamp-2 mt-1">{server.description}</p>

            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-500">{server.author}</span>
              <span className="text-gray-600">|</span>
              <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                {server.transport}
              </span>
            </div>

            {server.tags && (
              <div className="flex flex-wrap gap-1 mt-2">
                {server.tags.slice(0, 4).map(tag => (
                  <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-700/50 text-gray-500 rounded">
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
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded transition-colors flex items-center gap-1"
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
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-200">Configure {server.name}</h3>
            <p className="text-sm text-gray-400 mt-1">{server.description}</p>
          </div>
          <button
            onClick={closeConfig}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-auto max-h-[60vh] space-y-4">
          {server.configurable?.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              {field.type === 'array' ? (
                <textarea
                  value={configValues[field.key] || ''}
                  onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder || 'One per line...'}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <input
                  type={field.type === 'password' ? 'password' : 'text'}
                  value={configValues[field.key] || ''}
                  onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              {field.description && (
                <p className="text-xs text-gray-500 mt-1">{field.description}</p>
              )}
            </div>
          ))}

          {server.tools && (
            <div className="pt-4 border-t border-gray-700">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Available Tools</h4>
              <div className="flex flex-wrap gap-1">
                {server.tools.map(tool => (
                  <span key={tool} className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded-full font-mono">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex items-center justify-between">
          {server.repository && (
            <a
              href={server.repository}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View Repository
            </a>
          )}
          <div className="flex gap-2">
            <button
              onClick={closeConfig}
              className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleInstall(server)}
              disabled={installing === server.id}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
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
        <div className="text-gray-400 flex items-center gap-2">
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-200">MCP Server Catalog</h2>
            <p className="text-sm text-gray-400">{catalog.totalServers} pre-configured servers available</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search servers..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            All ({catalog.totalServers})
          </button>
          {catalog.categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
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
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Server grid */}
      <div className="flex-1 overflow-auto p-4">
        {filteredServers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No servers found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
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
