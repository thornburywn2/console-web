/**
 * Models Tab Component
 * Displays available providers and models
 */

export default function ModelsTab({ providers, availability }) {
  return (
    <div className="space-y-4">
      {Object.entries(providers).map(([key, provider]) => (
        <div key={key} className="glass-panel p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-foreground">{provider.name}</h3>
            <span className={`px-2 py-0.5 text-xs rounded ${
              availability[key]?.available ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {availability[key]?.available ? 'Available' : 'Unavailable'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {provider.models.map((model) => (
              <div key={model.id} className="p-2 rounded bg-surface text-xs">
                <span className="text-foreground">{model.name}</span>
                {model.recommended && <span className="ml-1 text-green-400">★</span>}
                {model.fast && <span className="ml-1 text-blue-400">⚡</span>}
                {model.slow && <span className="ml-1 text-yellow-400">🐢</span>}
                <div className="text-muted font-mono truncate">{model.id}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
