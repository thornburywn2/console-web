/**
 * StepCard Component
 * Displays a single plan step with status and actions
 */

import { STATUS_CONFIG } from './constants';

export default function StepCard({ step, onUpdateStatus }) {
  const config = STATUS_CONFIG[step.status] || STATUS_CONFIG.PENDING;

  return (
    <div className={`p-3 bg-gray-800 border rounded-lg border-${config.color}-500/30`}>
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded bg-${config.color}-500/20 text-${config.color}-400 ${config.animate ? 'animate-pulse' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">Step {step.order}</span>
            <h4 className="text-sm font-medium text-gray-200">{step.title}</h4>
          </div>

          {step.description && (
            <p className="text-xs text-gray-400 mb-2">{step.description}</p>
          )}

          {step.command && (
            <code className="block text-xs bg-gray-900 text-green-400 px-2 py-1 rounded font-mono mb-2">
              {step.command}
            </code>
          )}

          {step.output && (
            <pre className="text-xs bg-gray-900 text-gray-400 px-2 py-1 rounded max-h-20 overflow-auto mb-2">
              {step.output}
            </pre>
          )}

          {step.error && (
            <pre className="text-xs bg-red-900/20 text-red-400 px-2 py-1 rounded max-h-20 overflow-auto mb-2">
              {step.error}
            </pre>
          )}

          {step.duration && (
            <span className="text-2xs text-gray-500">Duration: {step.duration}ms</span>
          )}
        </div>

        <div className="flex gap-1">
          {step.status === 'PENDING' && (
            <button
              onClick={() => onUpdateStatus(step.id, 'IN_PROGRESS')}
              className="p-1 text-blue-400 hover:text-blue-300"
              title="Start"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            </button>
          )}
          {step.status === 'IN_PROGRESS' && (
            <>
              <button
                onClick={() => onUpdateStatus(step.id, 'COMPLETED')}
                className="p-1 text-green-400 hover:text-green-300"
                title="Complete"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => onUpdateStatus(step.id, 'FAILED')}
                className="p-1 text-red-400 hover:text-red-300"
                title="Failed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
