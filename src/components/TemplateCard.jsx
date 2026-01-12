/**
 * Template Card Component
 * Display card for project template selection
 */

// Icon mapping for Lucide React (if available) or fallback
const ICON_MAP = {
  Layers: '📚',
  Monitor: '🖥️',
  Terminal: '💻',
  Server: '🖧',
  Smartphone: '📱',
  Code: '💾',
  Database: '🗄️',
  Cloud: '☁️'
};

// Difficulty badge colors
const DIFFICULTY_COLORS = {
  beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30'
};

export default function TemplateCard({ template, selected, onSelect }) {
  const icon = ICON_MAP[template.icon] || '📁';
  const difficultyClass = DIFFICULTY_COLORS[template.difficulty] || DIFFICULTY_COLORS.intermediate;

  return (
    <div
      onClick={onSelect}
      className={`
        relative p-4 rounded-xl cursor-pointer transition-all duration-200
        border-2
        ${selected
          ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
        }
      `}
      style={{
        '--template-color': template.color || '#3B82F6'
      }}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${template.color}20` }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{template.name}</h3>
          <p className="text-sm text-gray-400 line-clamp-2">{template.description}</p>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(template.stack || []).slice(0, 4).map((tech, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded text-xs font-medium bg-gray-700/50 text-gray-300"
          >
            {tech}
          </span>
        ))}
        {(template.stack || []).length > 4 && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-700/50 text-gray-400">
            +{template.stack.length - 4} more
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${difficultyClass}`}>
          {template.difficulty || 'intermediate'}
        </span>
        <span className="text-xs text-gray-500">
          {template.estimatedSetupTime || '5 minutes'}
        </span>
      </div>

      {/* Requirements indicator */}
      {template.requirements?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>Requires: {template.requirements.join(', ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
