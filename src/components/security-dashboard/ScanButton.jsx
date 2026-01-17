/**
 * ScanButton Component
 * Button for running a security scan
 */

export default function ScanButton({ scan, isScanning, result, disabled, onClick }) {
  const getButtonClass = () => {
    if (isScanning) return 'bg-hacker-green/20 border-hacker-green animate-pulse';
    if (result?.success === false) return 'bg-hacker-error/10 border-hacker-error/30 hover:border-hacker-error';
    if (result?.success) return 'bg-hacker-green/10 border-hacker-green/30 hover:border-hacker-green';
    return 'bg-hacker-darker border-hacker-green/20 hover:border-hacker-cyan';
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-4 rounded border transition-all text-left ${getButtonClass()} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{scan.icon}</span>
        <span className="text-sm font-medium text-hacker-text">{scan.name}</span>
      </div>
      <p className="text-xs text-gray-500">{scan.description}</p>
      {result && (
        <div className="mt-2 text-xs">
          {result.success ? (
            <span className="text-hacker-green">Last scan: Passed</span>
          ) : (
            <span className="text-hacker-error">Last scan: Issues found</span>
          )}
        </div>
      )}
    </button>
  );
}
