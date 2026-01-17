/**
 * CreatePlanModal Component
 * Modal for creating new plans with steps
 */

import { useState } from 'react';

export default function CreatePlanModal({ onClose, onCreate, projectId, sessionId }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal: '',
    steps: [{ title: '', description: '', command: '' }]
  });
  const [error, setError] = useState(null);

  const addStep = () => {
    setFormData(f => ({
      ...f,
      steps: [...f.steps, { title: '', description: '', command: '' }]
    }));
  };

  const removeStep = (index) => {
    setFormData(f => ({
      ...f,
      steps: f.steps.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
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
        onCreate(plan);
      } else {
        const data = await response.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create plan');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-200">Create Plan</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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
              onClick={onClose}
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
  );
}
