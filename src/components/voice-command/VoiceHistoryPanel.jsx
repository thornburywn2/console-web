/**
 * VoiceHistoryPanel Component
 * History panel showing recent voice commands
 */

export default function VoiceHistoryPanel({ history }) {
  return (
    <div className="px-4 pb-4 border-t border-white/10 pt-4 max-h-48 overflow-y-auto">
      <h4 className="text-xs font-medium text-gray-400 mb-3">Recent Commands</h4>
      {history.length === 0 ? (
        <p className="text-xs text-gray-500">No voice commands yet</p>
      ) : (
        <div className="space-y-2">
          {history.slice(0, 10).map((item, i) => (
            <div key={i} className="text-xs">
              <p className="text-gray-300 truncate">{item.transcript}</p>
              <p className="text-gray-500">
                {item.command?.description || item.command?.action}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
