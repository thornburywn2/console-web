/**
 * PlanModeViewer Component
 * AI planning visualization with Mermaid diagrams and step tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Status colors and icons
const STATUS_CONFIG = {
  PENDING: { color: 'gray', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  IN_PROGRESS: { color: 'blue', icon: 'M13 10V3L4 14h7v7l9-11h-7z', animate: true },
  COMPLETED: { color: 'green', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  FAILED: { color: 'red', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  SKIPPED: { color: 'purple', icon: 'M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z' },
  BLOCKED: { color: 'orange', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' }
};

const PLAN_STATUS_CONFIG = {
  PLANNING: { color: 'blue', label: 'Planning' },
  READY: { color: 'cyan', label: 'Ready' },
  EXECUTING: { color: 'yellow', label: 'Executing' },
  PAUSED: { color: 'orange', label: 'Paused' },
  COMPLETED: { color: 'green', label: 'Completed' },
  FAILED: { color: 'red', label: 'Failed' },
  CANCELLED: { color: 'gray', label: 'Cancelled' }
};

export default function PlanModeViewer({ projectId, sessionId, onClose }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [mermaidDiagram, setMermaidDiagram] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const diagramRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal: '',
    steps: [{ title: '', description: '', command: '' }]
  });

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      if (sessionId) params.set('sessionId', sessionId);

      const response = await fetch(`/api/plans?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  }, [projectId, sessionId]);

  // Fetch diagram for selected plan
  const fetchDiagram = useCallback(async (planId) => {
    try {
      const response = await fetch(`/api/plans/${planId}/diagram`);
      if (response.ok) {
        const data = await response.json();
        setMermaidDiagram(data.diagram);
        renderMermaid(data.diagram);
      }
    } catch (err) {
      console.error('Error fetching diagram:', err);
    }
  }, []);

  // Render Mermaid diagram
  const renderMermaid = async (diagram) => {
    if (!diagramRef.current || !diagram) return;

    try {
      // Dynamically import mermaid
      const mermaid = (await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#3b82f6',
          primaryTextColor: '#f3f4f6',
          primaryBorderColor: '#60a5fa',
          lineColor: '#6b7280',
          secondaryColor: '#1f2937',
          tertiaryColor: '#374151'
        }
      });

      const { svg } = await mermaid.render('mermaid-diagram', diagram);
      diagramRef.current.innerHTML = svg;
    } catch (err) {
      console.error('Error rendering mermaid:', err);
      // Fallback: show raw diagram
      diagramRef.current.innerHTML = `<pre class="text-xs text-gray-400 bg-gray-800 p-4 rounded overflow-auto">${diagram}</pre>`;
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchPlans();
      setLoading(false);
    };
    load();
  }, [fetchPlans]);

  useEffect(() => {
    if (selectedPlan) {
      fetchDiagram(selectedPlan.id);
    }
  }, [selectedPlan, fetchDiagram]);

  // Create plan
  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sessionId,
          title: formData.title,
          description: formData.description,
          goal: formData.goal,
          steps: formData.steps.filter(s => s.title.trim())
        })
      });

      if (response.ok) {
        const plan = await response.json();
        setIsCreating(false);
        setFormData({ title: '', description: '', goal: '', steps: [{ title: '', description: '', command: '' }] });
        fetchPlans();
        setSelectedPlan(plan);
      } else {
        const data = await response.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create plan');
    }
  };

  // Update step status
  const updateStepStatus = async (stepId, status) => {
    if (!selectedPlan) return;

    try {
      await fetch(`/api/plans/${selectedPlan.id}/steps/${stepId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      // Refresh plan
      const response = await fetch(`/api/plans/${selectedPlan.id}`);
      if (response.ok) {
        const plan = await response.json();
        setSelectedPlan(plan);
        fetchDiagram(plan.id);
      }
    } catch (err) {
      console.error('Error updating step:', err);
    }
  };

  // Execute plan
  const handleExecute = async () => {
    if (!selectedPlan) return;

    try {
      const response = await fetch(`/api/plans/${selectedPlan.id}/execute`, { method: 'POST' });
      if (response.ok) {
        const plan = await response.json();
        setSelectedPlan(plan);
        fetchPlans();
        fetchDiagram(plan.id);
      }
    } catch (err) {
      console.error('Error executing plan:', err);
    }
  };

  // Pause/cancel plan
  const handlePlanAction = async (action) => {
    if (!selectedPlan) return;

    try {
      const response = await fetch(`/api/plans/${selectedPlan.id}/${action}`, { method: 'POST' });
      if (response.ok) {
        const plan = await response.json();
        setSelectedPlan(plan);
        fetchPlans();
      }
    } catch (err) {
      console.error(`Error ${action} plan:`, err);
    }
  };

  // Add step to form
  const addStep = () => {
    setFormData(f => ({
      ...f,
      steps: [...f.steps, { title: '', description: '', command: '' }]
    }));
  };

  // Remove step from form
  const removeStep = (index) => {
    setFormData(f => ({
      ...f,
      steps: f.steps.filter((_, i) => i !== index)
    }));
  };

  // Step card component
  const StepCard = ({ step, index }) => {
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
                onClick={() => updateStepStatus(step.id, 'IN_PROGRESS')}
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
                  onClick={() => updateStepStatus(step.id, 'COMPLETED')}
                  className="p-1 text-green-400 hover:text-green-300"
                  title="Complete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => updateStepStatus(step.id, 'FAILED')}
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 flex items-center gap-2">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading plans...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Plans list */}
      <div className="w-80 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-gray-200">Plans</h2>
            <button
              onClick={() => setIsCreating(true)}
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {plans.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No plans yet</p>
              <button
                onClick={() => setIsCreating(true)}
                className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                Create a plan
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {plans.map(plan => {
                const statusConfig = PLAN_STATUS_CONFIG[plan.status];
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full p-3 text-left rounded-lg transition-colors ${
                      selectedPlan?.id === plan.id
                        ? 'bg-blue-600/20 border border-blue-500/50'
                        : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-gray-200 truncate">{plan.title}</h3>
                      <span className={`text-2xs px-1.5 py-0.5 rounded bg-${statusConfig.color}-500/20 text-${statusConfig.color}-400`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {plan.steps.length} steps | {plan.steps.filter(s => s.status === 'COMPLETED').length} completed
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Plan detail */}
      <div className="flex-1 flex flex-col">
        {selectedPlan ? (
          <>
            {/* Plan header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-200">{selectedPlan.title}</h2>
                  {selectedPlan.goal && (
                    <p className="text-sm text-gray-400 mt-1">{selectedPlan.goal}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedPlan.status === 'READY' && (
                    <button
                      onClick={handleExecute}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                      Execute
                    </button>
                  )}
                  {selectedPlan.status === 'EXECUTING' && (
                    <button
                      onClick={() => handlePlanAction('pause')}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg"
                    >
                      Pause
                    </button>
                  )}
                  {selectedPlan.status === 'PAUSED' && (
                    <button
                      onClick={handleExecute}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg"
                    >
                      Resume
                    </button>
                  )}
                  {['PLANNING', 'READY', 'EXECUTING', 'PAUSED'].includes(selectedPlan.status) && (
                    <button
                      onClick={() => handlePlanAction('cancel')}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
                    >
                      Cancel
                    </button>
                  )}
                  {onClose && (
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-200">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Mermaid diagram */}
            <div className="p-4 border-b border-gray-700 bg-gray-850">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Plan Visualization</h3>
              <div
                ref={diagramRef}
                className="min-h-[200px] flex items-center justify-center bg-gray-900 rounded-lg p-4 overflow-auto"
              >
                <span className="text-gray-500">Loading diagram...</span>
              </div>
            </div>

            {/* Steps list */}
            <div className="flex-1 overflow-auto p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Steps</h3>
              <div className="space-y-3">
                {selectedPlan.steps.map((step, index) => (
                  <StepCard key={step.id} step={step} index={index} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <p>Select a plan to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Create plan modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-200">Create Plan</h3>
              <button onClick={() => setIsCreating(false)} className="p-2 text-gray-400 hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="p-4 space-y-4 max-h-[60vh] overflow-auto">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Plan Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g., Implement User Authentication"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Goal</label>
                  <textarea
                    value={formData.goal}
                    onChange={(e) => setFormData(f => ({ ...f, goal: e.target.value }))}
                    placeholder="What should this plan accomplish?"
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-300">Steps</label>
                    <button
                      type="button"
                      onClick={addStep}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      + Add Step
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.steps.map((step, index) => (
                      <div key={index} className="p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">Step {index + 1}</span>
                          {formData.steps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeStep(index)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const steps = [...formData.steps];
                            steps[index].title = e.target.value;
                            setFormData(f => ({ ...f, steps }));
                          }}
                          placeholder="Step title"
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 mb-2"
                        />
                        <input
                          type="text"
                          value={step.command}
                          onChange={(e) => {
                            const steps = [...formData.steps];
                            steps[index].command = e.target.value;
                            setFormData(f => ({ ...f, steps }));
                          }}
                          placeholder="Command (optional)"
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 font-mono text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
