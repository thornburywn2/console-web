/**
 * ScanConfigPane Component
 * Security scan configuration placeholder
 * Note: Full scan configuration APIs not yet implemented
 */

export function ScanConfigPane() {
  return (
    <div className="space-y-6">
      {/* Feature Status */}
      <div className="hacker-card p-6 text-center border-hacker-purple/30">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-semibold text-hacker-purple mb-2">
          SCAN CONFIGURATION
        </h3>
        <p className="text-sm text-hacker-text-dim mb-4">
          Advanced security scan configuration is coming in a future release.
        </p>
        <p className="text-xs text-hacker-text-dim font-mono">
          For now, use the SCANS tab to run security scans with lifecycle agents.
        </p>
      </div>

      {/* Current Capabilities */}
      <div className="hacker-card">
        <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider">
          CURRENT CAPABILITIES
        </h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-hacker-surface rounded border border-hacker-border">
            <span className="w-2 h-2 rounded-full bg-hacker-green" />
            <div>
              <div className="text-sm font-mono text-hacker-text">Security Dashboard</div>
              <div className="text-xs text-hacker-text-dim">View scan results and vulnerability reports</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-hacker-surface rounded border border-hacker-border">
            <span className="w-2 h-2 rounded-full bg-hacker-green" />
            <div>
              <div className="text-sm font-mono text-hacker-text">Lifecycle Agent Scans</div>
              <div className="text-xs text-hacker-text-dim">Run AGENT-018-SECURITY.sh for comprehensive scanning</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-hacker-surface rounded border border-hacker-border">
            <span className="w-2 h-2 rounded-full bg-hacker-green" />
            <div>
              <div className="text-sm font-mono text-hacker-text">Fail2ban Management</div>
              <div className="text-xs text-hacker-text-dim">Monitor and manage banned IPs via Fail2ban tab</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-hacker-surface rounded border border-hacker-border">
            <span className="w-2 h-2 rounded-full bg-hacker-green" />
            <div>
              <div className="text-sm font-mono text-hacker-text">Firewall Rules</div>
              <div className="text-xs text-hacker-text-dim">Configure UFW firewall via Firewall tab</div>
            </div>
          </div>
        </div>
      </div>

      {/* Planned Features */}
      <div className="hacker-card">
        <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider">
          PLANNED FEATURES
        </h4>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-hacker-surface rounded border border-hacker-warning/20">
            <span className="w-2 h-2 rounded-full bg-hacker-warning" />
            <div className="text-sm font-mono text-hacker-text-dim">
              Auto-scan on git commit
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-hacker-surface rounded border border-hacker-warning/20">
            <span className="w-2 h-2 rounded-full bg-hacker-warning" />
            <div className="text-sm font-mono text-hacker-text-dim">
              Configurable scan depth (quick/standard/thorough)
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-hacker-surface rounded border border-hacker-warning/20">
            <span className="w-2 h-2 rounded-full bg-hacker-warning" />
            <div className="text-sm font-mono text-hacker-text-dim">
              Email notifications for critical vulnerabilities
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-hacker-surface rounded border border-hacker-warning/20">
            <span className="w-2 h-2 rounded-full bg-hacker-warning" />
            <div className="text-sm font-mono text-hacker-text-dim">
              Scan queue management
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScanConfigPane;
