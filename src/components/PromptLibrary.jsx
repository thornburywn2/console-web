/**
 * Prompt Library Component
 * Manage and use reusable prompts with variable interpolation
 */

import { useState, useEffect, useMemo } from 'react';

const API_BASE = '/api/prompts';

export default function PromptLibrary({
  isOpen,
  onClose,
  onSelectPrompt,
  onExecutePrompt,
}) {
  const [prompts, setPrompts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [executeVariables, setExecuteVariables] = useState({});
  const [executingPrompt, setExecutingPrompt] = useState(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    description: '',
    category: '',
    variables: [],
    isFavorite: false
  });

  // Fetch prompts
  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (showFavorites) params.set('favorite', 'true');
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`${API_BASE}?${params}`);
      const data = await res.json();
      setPrompts(data.prompts || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      const data = await res.json();
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPrompts();
      fetchCategories();
    }
  }, [isOpen, selectedCategory, showFavorites, searchQuery]);

  // Create prompt
  const handleCreate = async () => {
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to create prompt');
      setIsCreating(false);
      setFormData({ name: '', content: '', description: '', category: '', variables: [], isFavorite: false });
      fetchPrompts();
      fetchCategories();
    } catch (error) {
      console.error('Error creating prompt:', error);
    }
  };

  // Update prompt
  const handleUpdate = async () => {
    try {
      const res = await fetch(`${API_BASE}/${editingPrompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to update prompt');
      setEditingPrompt(null);
      setFormData({ name: '', content: '', description: '', category: '', variables: [], isFavorite: false });
      fetchPrompts();
    } catch (error) {
      console.error('Error updating prompt:', error);
    }
  };

  // Delete prompt
  const handleDelete = async (id) => {
    if (!confirm('Delete this prompt?')) return;
    try {
      await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      fetchPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (prompt) => {
    try {
      await fetch(`${API_BASE}/${prompt.id}/favorite`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !prompt.isFavorite })
      });
      fetchPrompts();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Execute prompt with variables
  const handleExecute = async (prompt) => {
    try {
      const res = await fetch(`${API_BASE}/${prompt.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: executeVariables })
      });
      const data = await res.json();
      onExecutePrompt?.(data.interpolated, prompt);
      setExecutingPrompt(null);
      setExecuteVariables({});
      onClose();
    } catch (error) {
      console.error('Error executing prompt:', error);
    }
  };

  // Start editing
  const startEdit = (prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      content: prompt.content,
      description: prompt.description || '',
      category: prompt.category || '',
      variables: prompt.variables || [],
      isFavorite: prompt.isFavorite
    });
  };

  // Extract variables from content
  const extractVariables = (content) => {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.slice(2, -2)))];
  };

  if (!isOpen) return null;

  const isEditing = editingPrompt || isCreating;
  const contentVariables = extractVariables(formData.content);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
            <span>📚</span>
            Prompt Library
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Categories */}
          <div className="w-48 flex-shrink-0 p-3 overflow-y-auto" style={{ borderRight: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => { setSelectedCategory(null); setShowFavorites(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 ${
                !selectedCategory && !showFavorites ? 'bg-accent/20 text-accent' : 'text-secondary hover:bg-white/5'
              }`}
            >
              All Prompts
            </button>
            <button
              onClick={() => { setSelectedCategory(null); setShowFavorites(true); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-2 flex items-center gap-2 ${
                showFavorites ? 'bg-accent/20 text-accent' : 'text-secondary hover:bg-white/5'
              }`}
            >
              <span>⭐</span> Favorites
            </button>

            {categories.length > 0 && (
              <>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted px-3 py-1">Categories</div>
                {categories.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => { setSelectedCategory(cat.name); setShowFavorites(false); }}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center justify-between ${
                      selectedCategory === cat.name ? 'bg-accent/20 text-accent' : 'text-secondary hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className="text-xs text-muted">{cat.count}</span>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search & Actions */}
            <div className="p-3 flex gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prompts..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                />
              </div>
              <button
                onClick={() => { setIsCreating(true); setFormData({ name: '', content: '', description: '', category: '', variables: [], isFavorite: false }); }}
                className="px-4 py-2 bg-accent/20 text-accent rounded-lg text-sm hover:bg-accent/30"
              >
                + New Prompt
              </button>
            </div>

            {/* Prompts List or Editor */}
            <div className="flex-1 overflow-y-auto p-3">
              {isEditing ? (
                /* Editor Form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                      placeholder="Prompt name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Category</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                        placeholder="e.g., coding, writing"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Description</label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                        placeholder="Short description"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Content <span className="text-muted">(use {'{{variable}}'} for variables)</span>
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm font-mono min-h-[200px] resize-y"
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                      placeholder="Write your prompt here. Use {{variableName}} for dynamic content."
                    />
                    {contentVariables.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                        <span>Variables:</span>
                        {contentVariables.map(v => (
                          <span key={v} className="px-1.5 py-0.5 rounded bg-accent/20 text-accent">{v}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.isFavorite}
                        onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-secondary">Add to favorites</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingPrompt(null); setIsCreating(false); }}
                        className="px-4 py-2 text-sm text-secondary hover:text-primary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={editingPrompt ? handleUpdate : handleCreate}
                        disabled={!formData.name.trim() || !formData.content.trim()}
                        className="px-4 py-2 bg-accent/20 text-accent rounded-lg text-sm hover:bg-accent/30 disabled:opacity-50"
                      >
                        {editingPrompt ? 'Update' : 'Create'} Prompt
                      </button>
                    </div>
                  </div>
                </div>
              ) : executingPrompt ? (
                /* Variable Input for Execution */
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setExecutingPrompt(null)} className="p-1 hover:bg-white/10 rounded">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h3 className="font-medium text-primary">{executingPrompt.name}</h3>
                  </div>

                  {extractVariables(executingPrompt.content).length > 0 ? (
                    <>
                      <p className="text-sm text-secondary">Fill in the variables:</p>
                      {extractVariables(executingPrompt.content).map(varName => (
                        <div key={varName}>
                          <label className="block text-xs font-medium text-secondary mb-1">{varName}</label>
                          <input
                            type="text"
                            value={executeVariables[varName] || ''}
                            onChange={(e) => setExecuteVariables({ ...executeVariables, [varName]: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                            placeholder={`Enter ${varName}...`}
                          />
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-secondary">This prompt has no variables. Ready to use!</p>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      onClick={() => setExecutingPrompt(null)}
                      className="px-4 py-2 text-sm text-secondary hover:text-primary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleExecute(executingPrompt)}
                      className="px-4 py-2 bg-accent/20 text-accent rounded-lg text-sm hover:bg-accent/30"
                    >
                      Use Prompt
                    </button>
                  </div>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : prompts.length === 0 ? (
                <div className="text-center py-12 text-muted">
                  <p>No prompts found</p>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="mt-2 text-accent hover:underline text-sm"
                  >
                    Create your first prompt
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {prompts.map(prompt => (
                    <div
                      key={prompt.id}
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
                            onClick={() => setExecutingPrompt(prompt)}
                            className="px-2 py-1 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30"
                          >
                            Use
                          </button>
                          <button
                            onClick={() => handleToggleFavorite(prompt)}
                            className="p-1 hover:bg-white/10 rounded"
                            title={prompt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {prompt.isFavorite ? '⭐' : '☆'}
                          </button>
                          <button
                            onClick={() => startEdit(prompt)}
                            className="p-1 hover:bg-white/10 rounded text-xs"
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDelete(prompt.id)}
                            className="p-1 hover:bg-red-500/20 rounded text-xs text-red-400"
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
