/**
 * ToolCard Component
 * Displays a security tool status card
 */

import { ToolStatus } from './constants';

const getStatusColor = (status) => {
  switch (status) {
    case ToolStatus.INSTALLED: return 'text-hacker-green';
    case ToolStatus.MISSING: return 'text-hacker-warning';
    case ToolStatus.CHECKING: return 'text-hacker-cyan animate-pulse';
    case ToolStatus.ERROR: return 'text-hacker-error';
    default: return 'text-gray-500';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case ToolStatus.INSTALLED: return '✓';
    case ToolStatus.MISSING: return '✗';
    case ToolStatus.CHECKING: return '◌';
    case ToolStatus.ERROR: return '!';
    default: return '?';
  }
};

export default function ToolCard({ tool, status, onInstall }) {
  return (
    <div className="bg-hacker-darker border border-hacker-green/20 rounded p-3 hover:border-hacker-green/40 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-hacker-text">{tool.name}</span>
        <span className={`text-sm ${getStatusColor(status)}`}>
          {getStatusIcon(status)}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-2 line-clamp-2">{tool.description}</p>
      {status === ToolStatus.MISSING && (
        <button
          onClick={() => onInstall(tool)}
          className="w-full px-2 py-1 text-xs bg-hacker-green/10 border border-hacker-green/30 text-hacker-green rounded hover:bg-hacker-green/20 transition-colors"
        >
          Install
        </button>
      )}
    </div>
  );
}
