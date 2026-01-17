/**
 * TableListItem Component
 * Table entry in sidebar list
 */

export default function TableListItem({ table, isSelected, onClick }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
        isSelected ? 'bg-accent/20 text-accent' : 'hover:bg-white/5 text-secondary'
      }`}
      onClick={onClick}
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <span className="text-sm truncate">{table.name}</span>
      <span className="text-xs text-muted ml-auto">{table.rowCount}</span>
    </div>
  );
}
