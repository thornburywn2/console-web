/**
 * Variable Input for Prompt Execution
 */

import { extractVariables } from './constants';

export function VariableInput({ prompt, variables, setVariables, onExecute, onCancel }) {
  const promptVariables = extractVariables(prompt.content);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onCancel} className="p-1 hover:bg-white/10 rounded">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-medium text-primary">{prompt.name}</h3>
      </div>

      {promptVariables.length > 0 ? (
        <>
          <p className="text-sm text-secondary">Fill in the variables:</p>
          {promptVariables.map(varName => (
            <div key={varName}>
              <label className="block text-xs font-medium text-secondary mb-1">{varName}</label>
              <input
                type="text"
                value={variables[varName] || ''}
                onChange={(e) => setVariables({ ...variables, [varName]: e.target.value })}
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
          onClick={onCancel}
          className="px-4 py-2 text-sm text-secondary hover:text-primary"
        >
          Cancel
        </button>
        <button
          onClick={onExecute}
          className="px-4 py-2 bg-accent/20 text-accent rounded-lg text-sm hover:bg-accent/30"
        >
          Use Prompt
        </button>
      </div>
    </div>
  );
}
