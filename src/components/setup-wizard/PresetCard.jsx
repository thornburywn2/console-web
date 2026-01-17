/**
 * PresetCard Component
 * Widget preset selection card
 */

export default function PresetCard({ preset, presetKey, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(presetKey)}
      className={`p-4 rounded-xl text-left transition-all duration-200 ${
        selected
          ? 'ring-2 ring-accent bg-accent/10'
          : 'bg-white/5 hover:bg-white/10 border border-white/10'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-primary">{preset.name}</h4>
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            selected ? 'bg-accent border-accent' : 'border-white/30'
          }`}
        >
          {selected && (
            <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
      <p className="text-xs text-muted">{preset.description}</p>
      <div className="flex flex-wrap gap-1 mt-3">
        {preset.widgets.slice(0, 5).map((w) => (
          <span
            key={w}
            className="px-2 py-0.5 text-[10px] rounded bg-white/10 text-secondary font-mono"
          >
            {w}
          </span>
        ))}
        {preset.widgets.length > 5 && (
          <span className="px-2 py-0.5 text-[10px] rounded bg-white/10 text-muted font-mono">
            +{preset.widgets.length - 5}
          </span>
        )}
      </div>
    </button>
  );
}
