/**
 * SavedRequestCard Component
 * Display saved API request
 */

import { HTTP_METHODS } from './constants';

export default function SavedRequestCard({ request, onLoad, onDelete }) {
  const methodConfig = HTTP_METHODS.find(m => m.method === request.method) || HTTP_METHODS[0];

  return (
    <div
      className="flex items-center gap-2 p-2 rounded hover:bg-white/5 cursor-pointer group"
      onClick={() => onLoad(request)}
    >
      <span
        className="text-xs font-bold px-1.5 py-0.5 rounded"
        style={{ background: methodConfig.color + '20', color: methodConfig.color }}
      >
        {request.method}
      </span>
      <span className="flex-1 text-sm text-secondary truncate">{request.name || request.url}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(request.id); }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded"
      >
        <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
