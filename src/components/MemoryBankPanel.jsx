/**
 * MemoryBankPanel Component
 * Manages layered context persistence (Session, Project, Global)
 */

import { useState, useEffect, useCallback } from 'react';

// Memory type icons and colors
const MEMORY_TYPES = {
  FACT: { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'blue' },
  INSTRUCTION: { icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'yellow' },
  CONTEXT: { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', color: 'green' },
  DECISION: { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'purple' },
  LEARNING: { icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', color: 'cyan' },
  TODO: { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'orange' },
  WARNING: { icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'red' }
};

const SCOPE_COLORS = {
  SESSION: 'text-blue-400 bg-blue-500/20',
  PROJECT: 'text-green-400 bg-green-500/20',
  GLOBAL: 'text-purple-400 bg-purple-500/20'
};

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

      const response = await fetch(`/api/memory?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMemories(data.memories);
      }
    } catch (err) {
      console.error('Error fetching memories:', err);
    }
  }, [activeScope, projectId, sessionId, searchQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const params = projectId ? `?projectId=${projectId}` : '';
      const response = await fetch(`/api/memory/stats/overview${params}`);
      if (response.ok) {
        setStats(await response.json());
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
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
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId: formData.scope === 'GLOBAL' ? null : projectId,
          sessionId: formData.scope === 'SESSION' ? sessionId : null,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
        })
      });

      if (response.ok) {
        setIsCreating(false);
        setFormData({ title: '', content: '', type: 'CONTEXT', scope: 'PROJECT', importance: 5, tags: '', category: '' });
        fetchMemories();
        fetchStats();
      } else {
        const data = await response.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create memory');
    }
  };

  // Update memory
  const handleUpdate = async () => {
    if (!selectedMemory) return;

    try {
      const response = await fetch(`/api/memory/${selectedMemory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
        })
      });

      if (response.ok) {
        setSelectedMemory(null);
        fetchMemories();
      }
    } catch (err) {
      console.error('Error updating memory:', err);
    }
  };

  // Delete memory
  const handleDelete = async (id) => {
    if (!confirm('Delete this memory?')) return;

    try {
      const response = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchMemories();
        fetchStats();
        if (selectedMemory?.id === id) setSelectedMemory(null);
      }
    } catch (err) {
      console.error('Error deleting memory:', err);
    }
  };

  // Toggle pin
  const handleTogglePin = async (memory) => {
    try {
      await fetch(`/api/memory/${memory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !memory.pinned })
      });
      fetchMemories();
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  // Memory card component
  const MemoryCard = ({ memory }) => {
    const typeConfig = MEMORY_TYPES[memory.type] || MEMORY_TYPES.CONTEXT;

    return (
      <div
        className={`p-3 bg-gray-800 border rounded-lg hover:border-blue-500/50 transition-all cursor-pointer ${
          memory.pinned ? 'border-yellow-500/50' : 'border-gray-700'
        }`}
        onClick={() => {
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
        }}
      >
        <div className="flex items-start gap-3">
          <div className={`p-1.5 rounded bg-${typeConfig.color}-500/20 text-${typeConfig.color}-400`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeConfig.icon} />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-gray-200 truncate">{memory.title}</h4>
              {memory.pinned && (
                <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
            </div>

            <p className="text-xs text-gray-400 line-clamp-2 mb-2">{memory.content}</p>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-2xs px-1.5 py-0.5 rounded ${SCOPE_COLORS[memory.scope]}`}>
                {memory.scope}
              </span>
              <span className="text-2xs text-gray-500">
                Importance: {memory.importance}/10
              </span>
              {memory.tags?.slice(0, 2).map(tag => (
                <span key={tag} className="text-2xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePin(memory);
            }}
            className="p-1 text-gray-500 hover:text-yellow-400 transition-colors"
          >
            <svg className="w-4 h-4" fill={memory.pinned ? 'currentColor' : 'none'} viewBox="0 0 20 20" stroke="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        </div>
      </div>
    );
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
              <MemoryCard key={memory.id} memory={memory} />
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
