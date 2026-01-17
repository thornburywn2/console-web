/**
 * Memory Card Component
 */

import { MEMORY_TYPES, SCOPE_COLORS } from './constants';

export function MemoryCard({ memory, onSelect, onTogglePin }) {
  const typeConfig = MEMORY_TYPES[memory.type] || MEMORY_TYPES.CONTEXT;

  return (
    <div
      className={`p-3 bg-gray-800 border rounded-lg hover:border-blue-500/50 transition-all cursor-pointer ${
        memory.pinned ? 'border-yellow-500/50' : 'border-gray-700'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded bg-${typeConfig.color}-500/20 text-${typeConfig.color}-400`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeConfig.icon} />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-gray-200 truncate">{memory.title}</h4>
            {memory.pinned && (
              <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
          </div>

          <p className="text-xs text-gray-400 line-clamp-2 mb-2">{memory.content}</p>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-2xs px-1.5 py-0.5 rounded ${SCOPE_COLORS[memory.scope]}`}>
              {memory.scope}
            </span>
            <span className="text-2xs text-gray-500">
              Importance: {memory.importance}/10
            </span>
            {memory.tags?.slice(0, 2).map(tag => (
              <span key={tag} className="text-2xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(memory);
          }}
          className="p-1 text-gray-500 hover:text-yellow-400 transition-colors"
        >
          <svg className="w-4 h-4" fill={memory.pinned ? 'currentColor' : 'none'} viewBox="0 0 20 20" stroke="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
