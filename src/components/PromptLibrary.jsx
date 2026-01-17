/**
 * Prompt Library Component
 * Manage and use reusable prompts with variable interpolation
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect } from 'react';
import {
  extractVariables,
  PromptEditor,
  VariableInput,
  PromptCard,
} from './prompt-library';
import { promptsApi } from '../services/api.js';

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
      const data = await promptsApi.list({
        category: selectedCategory,
        favorite: showFavorites,
        search: searchQuery
      });
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
      const data = await promptsApi.getCategories();
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
      await promptsApi.create(formData);
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
      await promptsApi.update(editingPrompt.id, formData);
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
      await promptsApi.delete(id);
      fetchPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (prompt) => {
    try {
      await promptsApi.toggleFavorite(prompt.id, !prompt.isFavorite);
      fetchPrompts();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Execute prompt with variables
  const handleExecute = async (prompt) => {
    try {
      const data = await promptsApi.execute(prompt.id, executeVariables);
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

  if (!isOpen) return null;

  const isEditing = editingPrompt || isCreating;

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
                <PromptEditor
                  formData={formData}
                  setFormData={setFormData}
                  editingPrompt={editingPrompt}
                  onSave={editingPrompt ? handleUpdate : handleCreate}
                  onCancel={() => { setEditingPrompt(null); setIsCreating(false); }}
                />
              ) : executingPrompt ? (
                <VariableInput
                  prompt={executingPrompt}
                  variables={executeVariables}
                  setVariables={setExecuteVariables}
                  onExecute={() => handleExecute(executingPrompt)}
                  onCancel={() => setExecutingPrompt(null)}
                />
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
                    <PromptCard
                      key={prompt.id}
                      prompt={prompt}
                      onUse={setExecutingPrompt}
                      onToggleFavorite={handleToggleFavorite}
                      onEdit={startEdit}
                      onDelete={handleDelete}
                    />
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
