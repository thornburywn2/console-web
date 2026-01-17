/**
 * StepIndicator Component
 * Progress indicator for wizard steps
 */

export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm font-bold transition-all duration-300 ${
              index < currentStep
                ? 'bg-accent text-black'
                : index === currentStep
                ? 'bg-accent/20 text-accent border-2 border-accent'
                : 'bg-white/5 text-muted border border-white/10'
            }`}
          >
            {index < currentStep ? '✓' : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 mx-1 transition-colors duration-300 ${
                index < currentStep ? 'bg-accent' : 'bg-white/10'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
