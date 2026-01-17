/**
 * OutputLine Component
 * Displays a single line of swarm output
 */

export default function OutputLine({ line }) {
  const colorClass =
    line.type === 'stderr' ? 'text-red-400' :
    line.type === 'input' ? 'text-blue-400' :
    line.type === 'info' ? 'text-gray-400 italic' :
    line.type === 'agent' ? 'text-purple-400' :
    'text-gray-200';

  return (
    <div className={`whitespace-pre-wrap break-all mb-1 ${colorClass}`}>
      {line.content}
    </div>
  );
}
