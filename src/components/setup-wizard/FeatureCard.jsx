/**
 * FeatureCard Component
 * Feature toggle card for setup wizard
 */

export default function FeatureCard({ feature, enabled, onToggle }) {
  return (
    <button
      onClick={() => onToggle(feature.id)}
      className={`relative p-4 rounded-xl text-left transition-all duration-200 ${
        enabled
          ? 'ring-2 ring-accent bg-accent/10'
          : 'bg-white/5 hover:bg-white/10 border border-white/10'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: `${feature.color}20` }}
        >
          {feature.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-primary">{feature.name}</h4>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                enabled ? 'bg-accent border-accent' : 'border-white/30'
              }`}
            >
              {enabled && (
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
          <p className="text-xs text-muted mt-1">{feature.description}</p>
        </div>
      </div>
    </button>
  );
}
