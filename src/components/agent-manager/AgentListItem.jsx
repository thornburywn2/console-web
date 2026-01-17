/**
 * AgentListItem Component
 */

import { TRIGGER_ICONS } from './constants';
import { getTriggerCategory } from './utils';

export function AgentListItem({ agent, isSelected, onSelect, onRun, onStop, onToggle, onDelete }) {
  const category = getTriggerCategory(agent.triggerType);
  const lastExecution = agent.executions?.[0];

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg cursor-pointer transition-all ${isSelected ? 'ring-2' : ''}`}
      style={{
        background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-glass)',
        border: '1px solid ' + (isSelected ? 'var(--accent-color)' : 'var(--border-subtle)'),
        ringColor: 'var(--accent-color)'
      }}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full mt-2 ${agent.isRunning ? 'bg-green-500 animate-pulse' : agent.enabled ? 'bg-gray-400' : 'bg-gray-600'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {agent.name}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              {TRIGGER_ICONS[category]}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {agent.project && (
              <span className="truncate">{agent.project.name}</span>
            )}
            {lastExecution && (
              <span className={lastExecution.status === 'COMPLETED' ? 'text-green-500' : lastExecution.status === 'FAILED' ? 'text-red-500' : ''}>
                {lastExecution.status.toLowerCase()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {agent.isRunning ? (
            <button
              onClick={onStop}
              className="p-1.5 rounded hover:bg-red-500/20 text-red-400"
              title="Stop"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onRun}
              className="p-1.5 rounded hover:bg-green-500/20 text-green-400"
              title="Run"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          <button
            onClick={onToggle}
            className={`p-1.5 rounded ${agent.enabled ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-gray-500 hover:bg-gray-500/20'}`}
            title={agent.enabled ? 'Disable' : 'Enable'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={agent.enabled ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded text-red-400/60 hover:text-red-400 hover:bg-red-500/20"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
