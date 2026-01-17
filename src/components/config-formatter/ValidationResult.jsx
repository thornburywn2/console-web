/**
 * ValidationResult Component
 * Displays validation status or errors
 */

export default function ValidationResult({ errors }) {
  if (!errors || errors.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Valid
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {errors.map((error, i) => (
        <div key={i} className="flex items-start gap-2 text-red-400 text-sm">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>{error}</span>
        </div>
      ))}
    </div>
  );
}
