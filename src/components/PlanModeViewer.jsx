/**
 * PlanModeViewer Component
 * AI planning visualization with Mermaid diagrams and step tracking
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { plansApi } from '../services/api.js';
import {
  PLAN_STATUS_CONFIG,
  StepCard,
  CreatePlanModal,
  PlanListItem,
} from './plan-mode-viewer';

export default function PlanModeViewer({ projectId, sessionId, onClose }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [mermaidDiagram, setMermaidDiagram] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const diagramRef = useRef(null);

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    try {
      const data = await plansApi.list({ projectId, sessionId });
      setPlans(data.plans);
    } catch (err) {
      console.error('Error fetching plans:', err.getUserMessage?.() || err.message);
    }
  }, [projectId, sessionId]);

  // Fetch diagram for selected plan
  const fetchDiagram = useCallback(async (planId) => {
    try {
      const data = await plansApi.getDiagram(planId);
      setMermaidDiagram(data.diagram);
      renderMermaid(data.diagram);
    } catch (err) {
      console.error('Error fetching diagram:', err.getUserMessage?.() || err.message);
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

  // Update step status
  const updateStepStatus = async (stepId, status) => {
    if (!selectedPlan) return;

    try {
      await plansApi.updateStep(selectedPlan.id, stepId, { status });

      // Refresh plan
      const plan = await plansApi.get(selectedPlan.id);
      setSelectedPlan(plan);
      fetchDiagram(plan.id);
    } catch (err) {
      console.error('Error updating step:', err.getUserMessage?.() || err.message);
    }
  };

  // Execute plan
  const handleExecute = async () => {
    if (!selectedPlan) return;

    try {
      const plan = await plansApi.execute(selectedPlan.id);
      setSelectedPlan(plan);
      fetchPlans();
      fetchDiagram(plan.id);
    } catch (err) {
      console.error('Error executing plan:', err.getUserMessage?.() || err.message);
    }
  };

  // Pause/cancel plan
  const handlePlanAction = async (action) => {
    if (!selectedPlan) return;

    try {
      const plan = await plansApi.action(selectedPlan.id, action);
      setSelectedPlan(plan);
      fetchPlans();
    } catch (err) {
      console.error(`Error ${action} plan:`, err.getUserMessage?.() || err.message);
    }
  };

  // Handle plan creation
  const handlePlanCreated = (plan) => {
    setIsCreating(false);
    fetchPlans();
    setSelectedPlan(plan);
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
              {plans.map(plan => (
                <PlanListItem
                  key={plan.id}
                  plan={plan}
                  isSelected={selectedPlan?.id === plan.id}
                  onClick={() => setSelectedPlan(plan)}
                />
              ))}
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
                {selectedPlan.steps.map((step) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    onUpdateStatus={updateStepStatus}
                  />
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
        <CreatePlanModal
          projectId={projectId}
          sessionId={sessionId}
          onClose={() => setIsCreating(false)}
          onCreate={handlePlanCreated}
        />
      )}
    </div>
  );
}
