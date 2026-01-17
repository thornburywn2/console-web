/**
 * Stack Status Summary Cards
 */

export function StackStatusCards({ stackStatus }) {
  if (!stackStatus) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="hacker-card text-center">
        <div className="stat-value">{stackStatus.total || 3}</div>
        <div className="stat-label">TOTAL SERVICES</div>
      </div>
      <div className="hacker-card text-center">
        <div className="stat-value text-hacker-green">{stackStatus.running || 0}</div>
        <div className="stat-label">RUNNING</div>
      </div>
      <div className="hacker-card text-center">
        <div className={`stat-value ${stackStatus.healthy ? 'text-hacker-green' : 'text-hacker-error'}`}>
          {stackStatus.healthy ? 'YES' : 'NO'}
        </div>
        <div className="stat-label">HEALTHY</div>
      </div>
      <div className="hacker-card text-center">
        <div className={`stat-value ${stackStatus.configured ? 'text-hacker-green' : 'text-hacker-warning'}`}>
          {stackStatus.configured ? 'YES' : 'NO'}
        </div>
        <div className="stat-label">CONFIGURED</div>
      </div>
    </div>
  );
}
