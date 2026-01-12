import { useState } from 'react';

const API_BASE = '';

export default function CreateProjectModal({ onClose, onCreated }) {
  const [projectName, setProjectName] = useState('');
  const [initGit, setInitGit] = useState(true);
  const [skipPermissions, setSkipPermissions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    // Validate project name
    const validNameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validNameRegex.test(projectName)) {
      setError('Use only letters, numbers, hyphens, and underscores');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName.trim(),
          template: initGit ? 'git' : 'empty',
          skipPermissions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      // Call the onCreated callback with the new project
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative glass-elevated rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2 className="text-lg font-semibold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            Create New Project
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Project Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="my-awesome-project"
              className="input-glass w-full px-4 py-3 text-base"
              autoFocus
            />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Will be created in ~/Projects/{projectName || 'project-name'}
            </p>
          </div>

          {/* Git initialization toggle */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={initGit}
                  onChange={(e) => setInitGit(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className="w-10 h-6 rounded-full transition-colors"
                  style={{
                    background: initGit ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div
                    className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
                    style={{
                      transform: initGit ? 'translateX(16px)' : 'translateX(0)',
                    }}
                  />
                </div>
              </div>
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Initialize Git repository
                </span>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Run git init in the new project directory
                </p>
              </div>
            </label>
          </div>

          {/* Skip permissions toggle */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={skipPermissions}
                  onChange={(e) => setSkipPermissions(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className="w-10 h-6 rounded-full transition-colors"
                  style={{
                    background: skipPermissions ? 'var(--status-warning)' : 'var(--bg-tertiary)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div
                    className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
                    style={{
                      transform: skipPermissions ? 'translateX(16px)' : 'translateX(0)',
                    }}
                  />
                </div>
              </div>
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Skip permission prompts
                </span>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Start Claude with --dangerously-skip-permissions (use with caution)
                </p>
              </div>
            </label>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--status-error)',
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !projectName.trim()}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: 'white',
              }}
            >
              {isCreating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
