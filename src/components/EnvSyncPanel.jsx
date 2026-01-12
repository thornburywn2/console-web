/**
 * Environment Sync Panel Component
 * Manage and sync .env files across environments
 */

import { useState, useEffect, useCallback } from 'react';

const ENV_FILE_TYPES = [
  { name: '.env', description: 'Default environment', color: '#3498db' },
  { name: '.env.local', description: 'Local overrides', color: '#2ecc71' },
  { name: '.env.development', description: 'Development settings', color: '#f39c12' },
  { name: '.env.production', description: 'Production settings', color: '#e74c3c' },
  { name: '.env.test', description: 'Test settings', color: '#9b59b6' },
  { name: '.env.example', description: 'Template file', color: '#95a5a6' },
];

function EnvFileCard({ file, isSelected, onClick }) {
  const fileType = ENV_FILE_TYPES.find(t => t.name === file.name) || {
    name: file.name,
    description: 'Custom environment',
    color: '#95a5a6'
  };

  return (
    <div
      className={`p-3 rounded-lg cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-accent' : ''
      }`}
      style={{
        background: 'var(--bg-glass)',
        border: `1px solid ${isSelected ? 'var(--border-accent)' : 'var(--border-subtle)'}`
      }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: fileType.color }}
        />
        <span className="font-mono text-sm text-primary">{file.name}</span>
        {file.modified && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
            Modified
          </span>
        )}
      </div>
      <div className="text-xs text-muted mt-1">{fileType.description}</div>
      <div className="text-xs text-muted mt-1">
        {file.variableCount} variables • {file.size}
      </div>
    </div>
  );
}

function VariableRow({ variable, onEdit, onDelete, showSecret, onToggleSecret }) {
  const isSecret = variable.key.toLowerCase().includes('secret') ||
                   variable.key.toLowerCase().includes('password') ||
                   variable.key.toLowerCase().includes('key') ||
                   variable.key.toLowerCase().includes('token');

  return (
    <div
      className="flex items-center gap-3 p-2 rounded hover:bg-white/5 group"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-primary">{variable.key}</span>
          {isSecret && (
            <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </div>
        <div className="font-mono text-xs text-muted mt-0.5 truncate">
          {isSecret && !showSecret ? '••••••••' : variable.value}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isSecret && (
          <button
            onClick={onToggleSecret}
            className="p-1 hover:bg-white/10 rounded"
            title={showSecret ? 'Hide value' : 'Show value'}
          >
            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showSecret ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              )}
            </svg>
          </button>
        )}
        <button
          onClick={() => onEdit(variable)}
          className="p-1 hover:bg-white/10 rounded"
        >
          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(variable.key)}
          className="p-1 hover:bg-red-500/20 rounded"
        >
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function DiffView({ source, target, differences }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="font-mono">{source}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <span className="font-mono">{target}</span>
      </div>
      {differences.added?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-green-400 font-medium">+ Added ({differences.added.length})</div>
          {differences.added.map(key => (
            <div key={key} className="text-xs font-mono pl-3 text-green-400/80">{key}</div>
          ))}
        </div>
      )}
      {differences.removed?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-red-400 font-medium">- Removed ({differences.removed.length})</div>
          {differences.removed.map(key => (
            <div key={key} className="text-xs font-mono pl-3 text-red-400/80">{key}</div>
          ))}
        </div>
      )}
      {differences.changed?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-yellow-400 font-medium">~ Changed ({differences.changed.length})</div>
          {differences.changed.map(key => (
            <div key={key} className="text-xs font-mono pl-3 text-yellow-400/80">{key}</div>
          ))}
        </div>
      )}
      {!differences.added?.length && !differences.removed?.length && !differences.changed?.length && (
        <div className="text-xs text-green-400">Files are in sync</div>
      )}
    </div>
  );
}

