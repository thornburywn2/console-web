/**
 * Prompt Editor Form Component
 */

import { extractVariables } from './constants';

export function PromptEditor({ formData, setFormData, editingPrompt, onSave, onCancel }) {
  const contentVariables = extractVariables(formData.content);

  return (
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
            onClick={onCancel}
            className="px-4 py-2 text-sm text-secondary hover:text-primary"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!formData.name.trim() || !formData.content.trim()}
            className="px-4 py-2 bg-accent/20 text-accent rounded-lg text-sm hover:bg-accent/30 disabled:opacity-50"
          >
            {editingPrompt ? 'Update' : 'Create'} Prompt
          </button>
        </div>
      </div>
    </div>
  );
}
