/**
 * Project Tag Chip Component
 * Displays inline tag badges
 */

export default function ProjectTagChip({ tag, size = 'sm', onRemove }) {
  const sizeClasses = {
    xs: 'text-2xs px-1 py-0.5',
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        border: `1px solid ${tag.color}40`,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag.id);
          }}
          className="hover:opacity-70"
        >
          ×
        </button>
      )}
    </span>
  );
}
