/**
 * ToolCallViewer Component
 * Detailed view of individual tool/action calls with config inspection
 * Shows arguments, output, timing, and status with syntax highlighting
 */

import { useState, useRef, useEffect } from 'react';
import { ActionStatus } from '../hooks/useAgentSocket.js';

// Syntax highlighting for common output patterns
function highlightOutput(text) {
  if (!text) return null;

  // Split into lines and apply highlighting
  return text.split('\n').map((line, i) => {
    let className = 'text-hacker-text';

    // Error patterns
    if (/error|fail|exception/i.test(line)) {
      className = 'text-red-400';
    }
    // Warning patterns
    else if (/warn|warning/i.test(line)) {
      className = 'text-yellow-400';
    }
    // Success patterns
    else if (/success|pass|ok|done|complete/i.test(line)) {
      className = 'text-green-400';
    }
    // Info patterns
    else if (/info|debug/i.test(line)) {
      className = 'text-blue-400';
    }
    // Path patterns
    else if (/^(\/|\.\/|~\/)/.test(line)) {
      className = 'text-cyan-400';
    }
    // JSON-like content
    else if (/^\s*[{[\]}"']/.test(line)) {
      className = 'text-purple-300';
    }

    return (
      <span key={i} className={className}>
        {line}
        {i < text.split('\n').length - 1 && '\n'}
      </span>
    );
  });
}

// Format JSON for display
function formatJson(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

/**
 * Config inspector - shows action configuration
 */
function ConfigInspector({ config, actionType }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!config || Object.keys(config).length === 0) {
    return null;
  }

  return (
    <div className="border border-hacker-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 bg-hacker-surface/30 hover:bg-hacker-surface/50 transition-colors"
      >
        <span className="text-xs font-mono text-hacker-text-dim uppercase tracking-wider">
          Configuration
        </span>
        <svg
          className={`w-4 h-4 text-hacker-text-dim transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-3 bg-black/30">
          {actionType === 'shell' && config.command ? (
            <div className="space-y-2">
              <div className="text-xs font-mono text-hacker-text-dim">Command:</div>
              <pre className="text-sm font-mono text-cyan-400 bg-black/40 p-2 rounded overflow-x-auto">
                $ {config.command}
              </pre>
            </div>
          ) : actionType === 'api' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">
                  {config.method || 'GET'}
                </span>
                <span className="text-sm font-mono text-hacker-text truncate">
                  {config.url}
                </span>
              </div>
              {config.headers && Object.keys(config.headers).length > 0 && (
                <div>
                  <div className="text-xs font-mono text-hacker-text-dim mb-1">Headers:</div>
                  <pre className="text-xs font-mono text-gray-400 bg-black/40 p-2 rounded overflow-x-auto">
                    {formatJson(config.headers)}
                  </pre>
                </div>
              )}
              {config.body && (
                <div>
                  <div className="text-xs font-mono text-hacker-text-dim mb-1">Body:</div>
                  <pre className="text-xs font-mono text-gray-400 bg-black/40 p-2 rounded overflow-x-auto">
                    {typeof config.body === 'string' ? config.body : formatJson(config.body)}
                  </pre>
                </div>
              )}
            </div>
          ) : actionType === 'mcp' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-hacker-text-dim">Tool:</span>
                <span className="text-sm font-mono text-purple-400">{config.toolName}</span>
              </div>
              {config.serverId && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-hacker-text-dim">Server:</span>
                  <span className="text-sm font-mono text-hacker-text">{config.serverId}</span>
                </div>
              )}
              {config.args && (
                <div>
                  <div className="text-xs font-mono text-hacker-text-dim mb-1">Arguments:</div>
                  <pre className="text-xs font-mono text-gray-400 bg-black/40 p-2 rounded overflow-x-auto">
                    {formatJson(config.args)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <pre className="text-xs font-mono text-gray-400 overflow-x-auto">
              {formatJson(config)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Output viewer with streaming support
 */
function OutputViewer({ output, status, error }) {
  const outputRef = useRef(null);
  const [wordWrap, setWordWrap] = useState(true);

  // Auto-scroll when running
  useEffect(() => {
    if (status === ActionStatus.RUNNING && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, status]);

  const copyOutput = () => {
    navigator.clipboard.writeText(output || error || '');
  };

  const downloadOutput = () => {
    const content = output || error || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tool-output-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-hacker-border/50 bg-hacker-surface/30">
        <span className="text-xs font-mono text-hacker-text-dim uppercase tracking-wider">
          Output
          {output && (
            <span className="ml-2 text-hacker-cyan">
              ({output.split('\n').length} lines)
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1 rounded transition-colors ${
              wordWrap
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-hacker-text-dim hover:text-hacker-text hover:bg-hacker-surface'
            }`}
            title={wordWrap ? 'Word wrap on' : 'Word wrap off'}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <button
            onClick={copyOutput}
            disabled={!output && !error}
            className="p-1 text-hacker-text-dim hover:text-hacker-text hover:bg-hacker-surface rounded transition-colors disabled:opacity-50"
            title="Copy"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={downloadOutput}
            disabled={!output && !error}
            className="p-1 text-hacker-text-dim hover:text-hacker-text hover:bg-hacker-surface rounded transition-colors disabled:opacity-50"
            title="Download"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Output content */}
      <div
        ref={outputRef}
        className="flex-1 overflow-auto bg-black/40 p-3"
        style={{ minHeight: '150px', maxHeight: '400px' }}
      >
        {error && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded">
            <div className="text-xs font-mono text-red-400 font-semibold mb-1">Error</div>
            <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap break-words">
              {error}
            </pre>
          </div>
        )}

        {output ? (
          <pre
            className={`text-xs font-mono ${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}
          >
            {highlightOutput(output)}
            {status === ActionStatus.RUNNING && (
              <span className="animate-pulse text-green-400">▌</span>
            )}
          </pre>
        ) : status === ActionStatus.RUNNING ? (
          <div className="flex items-center gap-2 text-hacker-text-dim">
            <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono">Executing...</span>
          </div>
        ) : status === ActionStatus.PENDING ? (
          <div className="text-xs font-mono text-hacker-text-dim">
            Waiting to execute...
          </div>
        ) : !error ? (
          <div className="text-xs font-mono text-hacker-text-dim">
            No output
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Main ToolCallViewer component
 */
export default function ToolCallViewer({ action, onClose }) {
  if (!action) return null;

  // Action type config
  const typeConfig = {
    shell: { icon: '🖥️', label: 'Shell Command', color: 'cyan' },
    api: { icon: '🌐', label: 'API Call', color: 'blue' },
    mcp: { icon: '🔧', label: 'MCP Tool', color: 'purple' },
    unknown: { icon: '❓', label: 'Unknown', color: 'gray' },
  }[action.actionType] || { icon: '❓', label: action.actionType, color: 'gray' };

  // Status config
  const statusConfig = {
    [ActionStatus.PENDING]: { icon: '○', label: 'Pending', color: 'gray' },
    [ActionStatus.RUNNING]: { icon: '►', label: 'Running', color: 'green', animate: true },
    [ActionStatus.COMPLETED]: { icon: '✓', label: 'Completed', color: 'cyan' },
    [ActionStatus.FAILED]: { icon: '✗', label: 'Failed', color: 'red' },
  }[action.status] || { icon: '?', label: action.status, color: 'gray' };

  // Format duration
  const formatDuration = (ms) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <div className="flex flex-col h-full bg-hacker-bg border border-hacker-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-hacker-border bg-hacker-surface/30">
        <div className="flex items-center gap-3">
          <span className="text-xl">{typeConfig.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-hacker-text font-semibold">
                {typeConfig.label}
              </span>
              <span className="text-xs font-mono text-hacker-text-dim">
                Step {action.actionIndex + 1}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`flex items-center gap-1 text-xs font-mono text-${statusConfig.color}-400`}
              >
                <span className={statusConfig.animate ? 'animate-pulse' : ''}>
                  {statusConfig.icon}
                </span>
                {statusConfig.label}
              </span>
              {action.duration && (
                <span className="text-xs font-mono text-hacker-text-dim">
                  • {formatDuration(action.duration)}
                </span>
              )}
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-hacker-text-dim hover:text-hacker-text hover:bg-hacker-surface rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Config inspector */}
        <ConfigInspector config={action.actionConfig} actionType={action.actionType} />

        {/* Output viewer */}
        <div className="border border-hacker-border/50 rounded-lg overflow-hidden">
          <OutputViewer
            output={action.output}
            status={action.status}
            error={action.error}
          />
        </div>

        {/* Timing details */}
        {(action.startedAt || action.endedAt) && (
          <div className="p-3 bg-hacker-surface/30 rounded-lg border border-hacker-border/50">
            <div className="text-xs font-mono text-hacker-text-dim uppercase tracking-wider mb-2">
              Timing
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {action.startedAt && (
                <div>
                  <span className="text-hacker-text-dim">Started:</span>
                  <span className="text-hacker-text ml-2">
                    {new Date(action.startedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {action.endedAt && (
                <div>
                  <span className="text-hacker-text-dim">Ended:</span>
                  <span className="text-hacker-text ml-2">
                    {new Date(action.endedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {action.duration && (
                <div className="col-span-2">
                  <span className="text-hacker-text-dim">Duration:</span>
                  <span className="text-cyan-400 ml-2">{formatDuration(action.duration)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
