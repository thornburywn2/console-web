/**
 * ColumnHeader Component
 * Sortable column header
 */

import { TYPE_COLORS } from './constants';

export default function ColumnHeader({ column, sortColumn, sortDirection, onSort }) {
  const isActive = sortColumn === column.name;

  return (
    <th
      className="px-3 py-2 text-left cursor-pointer hover:bg-white/5 select-none"
      onClick={() => onSort(column.name)}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted">{column.name}</span>
        <span
          className="text-xs px-1 py-0.5 rounded"
          style={{ background: TYPE_COLORS[column.type] + '20', color: TYPE_COLORS[column.type] }}
        >
          {column.type}
        </span>
        {isActive && (
          <svg className={`w-3 h-3 text-accent ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </div>
    </th>
  );
}
