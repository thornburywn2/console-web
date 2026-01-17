/**
 * ContextPanel Component
 * Right sidebar panel for managing project context
 * Displays files, snippets, and context items for the current session
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { projectContextsApi } from '../services/api.js';

export default function ContextPanel({
  projectPath,
  projectName,
  className = ''
}) {
  const [contexts, setContexts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    files: true,
    snippets: false,
    notes: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [addingContext, setAddingContext] = useState(false);
  const [newContextType, setNewContextType] = useState('file');
  const [newContextValue, setNewContextValue] = useState('');

  const fetchContexts = useCallback(async () => {
    if (!projectPath) return;

    setLoading(true);
    setError(null);

    try {
      const data = await projectContextsApi.list(projectName);
      setContexts(data);
    } catch (err) {
      // Silently fail - context API may not be fully implemented yet
      setContexts([]);
    } finally {
      setLoading(false);
    }
  }, [projectPath, projectName]);

  useEffect(() => {
    fetchContexts();
  }, [fetchContexts]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const addContext = async () => {
    if (!newContextValue.trim()) return;

    try {
      const newContext = await projectContextsApi.create(projectName, {
        type: newContextType,
        value: newContextValue.trim(),
        label: newContextValue.split('/').pop() || newContextValue.trim()
      });
      setContexts(prev => [...prev, newContext]);
      setNewContextValue('');
      setAddingContext(false);
    } catch (err) {
      console.error('Failed to add context:', err.getUserMessage?.() || err.message);
    }
  };

  const removeContext = async (contextId) => {
    try {
      await projectContextsApi.delete(projectName, contextId);
      setContexts(prev => prev.filter(c => c.id !== contextId));
    } catch (err) {
      console.error('Failed to remove context:', err.getUserMessage?.() || err.message);
    }
  };

  // Group contexts by type
  const groupedContexts = contexts.reduce((acc, context) => {
    const type = context.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(context);
    return acc;
  }, {});

  // Filter contexts by search
  const filteredContexts = searchQuery
    ? contexts.filter(c =>
        c.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.value?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const ContextItem = ({ context, onRemove }) => (
    <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded group hover:bg-gray-800 transition-colors">
      {/* Type icon */}
      <div className="text-gray-500">
        {context.type === 'file' && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        {context.type === 'snippet' && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        )}
        {context.type === 'note' && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )}
        {context.type === 'url' && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )}
      </div>

      {/* Label */}
      <span className="flex-1 text-sm text-gray-300 truncate" title={context.value}>
        {context.label || context.value}
      </span>

      {/* Remove button */}
      <button
        onClick={() => onRemove(context.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
        title="Remove from context"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  const Section = ({ title, icon, type, items }) => (
    <div className="border-b border-gray-700/50 last:border-b-0">
      <button
        onClick={() => toggleSection(type)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-800/50 transition-colors"
      >
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            expandedSections[type] ? 'rotate-90' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-400">{icon}</span>
        <span className="text-sm font-medium text-gray-300">{title}</span>
        <span className="ml-auto text-xs text-gray-500">{items?.length || 0}</span>
      </button>

      {expandedSections[type] && items?.length > 0 && (
        <div className="px-3 pb-3 space-y-1">
          {items.map(item => (
            <ContextItem key={item.id} context={item} onRemove={removeContext} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-200">Context</h3>
          <button
            onClick={() => setAddingContext(!addingContext)}
            className={`p-1.5 rounded transition-colors ${
              addingContext
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
            title="Add context item"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search context..."
            className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Add context form */}
      {addingContext && (
        <div className="p-3 bg-gray-800/50 border-b border-gray-700 space-y-2">
          <select
            value={newContextType}
            onChange={(e) => setNewContextType(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="file">File Path</option>
            <option value="snippet">Code Snippet</option>
            <option value="note">Note</option>
            <option value="url">URL</option>
          </select>
          <textarea
            value={newContextValue}
            onChange={(e) => setNewContextValue(e.target.value)}
            placeholder={
              newContextType === 'file' ? '/path/to/file.js' :
              newContextType === 'snippet' ? 'Paste code here...' :
              newContextType === 'url' ? 'https://...' :
              'Enter note...'
            }
            rows={newContextType === 'snippet' ? 4 : 2}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setAddingContext(false)}
              className="flex-1 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addContext}
              disabled={!newContextValue.trim()}
              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-700/50 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredContexts ? (
          /* Search results */
          <div className="p-3 space-y-1">
            {filteredContexts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No matching items</p>
            ) : (
              filteredContexts.map(context => (
                <ContextItem key={context.id} context={context} onRemove={removeContext} />
              ))
            )}
          </div>
        ) : contexts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <svg className="w-12 h-12 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm text-gray-400">No context items</p>
            <p className="text-xs text-gray-500 mt-1">Add files, snippets, or notes</p>
          </div>
        ) : (
          /* Grouped sections */
          <>
            {groupedContexts.file?.length > 0 && (
              <Section
                title="Files"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
                type="files"
                items={groupedContexts.file}
              />
            )}
            {groupedContexts.snippet?.length > 0 && (
              <Section
                title="Snippets"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                }
                type="snippets"
                items={groupedContexts.snippet}
              />
            )}
            {groupedContexts.note?.length > 0 && (
              <Section
                title="Notes"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                }
                type="notes"
                items={groupedContexts.note}
              />
            )}
            {groupedContexts.url?.length > 0 && (
              <Section
                title="URLs"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                  </svg>
                }
                type="urls"
                items={groupedContexts.url}
              />
            )}
          </>
        )}
      </div>

      {/* Footer with summary */}
      {contexts.length > 0 && (
        <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
          {contexts.length} item{contexts.length !== 1 ? 's' : ''} in context
        </div>
      )}
    </div>
  );
}
