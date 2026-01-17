/**
 * MemoryBankPanel Component
 * Manages layered context persistence (Session, Project, Global)
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { MEMORY_TYPES, SCOPE_COLORS, MemoryCard } from './memory-bank';
import { memoryApi } from '../services/api.js';

export default function MemoryBankPanel({ projectId, sessionId, onClose }) {
  const [memories, setMemories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeScope, setActiveScope] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  // Form state for creating/editing
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'CONTEXT',
    scope: 'PROJECT',
    importance: 5,
    tags: '',
    category: ''
  });

  // Fetch memories
  const fetchMemories = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeScope !== 'all') params.set('scope', activeScope);
      if (projectId) params.set('projectId', projectId);
      if (sessionId) params.set('sessionId', sessionId);
      if (searchQuery) params.set('search', searchQuery);

      const data = await memoryApi.list(params);
      setMemories(data.memories);
    } catch (err) {
      console.error('Error fetching memories:', err.getUserMessage?.() || err.message);
    }
  }, [activeScope, projectId, sessionId, searchQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await memoryApi.getStats(projectId);
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err.getUserMessage?.() || err.message);
    }
  }, [projectId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchMemories(), fetchStats()]);
      setLoading(false);
    };
    load();
  }, [fetchMemories, fetchStats]);

  // Create memory
  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      await memoryApi.create({
        ...formData,
        projectId: formData.scope === 'GLOBAL' ? null : projectId,
        sessionId: formData.scope === 'SESSION' ? sessionId : null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
      });

      setIsCreating(false);
      setFormData({ title: '', content: '', type: 'CONTEXT', scope: 'PROJECT', importance: 5, tags: '', category: '' });
      fetchMemories();
      fetchStats();
    } catch (err) {
      setError(err.getUserMessage?.() || 'Failed to create memory');
    }
  };

  // Update memory
  const handleUpdate = async () => {
    if (!selectedMemory) return;

    try {
      await memoryApi.update(selectedMemory.id, {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
      });

      setSelectedMemory(null);
      fetchMemories();
    } catch (err) {
      console.error('Error updating memory:', err.getUserMessage?.() || err.message);
    }
  };

  // Delete memory
  const handleDelete = async (id) => {
    if (!confirm('Delete this memory?')) return;

    try {
      await memoryApi.delete(id);
      fetchMemories();
      fetchStats();
      if (selectedMemory?.id === id) setSelectedMemory(null);
    } catch (err) {
      console.error('Error deleting memory:', err.getUserMessage?.() || err.message);
    }
  };

  // Toggle pin
  const handleTogglePin = async (memory) => {
    try {
      await memoryApi.update(memory.id, { pinned: !memory.pinned });
      fetchMemories();
    } catch (err) {
      console.error('Error toggling pin:', err.getUserMessage?.() || err.message);
    }
  };

  // Select memory for editing
  const handleSelectMemory = (memory) => {
    setSelectedMemory(memory);
    setFormData({
      title: memory.title,
      content: memory.content,
      type: memory.type,
      scope: memory.scope,
      importance: memory.importance,
      tags: memory.tags?.join(', ') || '',
      category: memory.category || ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 flex items-center gap-2">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading memories...
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
            <h2 className="text-lg font-medium text-gray-200">Memory Banks</h2>
            <p className="text-sm text-gray-400">
              {stats?.total || 0} memories | {stats?.pinned || 0} pinned
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Memory
            </button>
            {onClose && (
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Scope tabs */}
        <div className="flex gap-2">
          {['all', 'SESSION', 'PROJECT', 'GLOBAL'].map(scope => (
            <button
              key={scope}
              onClick={() => setActiveScope(scope)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeScope === scope
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {scope === 'all' ? 'All' : scope}
              {stats?.byScope?.[scope] && ` (${stats.byScope[scope]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Memory list */}
      <div className="flex-1 overflow-auto p-4">
        {memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No memories yet</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
            >
              Create your first memory
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {memories.map(memory => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onSelect={() => handleSelectMemory(memory)}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || selectedMemory) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-200">
                {selectedMemory ? 'Edit Memory' : 'Create Memory'}
              </h3>
              <button
                onClick={() => { setIsCreating(false); setSelectedMemory(null); }}
                className="p-2 text-gray-400 hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={selectedMemory ? (e) => { e.preventDefault(); handleUpdate(); } : handleCreate}>
              <div className="p-4 space-y-4 max-h-[60vh] overflow-auto">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(f => ({ ...f, type: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                    >
                      {Object.keys(MEMORY_TYPES).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Scope</label>
                    <select
                      value={formData.scope}
                      onChange={(e) => setFormData(f => ({ ...f, scope: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                      disabled={selectedMemory}
                    >
                      <option value="SESSION">Session (temporary)</option>
                      <option value="PROJECT">Project (persistent)</option>
                      <option value="GLOBAL">Global (cross-project)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Importance: {formData.importance}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.importance}
                    onChange={(e) => setFormData(f => ({ ...f, importance: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData(f => ({ ...f, tags: e.target.value }))}
                    placeholder="api, backend, important"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-gray-700 flex items-center justify-between">
                {selectedMemory && (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedMemory.id)}
                    className="px-4 py-2 text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => { setIsCreating(false); setSelectedMemory(null); }}
                    className="px-4 py-2 text-gray-400 hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                  >
                    {selectedMemory ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
