/**
 * CommandConfirmation Component
 * Confirmation dialog for recognized voice commands
 */

import { X, Check } from 'lucide-react';

export default function CommandConfirmation({
  command,
  onExecute,
  onCancel,
  onSelectSuggestion
}) {
  if (!command) return null;

  return (
    <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
      <p className="text-xs text-gray-400 mb-1">Recognized command:</p>
      <p className="text-sm font-mono text-white mb-2">
        {command.command || command.description}
      </p>
      {command.description && command.command && (
        <p className="text-xs text-gray-400 mb-2">{command.description}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {(command.confidence * 100).toFixed(0)}% confident
        </span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-1"
          >
            <X size={12} />
            Cancel
          </button>
          <button
            onClick={() => onExecute(command)}
            className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 rounded flex items-center gap-1"
          >
            <Check size={12} />
            Execute
          </button>
        </div>
      </div>

      {/* Suggestions for low confidence */}
      {command.suggestions?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-gray-400 mb-2">Did you mean:</p>
          <div className="space-y-1">
            {command.suggestions.slice(0, 3).map((s, i) => (
              <button
                key={i}
                onClick={() => onSelectSuggestion(s)}
                className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-white/10 rounded"
              >
                {s.description}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
