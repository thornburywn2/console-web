/**
 * MCPServerManager Component
 * Main UI for managing MCP servers - list, create, edit, and monitor
 * Includes catalog for one-click installation of popular servers
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import MCPServerBuilder from './MCPServerBuilder';
import MCPToolBrowser from './MCPToolBrowser';
import MCPStatusIndicator from './MCPStatusIndicator';
import MCPServerCatalog from './MCPServerCatalog';
import { TRANSPORT_LABELS, TRANSPORT_ICONS } from './mcp-server-manager';
import { mcpServersApi } from '../services/api.js';

export default function MCPServerManager({ socket }) {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [activeTab, setActiveTab] = useState('servers');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchServers = useCallback(async () => {
    try {
      const data = await mcpServersApi.list();
      setServers(data);
      setError(null);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleStatusChange = (data) => {
      setServers(prev => prev.map(s =>
        s.id === data.serverId
          ? { ...s, status: data.status, isRunning: data.status === 'CONNECTED' }
          : s
      ));
    };

    const handleToolsUpdated = (data) => {
      // Refresh server to get updated tools
      fetchServers();
    };

    socket.on('mcp-status-change', handleStatusChange);
    socket.on('mcp-tools-updated', handleToolsUpdated);

    return () => {
      socket.off('mcp-status-change', handleStatusChange);
      socket.off('mcp-tools-updated', handleToolsUpdated);
    };
  }, [socket, fetchServers]);

  const handleAction = async (serverId, action) => {
    setActionLoading(`${serverId}-${action}`);
    try {
      await mcpServersApi.action(serverId, action);
      await fetchServers();
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (serverId) => {
    setActionLoading(`${serverId}-delete`);
    try {
      await mcpServersApi.delete(serverId);

      setServers(prev => prev.filter(s => s.id !== serverId));
      if (selectedServer?.id === serverId) {
        setSelectedServer(null);
      }
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveServer = async (serverData) => {
    const isEdit = !!editingServer;
    if (isEdit) {
      await mcpServersApi.update(editingServer.id, serverData);
    } else {
      await mcpServersApi.create(serverData);
    }

    await fetchServers();
    setShowBuilder(false);
    setEditingServer(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-gray-700/50 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-700/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (showBuilder) {
    return (
      <MCPServerBuilder
        server={editingServer}
        onSave={handleSaveServer}
        onCancel={() => {
          setShowBuilder(false);
          setEditingServer(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-100">MCP Servers</h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage Model Context Protocol server connections
          </p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Server
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('servers')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'servers'
              ? 'text-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Servers
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-700 rounded">
            {servers.length}
          </span>
          {activeTab === 'servers' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'tools'
              ? 'text-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Tools
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-700 rounded">
            {servers.reduce((acc, s) => acc + (s.tools?.length || 0), 0)}
          </span>
          {activeTab === 'tools' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'catalog'
              ? 'text-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Catalog
          {activeTab === 'catalog' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'catalog' ? (
        <MCPServerCatalog
          onInstall={(newServer) => {
            fetchServers();
            setActiveTab('servers');
          }}
        />
      ) : activeTab === 'servers' ? (
        servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            <p className="text-lg font-medium">No MCP servers configured</p>
            <p className="text-sm mt-1">Add a server or browse the catalog</p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setActiveTab('catalog')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Browse Catalog
              </button>
              <button
                onClick={() => setShowBuilder(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                Add Custom Server
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {servers.map(server => (
              <div
                key={server.id}
                className={`p-4 bg-gray-800/50 border rounded-lg transition-all cursor-pointer ${
                  selectedServer?.id === server.id
                    ? 'border-blue-500 bg-gray-800'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => setSelectedServer(selectedServer?.id === server.id ? null : server)}
              >
                {/* Server header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <MCPStatusIndicator status={server.status} isRunning={server.isRunning} />
                    <div>
                      <h3 className="font-medium text-gray-100">{server.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          {TRANSPORT_ICONS[server.transport]}
                          {TRANSPORT_LABELS[server.transport]}
                        </span>
                        {server.isGlobal ? (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                            Global
                          </span>
                        ) : server.project && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                            {server.project.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Toggle enabled */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(server.id, 'toggle');
                      }}
                      disabled={actionLoading === `${server.id}-toggle`}
                      className={`p-1.5 rounded transition-colors ${
                        server.enabled
                          ? 'text-green-400 hover:bg-green-500/20'
                          : 'text-gray-500 hover:bg-gray-700'
                      }`}
                      title={server.enabled ? 'Disable server' : 'Enable server'}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Tools count */}
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {server.tools?.length || 0} tools
                  </span>
                  {server.lastConnected && (
                    <span className="text-xs text-gray-500">
                      Last connected: {new Date(server.lastConnected).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Expanded actions */}
                {selectedServer?.id === server.id && (
                  <div className="mt-4 pt-4 border-t border-gray-700 flex items-center gap-2">
                    {server.isRunning ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(server.id, 'stop');
                        }}
                        disabled={actionLoading === `${server.id}-stop`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                      >
                        {actionLoading === `${server.id}-stop` ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                          </svg>
                        )}
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(server.id, 'start');
                        }}
                        disabled={actionLoading === `${server.id}-start` || !server.enabled}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded transition-colors disabled:opacity-50"
                      >
                        {actionLoading === `${server.id}-start` ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        )}
                        Start
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(server.id, 'restart');
                      }}
                      disabled={actionLoading === `${server.id}-restart`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Restart
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(server.id, 'discover');
                      }}
                      disabled={actionLoading === `${server.id}-discover`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Discover Tools
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingServer(server);
                        setShowBuilder(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(server);
                      }}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <MCPToolBrowser servers={servers} />
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-100 mb-2">Delete MCP Server</h3>
            <p className="text-gray-400 mb-4">
              Are you sure you want to delete <strong className="text-gray-200">{deleteConfirm.name}</strong>? This will remove all associated tools and logs.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                disabled={actionLoading === `${deleteConfirm.id}-delete`}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-2"
              >
                {actionLoading === `${deleteConfirm.id}-delete` && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
