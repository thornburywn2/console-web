/**
 * MCPServerCatalog Component
 * Browse and install pre-configured MCP servers from the catalog
 * Categories: Official, Cloud, Database, Developer, Productivity, Search
 *
 * Uses hacker theme to match Console.web styling
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect } from 'react';
import { CATEGORY_ICONS, ServerCard, ConfigModal } from './mcp-catalog';
import { mcpCatalogApi } from '../services/api.js';

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
        const [catalogData, installedData] = await Promise.all([
          mcpCatalogApi.getCatalog(),
          mcpCatalogApi.getInstalled()
        ]);
        setCatalog(catalogData || { categories: [], servers: [] });
        setInstalled(installedData || {});
      } catch (err) {
        const message = err.getUserMessage?.() || 'Failed to load catalog';
        setError(message);
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

      const newServer = await mcpCatalogApi.install(server.id, {
        config,
        isGlobal: true,
        autoStart: true
      });
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
    } catch (err) {
      const message = err.getUserMessage?.() || 'Failed to install server';
      setError(message);
      console.error(err);
    } finally {
      setInstalling(null);
    }
  };

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
              <ServerCard
                key={server.id}
                server={server}
                installed={installed}
                installing={installing}
                onSelect={setSelectedServer}
                onInstall={handleInstall}
              />
            ))}
          </div>
        )}
      </div>

      {/* Configuration modal */}
      {selectedServer && (
        <ConfigModal
          server={selectedServer}
          configValues={configValues}
          setConfigValues={setConfigValues}
          installing={installing}
          onInstall={handleInstall}
          onClose={() => {
            setSelectedServer(null);
            setConfigValues({});
          }}
        />
      )}
    </div>
  );
}
