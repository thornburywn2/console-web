/**
 * Log Entry Row
 */

import { getLogLevelColor } from './constants';

export function LogEntry({ entry }) {
  return (
    <div className="flex gap-2 p-2 bg-hacker-surface/30 rounded hover:bg-hacker-surface/50">
      <span className="text-hacker-text-dim whitespace-nowrap">
        {new Date(Number(entry.timestamp) / 1000000).toLocaleTimeString()}
      </span>
      <span className={`flex-1 break-all ${getLogLevelColor(entry.line)}`}>
        {entry.line}
      </span>
    </div>
  );
}
