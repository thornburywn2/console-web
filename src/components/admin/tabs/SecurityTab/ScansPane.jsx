/**
 * ScansPane Component
 * Security scanning dashboard wrapper
 */

import SecurityDashboard from '../../../SecurityDashboard';

export function ScansPane({ selectedProject }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <SecurityDashboard selectedProject={selectedProject} />
    </div>
  );
}

export default ScansPane;
