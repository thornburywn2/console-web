/**
 * ConversationPreview Component
 * Displays a conversation for selection before import
 */

export default function ConversationPreview({ conversation, isSelected, onToggle }) {
  return (
    <label
      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-white/5"
      style={{ background: 'var(--bg-glass)' }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="w-4 h-4 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-primary truncate">{conversation.title}</div>
        <div className="text-xs text-muted">
          {conversation.messages.length} messages • {new Date(conversation.createdAt).toLocaleDateString()}
        </div>
        {conversation.messages[0] && (
          <div className="text-xs text-secondary mt-1 truncate">
            {conversation.messages[0].content.substring(0, 100)}...
          </div>
        )}
      </div>
    </label>
  );
}
