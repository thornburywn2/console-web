/**
 * PlanListItem Component
 * Displays a plan in the sidebar list
 */

import { PLAN_STATUS_CONFIG } from './constants';

export default function PlanListItem({ plan, isSelected, onClick }) {
  const statusConfig = PLAN_STATUS_CONFIG[plan.status];

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 text-left rounded-lg transition-colors ${
        isSelected
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
}
