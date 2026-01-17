/**
 * DataCell Component
 * Table cell with type-aware formatting
 */

import { TYPE_COLORS } from './constants';

export default function DataCell({ value, type }) {
  const displayValue = value === null ? 'NULL' :
                       type === 'json' ? JSON.stringify(value).slice(0, 50) :
                       type === 'date' ? new Date(value).toLocaleString() :
                       type === 'boolean' ? (value ? 'true' : 'false') :
                       String(value).slice(0, 100);

  return (
    <td className="px-3 py-2 text-sm font-mono truncate max-w-xs" style={{ color: TYPE_COLORS[type] || 'inherit' }}>
      {displayValue}
      {String(value).length > 100 && <span className="text-muted">...</span>}
    </td>
  );
}