export default function EnvSyncPanel({ projectPath, isOpen, onClose }) {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSecrets, setShowSecrets] = useState({});
  const [editingVar, setEditingVar] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareTarget, setCompareTarget] = useState(null);
  const [differences, setDifferences] = useState(null);
  const [newVar, setNewVar] = useState({ key: '', value: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchEnvFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/env/files/${encodeURIComponent(projectPath || '')}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        if (data.files?.length > 0) {
          setSelectedFile(data.files[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch env files:', error);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  const fetchVariables = useCallback(async () => {
    if (!selectedFile) return;
    try {
      const response = await fetch(
        `/api/env/variables/${encodeURIComponent(projectPath || '')}/${encodeURIComponent(selectedFile.name)}`
      );
      if (response.ok) {
        const data = await response.json();
        setVariables(data.variables || []);
      }
    } catch (error) {
      console.error('Failed to fetch variables:', error);
    }
  }, [projectPath, selectedFile]);

  useEffect(() => {
    if (isOpen) {
      fetchEnvFiles();
    }
  }, [isOpen, fetchEnvFiles]);

  useEffect(() => {
    if (selectedFile) {
      fetchVariables();
    }
  }, [selectedFile, fetchVariables]);

  const handleCompare = async () => {
    if (!selectedFile || !compareTarget) return;
    try {
      const response = await fetch(
        `/api/env/compare/${encodeURIComponent(projectPath || '')}?source=${encodeURIComponent(selectedFile.name)}&target=${encodeURIComponent(compareTarget)}`
      );
      if (response.ok) {
        const data = await response.json();
        setDifferences(data);
      }
    } catch (error) {
      console.error('Failed to compare files:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    try {
      await fetch(`/api/env/save/${encodeURIComponent(projectPath || '')}/${encodeURIComponent(selectedFile.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables })
      });
      fetchEnvFiles();
    } catch (error) {
      console.error('Failed to save env file:', error);
    }
  };

  const handleAddVariable = () => {
    if (!newVar.key.trim()) return;
    setVariables([...variables, { key: newVar.key, value: newVar.value }]);
    setNewVar({ key: '', value: '' });
    setShowAddForm(false);
  };

  const handleDeleteVariable = (key) => {
    if (!confirm(`Delete ${key}?`)) return;
    setVariables(variables.filter(v => v.key !== key));
  };

  const handleSync = async (direction) => {
    if (!selectedFile || !compareTarget) return;
    try {
      await fetch(`/api/env/sync/${encodeURIComponent(projectPath || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: direction === 'forward' ? selectedFile.name : compareTarget,
          target: direction === 'forward' ? compareTarget : selectedFile.name
        })
      });
      fetchEnvFiles();
      handleCompare();
    } catch (error) {
      console.error('Failed to sync files:', error);
    }
  };

  const handleGenerateExample = async () => {
    if (!selectedFile) return;
    try {
      await fetch(`/api/env/generate-example/${encodeURIComponent(projectPath || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: selectedFile.name })
      });
      fetchEnvFiles();
    } catch (error) {
      console.error('Failed to generate example:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Environment Manager</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* File Selector */}
          <div
            className="w-56 flex-shrink-0 p-4 overflow-auto"
            style={{ borderRight: '1px solid var(--border-subtle)' }}
          >
            <h4 className="text-sm font-medium text-primary mb-3">Environment Files</h4>
            {loading ? (
              <div className="text-center text-muted py-4">Loading...</div>
            ) : (
              <div className="space-y-2">
                {files.map(file => (
                  <EnvFileCard
                    key={file.name}
                    file={file}
                    isSelected={selectedFile?.name === file.name}
                    onClick={() => setSelectedFile(file)}
                  />
                ))}
                {files.length === 0 && (
                  <div className="text-center text-muted py-4 text-sm">No .env files found</div>
                )}
              </div>
            )}
          </div>

          {/* Variables Editor */}
          <div className="flex-1 overflow-auto p-4">
            {selectedFile ? (
              <>
                {/* Actions */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-accent/20 text-accent hover:bg-accent/30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Variable
                  </button>
                  <button
                    onClick={() => setCompareMode(!compareMode)}
                    className={`px-3 py-1.5 text-sm rounded ${
                      compareMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-muted hover:text-primary'
                    }`}
                  >
                    Compare
                  </button>
                  <button
                    onClick={handleGenerateExample}
                    className="px-3 py-1.5 text-sm rounded bg-white/5 text-muted hover:text-primary"
                  >
                    Generate .env.example
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={handleSave}
                    className="px-4 py-1.5 text-sm rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  >
                    Save Changes
                  </button>
                </div>

                {/* Compare Mode */}
                {compareMode && (
                  <div className="mb-4 p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm text-muted">Compare with:</span>
                      <select
                        value={compareTarget || ''}
                        onChange={(e) => setCompareTarget(e.target.value)}
                        className="px-2 py-1.5 text-sm rounded"
                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                      >
                        <option value="">Select file...</option>
                        {files.filter(f => f.name !== selectedFile.name).map(f => (
                          <option key={f.name} value={f.name}>{f.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleCompare}
                        disabled={!compareTarget}
                        className="px-3 py-1.5 text-sm rounded bg-accent text-white hover:bg-accent/80 disabled:opacity-50"
                      >
                        Compare
                      </button>
                      {differences && (
                        <>
                          <button
                            onClick={() => handleSync('forward')}
                            className="px-3 py-1.5 text-sm rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                          >
                            Sync →
                          </button>
                          <button
                            onClick={() => handleSync('backward')}
                            className="px-3 py-1.5 text-sm rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                          >
                            ← Sync
                          </button>
                        </>
                      )}
                    </div>
                    {differences && (
                      <DiffView
                        source={selectedFile.name}
                        target={compareTarget}
                        differences={differences}
                      />
                    )}
                  </div>
                )}

                {/* Add Variable Form */}
                {showAddForm && (
                  <div className="mb-4 p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-muted mb-1">Key</label>
                        <input
                          type="text"
                          value={newVar.key}
                          onChange={(e) => setNewVar({ ...newVar, key: e.target.value.toUpperCase() })}
                          placeholder="VARIABLE_NAME"
                          className="w-full px-3 py-1.5 text-sm rounded font-mono"
                          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-muted mb-1">Value</label>
                        <input
                          type="text"
                          value={newVar.value}
                          onChange={(e) => setNewVar({ ...newVar, value: e.target.value })}
                          placeholder="value"
                          className="w-full px-3 py-1.5 text-sm rounded font-mono"
                          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                        />
                      </div>
                      <button
                        onClick={handleAddVariable}
                        className="px-4 py-1.5 text-sm rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-1.5 text-sm rounded bg-white/5 text-muted hover:text-primary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Variables List */}
                <div className="space-y-0">
                  {variables.map(variable => (
                    <VariableRow
                      key={variable.key}
                      variable={variable}
                      showSecret={showSecrets[variable.key]}
                      onToggleSecret={() => setShowSecrets({
                        ...showSecrets,
                        [variable.key]: !showSecrets[variable.key]
                      })}
                      onEdit={setEditingVar}
                      onDelete={handleDeleteVariable}
                    />
                  ))}
                  {variables.length === 0 && (
                    <div className="text-center text-muted py-8">
                      No variables in this file
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center text-muted py-8">
                Select an environment file to view variables
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs text-muted"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <span>{projectPath || 'No project selected'}</span>
          {selectedFile && (
            <span>{variables.length} variables</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function EnvStatusBadge({ hasEnvExample, hasEnv, inSync }) {
  if (!hasEnvExample && !hasEnv) {
    return (
      <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">
        No .env files
      </span>
    );
  }

  if (!hasEnv && hasEnvExample) {
    return (
      <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
        .env missing
      </span>
    );
  }

  if (inSync === false) {
    return (
      <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
        Out of sync
      </span>
    );
  }

  return (
    <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
      Configured
    </span>
  );
}
