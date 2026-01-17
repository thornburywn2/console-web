/**
 * StepIndicator Component
 * Displays wizard progress with step circles and connectors
 */

export default function StepIndicator({ steps, currentStep, completedSteps }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-4">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index);
        const isCurrent = currentStep === index;
        const isPast = index < currentStep;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: isCurrent
                    ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                    : isCompleted || isPast
                    ? 'var(--accent-primary)'
                    : 'var(--bg-tertiary)',
                  border: isCurrent
                    ? 'none'
                    : `2px solid ${isCompleted || isPast ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                  boxShadow: isCurrent ? '0 0 20px rgba(16, 185, 129, 0.4)' : 'none',
                }}
              >
                {isCompleted || isPast ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span
                    className="text-sm font-semibold"
                    style={{ color: isCurrent ? 'white' : 'var(--text-muted)' }}
                  >
                    {index + 1}
                  </span>
                )}
              </div>
              <span
                className="text-xs mt-2 font-medium"
                style={{ color: isCurrent ? 'var(--accent-primary)' : 'var(--text-muted)' }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className="w-12 h-0.5 mx-2 transition-colors duration-300"
                style={{
                  background: isPast
                    ? 'var(--accent-primary)'
                    : 'var(--border-default)'
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
