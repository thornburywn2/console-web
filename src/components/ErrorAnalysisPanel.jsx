/**
 * Error Analysis Panel Component
 * Detect errors in terminal output and provide AI-powered suggestions
 */

import { useState, useEffect, useMemo } from 'react';

// Error patterns with categories
const ERROR_PATTERNS = [
  // JavaScript/Node.js
  { pattern: /TypeError:\s*(.+)/i, type: 'TypeError', category: 'JavaScript' },
  { pattern: /ReferenceError:\s*(.+)/i, type: 'ReferenceError', category: 'JavaScript' },
  { pattern: /SyntaxError:\s*(.+)/i, type: 'SyntaxError', category: 'JavaScript' },
  { pattern: /Error:\s*Cannot find module\s*['"](.*)['"]/i, type: 'ModuleNotFound', category: 'Node.js' },
  { pattern: /ENOENT:\s*no such file or directory/i, type: 'FileNotFound', category: 'Node.js' },
  { pattern: /EADDRINUSE:\s*address already in use/i, type: 'PortInUse', category: 'Node.js' },
  { pattern: /npm ERR!\s*(.+)/i, type: 'NpmError', category: 'npm' },

  // Python
  { pattern: /ModuleNotFoundError:\s*No module named\s*['"](.*)['"]/i, type: 'PythonModuleNotFound', category: 'Python' },
  { pattern: /IndentationError:\s*(.+)/i, type: 'IndentationError', category: 'Python' },
  { pattern: /NameError:\s*name\s*['"](.*)['"]\s*is not defined/i, type: 'PythonNameError', category: 'Python' },

  // Git
  { pattern: /fatal:\s*(.+)/i, type: 'GitFatal', category: 'Git' },
  { pattern: /error:\s*failed to push some refs/i, type: 'GitPushFailed', category: 'Git' },
  { pattern: /CONFLICT \(content\):/i, type: 'GitConflict', category: 'Git' },

  // Docker
  { pattern: /Error response from daemon:\s*(.+)/i, type: 'DockerDaemon', category: 'Docker' },
  { pattern: /Cannot connect to the Docker daemon/i, type: 'DockerNotRunning', category: 'Docker' },

  // Database
  { pattern: /connection refused|ECONNREFUSED/i, type: 'ConnectionRefused', category: 'Database' },
  { pattern: /authentication failed/i, type: 'AuthFailed', category: 'Database' },

  // General
  { pattern: /permission denied/i, type: 'PermissionDenied', category: 'System' },
  { pattern: /command not found/i, type: 'CommandNotFound', category: 'Shell' },
  { pattern: /SIGKILL|SIGTERM|killed/i, type: 'ProcessKilled', category: 'System' },
  { pattern: /out of memory|ENOMEM/i, type: 'OutOfMemory', category: 'System' },
];

// Quick fix suggestions per error type
const QUICK_FIXES = {
  ModuleNotFound: [
    { label: 'Install package', command: 'npm install {module}' },
    { label: 'Check package.json', command: 'cat package.json | grep {module}' },
  ],
  FileNotFound: [
    { label: 'List directory', command: 'ls -la' },
    { label: 'Find file', command: 'find . -name "{filename}"' },
  ],
  PortInUse: [
    { label: 'Find process', command: 'lsof -i :{port}' },
    { label: 'Kill process', command: 'kill -9 $(lsof -t -i:{port})' },
  ],
  NpmError: [
    { label: 'Clear cache', command: 'npm cache clean --force' },
    { label: 'Remove node_modules', command: 'rm -rf node_modules && npm install' },
  ],
  GitPushFailed: [
    { label: 'Pull first', command: 'git pull --rebase origin main' },
    { label: 'Check remote', command: 'git remote -v' },
  ],
  GitConflict: [
    { label: 'View conflicts', command: 'git diff --name-only --diff-filter=U' },
    { label: 'Abort merge', command: 'git merge --abort' },
  ],
  DockerNotRunning: [
    { label: 'Start Docker', command: 'sudo systemctl start docker' },
    { label: 'Check status', command: 'sudo systemctl status docker' },
  ],
  ConnectionRefused: [
    { label: 'Check service', command: 'systemctl status postgresql' },
    { label: 'Test connection', command: 'nc -zv localhost 5432' },
  ],
  PermissionDenied: [
    { label: 'Use sudo', command: 'sudo {command}' },
    { label: 'Check permissions', command: 'ls -la {file}' },
  ],
  CommandNotFound: [
    { label: 'Search package', command: 'apt search {command}' },
    { label: 'Install package', command: 'sudo apt install {command}' },
  ],
  PythonModuleNotFound: [
    { label: 'Install with pip', command: 'pip install {module}' },
    { label: 'Check virtual env', command: 'which python && pip list' },
  ],
};

// Parse terminal output for errors
const parseErrors = (output) => {
  if (!output) return [];

  const lines = output.split('\n');
  const errors = [];

  lines.forEach((line, index) => {
    for (const errorPattern of ERROR_PATTERNS) {
      const match = line.match(errorPattern.pattern);
      if (match) {
        errors.push({
          id: `${index}-${errorPattern.type}`,
          line: index + 1,
          text: line.trim(),
          type: errorPattern.type,
          category: errorPattern.category,
          match: match[1] || match[0],
          timestamp: new Date().toISOString(),
        });
        break;
      }
    }
  });

  return errors;
};

export default function ErrorAnalysisPanel({
  terminalOutput,
  onExecuteCommand,
  onAskAI,
  isCollapsed = false,
}) {
  const [errors, setErrors] = useState([]);
  const [selectedError, setSelectedError] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(true);

  // Parse errors when output changes
  useEffect(() => {
    if (autoAnalyze && terminalOutput) {
      const detectedErrors = parseErrors(terminalOutput);
      setErrors(detectedErrors);
      if (detectedErrors.length > 0 && !selectedError) {
        setSelectedError(detectedErrors[0]);
      }
    }
  }, [terminalOutput, autoAnalyze]);

  // Group errors by category
  const errorsByCategory = useMemo(() => {
    const grouped = {};
    errors.forEach(error => {
      if (!grouped[error.category]) {
        grouped[error.category] = [];
      }
      grouped[error.category].push(error);
    });
    return grouped;
  }, [errors]);

  // Get quick fixes for selected error
  const quickFixes = useMemo(() => {
    if (!selectedError) return [];
    return QUICK_FIXES[selectedError.type] || [];
  }, [selectedError]);

  // Request AI analysis
  const requestAIAnalysis = async () => {
    if (!selectedError || isAnalyzing) return;

    setIsAnalyzing(true);
    setAiAnalysis(null);

    try {
      // Simulate AI analysis (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1500));

      setAiAnalysis({
        summary: `This ${selectedError.type} error typically occurs when...`,
        cause: 'The most likely cause is...',
        solution: 'To fix this, you should...',
        commands: [
          { label: 'Recommended fix', command: 'example command here' },
        ],
        relatedDocs: [
          { title: 'Error Documentation', url: '#' },
        ],
      });
    } catch (error) {
      console.error('AI analysis failed:', error);
      setAiAnalysis({ error: 'Failed to analyze error. Please try again.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Clear all errors
  const clearErrors = () => {
    setErrors([]);
    setSelectedError(null);
    setAiAnalysis(null);
  };

  if (isCollapsed) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className={`w-2 h-2 rounded-full ${errors.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
        <span className="text-xs text-secondary">
          {errors.length > 0 ? `${errors.length} error${errors.length !== 1 ? 's' : ''} detected` : 'No errors'}
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${errors.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
          <span className="font-medium text-primary text-sm">Error Analysis</span>
          {errors.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
              {errors.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={autoAnalyze}
              onChange={(e) => setAutoAnalyze(e.target.checked)}
              className="w-3 h-3 rounded"
            />
            Auto
          </label>
          {errors.length > 0 && (
            <button
              onClick={clearErrors}
              className="text-xs text-muted hover:text-primary transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {errors.length === 0 ? (
        <div className="p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-sm text-primary">No errors detected</div>
          <div className="text-xs text-muted mt-1">Terminal output is being monitored</div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* Error List */}
          <div className="flex-1 max-h-60 overflow-y-auto">
            {Object.entries(errorsByCategory).map(([category, categoryErrors]) => (
              <div key={category}>
                <div className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted sticky top-0" style={{ background: 'var(--bg-tertiary)' }}>
                  {category}
                </div>
                {categoryErrors.map(error => (
                  <button
                    key={error.id}
                    onClick={() => setSelectedError(error)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors ${
                      selectedError?.id === error.id ? 'bg-red-500/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-red-400">{error.type}</div>
                        <div className="text-muted truncate mt-0.5">{error.text}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Error Details */}
          {selectedError && (
            <div className="flex-1 p-3">
              <div className="mb-3">
                <div className="text-xs font-medium text-red-400 mb-1">{selectedError.type}</div>
                <code className="text-2xs text-muted block p-2 rounded font-mono break-all" style={{ background: 'var(--bg-tertiary)' }}>
                  {selectedError.text}
                </code>
              </div>

              {/* Quick Fixes */}
              {quickFixes.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-secondary mb-2">Quick Fixes</div>
                  <div className="space-y-1">
                    {quickFixes.map((fix, index) => (
                      <button
                        key={index}
                        onClick={() => onExecuteCommand?.(fix.command)}
                        className="w-full text-left p-2 rounded text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
                        style={{ background: 'var(--bg-tertiary)' }}
                      >
                        <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-primary">{fix.label}</span>
                        <code className="text-2xs text-muted ml-auto font-mono">{fix.command}</code>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              <div>
                <button
                  onClick={requestAIAnalysis}
                  disabled={isAnalyzing}
                  className={`w-full p-2 rounded text-xs flex items-center justify-center gap-2 transition-colors ${
                    isAnalyzing
                      ? 'bg-accent/10 text-accent cursor-wait'
                      : 'bg-accent/20 text-accent hover:bg-accent/30'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Ask AI to Analyze
                    </>
                  )}
                </button>

                {aiAnalysis && !aiAnalysis.error && (
                  <div className="mt-3 p-2 rounded text-xs" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="text-primary mb-2">{aiAnalysis.summary}</div>
                    <div className="text-muted">{aiAnalysis.solution}</div>
                  </div>
                )}

                {aiAnalysis?.error && (
                  <div className="mt-3 p-2 rounded text-xs text-red-400" style={{ background: 'var(--bg-tertiary)' }}>
                    {aiAnalysis.error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export utility for external use
export { parseErrors, ERROR_PATTERNS };
