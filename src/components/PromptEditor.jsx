/**
 * Prompt Editor Component
 * Create and edit prompts with variable support and preview
 */

import { useState, useEffect, useMemo, useRef } from 'react';

// Variable extraction regex
const VARIABLE_REGEX = /\{\{(\w+)(?:\|([^}]*))?\}\}/g;

// Built-in categories
const CATEGORIES = [
  'general',
  'coding',
  'writing',
  'debugging',
  'review',
  'analysis',
  'documentation',
  'testing',
  'custom',
];

export default function PromptEditor({
  prompt = null,
  onSave,
  onCancel,
  onDelete,
}) {
  const [name, setName] = useState(prompt?.name || '');
  const [content, setContent] = useState(prompt?.content || '');
  const [description, setDescription] = useState(prompt?.description || '');
  const [category, setCategory] = useState(prompt?.category || 'general');
  const [customCategory, setCustomCategory] = useState('');
  const [isFavorite, setIsFavorite] = useState(prompt?.isFavorite || false);
  const [variableValues, setVariableValues] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const textareaRef = useRef(null);

  // Extract variables from content
  const variables = useMemo(() => {
    const vars = [];
    let match;
    const regex = new RegExp(VARIABLE_REGEX);
    while ((match = regex.exec(content)) !== null) {
      const [, name, defaultValue] = match;
      if (!vars.find(v => v.name === name)) {
        vars.push({ name, defaultValue: defaultValue || '' });
      }
    }
    return vars;
  }, [content]);

  // Initialize variable values
  useEffect(() => {
    const newValues = {};
    variables.forEach(v => {
      if (!(v.name in variableValues)) {
        newValues[v.name] = v.defaultValue || '';
      }
    });
    if (Object.keys(newValues).length > 0) {
      setVariableValues(prev => ({ ...prev, ...newValues }));
    }
  }, [variables]);

  // Generate preview with variables replaced
  const previewContent = useMemo(() => {
    let result = content;
    variables.forEach(v => {
      const value = variableValues[v.name] || v.defaultValue || `[${v.name}]`;
      result = result.replace(new RegExp(`\\{\\{${v.name}(?:\\|[^}]*)?\\}\\}`, 'g'), value);
    });
    return result;
  }, [content, variables, variableValues]);

  // Validate form
  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!content.trim()) newErrors.content = 'Content is required';
    if (category === 'custom' && !customCategory.trim()) {
      newErrors.category = 'Custom category name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const promptData = {
        name: name.trim(),
        content: content.trim(),
        description: description.trim() || null,
        category: category === 'custom' ? customCategory.trim() : category,
        isFavorite,
        variables: variables.length > 0 ? variables : null,
      };

      await onSave?.(promptData);
    } catch (error) {
      console.error('Failed to save prompt:', error);
      setErrors({ submit: 'Failed to save prompt' });
    } finally {
      setSaving(false);
    }
  };

  // Insert variable at cursor
  const insertVariable = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const variable = '{{variable_name}}';

    const newContent = content.substring(0, start) + variable + content.substring(end);
    setContent(newContent);

    // Set cursor position after insert
    setTimeout(() => {
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = start + 15;
      textarea.focus();
    }, 0);
  };

  const isEditing = !!prompt?.id;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="text-lg font-semibold text-primary">
          {isEditing ? 'Edit Prompt' : 'New Prompt'}
        </h3>
        <div className="flex items-center gap-2">
          {isEditing && onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-secondary hover:bg-white/5 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error Banner */}
        {errors.submit && (
          <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Name & Favorite */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-secondary mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Prompt"
              className={`w-full px-3 py-2 rounded-lg text-sm ${errors.name ? 'border-red-500' : ''}`}
              style={{
                background: 'var(--bg-tertiary)',
                border: `1px solid ${errors.name ? 'var(--status-error)' : 'var(--border-subtle)'}`,
                color: 'var(--text-primary)',
              }}
            />
            {errors.name && <p className="text-2xs text-red-400 mt-1">{errors.name}</p>}
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-2 rounded-lg transition-colors ${
                isFavorite ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-muted hover:text-amber-400'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of what this prompt does"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Category */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-secondary mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          {category === 'custom' && (
            <div className="flex-1">
              <label className="block text-xs font-medium text-secondary mb-1">
                Custom Category <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="my-category"
                className={`w-full px-3 py-2 rounded-lg text-sm ${errors.category ? 'border-red-500' : ''}`}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: `1px solid ${errors.category ? 'var(--status-error)' : 'var(--border-subtle)'}`,
                  color: 'var(--text-primary)',
                }}
              />
              {errors.category && <p className="text-2xs text-red-400 mt-1">{errors.category}</p>}
            </div>
          )}
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-secondary">
              Prompt Content <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={insertVariable}
                className="text-2xs text-accent hover:underline"
              >
                + Insert Variable
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`text-2xs ${showPreview ? 'text-accent' : 'text-muted hover:text-primary'}`}
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your prompt here. Use {{variable_name}} or {{variable_name|default_value}} for variables."
            rows={8}
            className={`w-full px-3 py-2 rounded-lg text-sm font-mono resize-y ${errors.content ? 'border-red-500' : ''}`}
            style={{
              background: 'var(--bg-tertiary)',
              border: `1px solid ${errors.content ? 'var(--status-error)' : 'var(--border-subtle)'}`,
              color: 'var(--text-primary)',
            }}
          />
          {errors.content && <p className="text-2xs text-red-400 mt-1">{errors.content}</p>}
          <p className="text-2xs text-muted mt-1">
            Tip: Use {"{{variable}}"} for variables or {"{{variable|default}}"} to set a default value.
          </p>
        </div>

        {/* Variables */}
        {variables.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-secondary mb-2">
              Variables ({variables.length})
            </label>
            <div className="grid grid-cols-2 gap-2">
              {variables.map(v => (
                <div key={v.name} className="flex items-center gap-2">
                  <span className="text-xs text-muted font-mono">{v.name}:</span>
                  <input
                    type="text"
                    value={variableValues[v.name] || ''}
                    onChange={(e) => setVariableValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                    placeholder={v.defaultValue || 'value'}
                    className="flex-1 px-2 py-1 rounded text-xs"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {showPreview && (
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              Preview
            </label>
            <div
              className="p-3 rounded-lg text-sm whitespace-pre-wrap font-mono"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {previewContent || <span className="text-muted italic">Enter content to see preview</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
