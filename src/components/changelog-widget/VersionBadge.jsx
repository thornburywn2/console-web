/**
 * VersionBadge Component
 */

import { TYPE_COLORS } from './constants';

export function VersionBadge({ version, type }) {
  return (
    <span
      className="px-2 py-0.5 text-xs font-bold rounded"
      style={{ background: TYPE_COLORS[type] + '20', color: TYPE_COLORS[type] }}
    >
      v{version}
    </span>
  );
}
