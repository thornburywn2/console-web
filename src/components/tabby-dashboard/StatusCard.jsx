/**
 * StatusCard Component
 * Displays a single status indicator card
 */

export default function StatusCard({ title, available, label, availableLabel, unavailableLabel, animate = false }) {
  return (
    <div className="bg-surface-secondary rounded-lg p-4 border border-border">
      <h3 className="text-sm font-medium text-text-secondary mb-2">{title}</h3>
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${available ? 'bg-green-500' : 'bg-red-500'} ${animate ? 'animate-pulse' : ''}`} />
        <span className="text-text">{label || (available ? availableLabel : unavailableLabel)}</span>
      </div>
    </div>
  );
}
