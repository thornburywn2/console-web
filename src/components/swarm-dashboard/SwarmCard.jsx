/**
 * SwarmCard Component
 * Displays a swarm in the list
 */

export default function SwarmCard({ swarm, isActive, onSelect, onStop, isLoading }) {
  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isActive
          ? 'border-accent bg-accent/10'
          : 'border-border hover:border-accent/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            swarm.status === 'running' ? 'bg-green-500 animate-pulse' :
            swarm.status === 'starting' ? 'bg-yellow-500 animate-pulse' :
            'bg-gray-500'
          }`} />
          <span className="font-mono text-sm text-text">{swarm.id.slice(0, 12)}</span>
          <span className="text-xs text-text-secondary capitalize">{swarm.status}</span>
        </div>
        {swarm.status === 'running' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStop();
            }}
            disabled={isLoading}
            className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
          >
            {isLoading ? 'Stopping...' : 'Stop'}
          </button>
        )}
      </div>
      <div className="mt-1 text-xs text-text-secondary">
        Agents: {swarm.agents?.join(', ') || 'None'}
      </div>
    </div>
  );
}
