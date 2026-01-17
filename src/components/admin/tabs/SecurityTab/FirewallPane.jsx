/**
 * FirewallPane Component
 * UFW firewall management
 */

import { useState, useEffect, useCallback } from 'react';

export function FirewallPane() {
  const [firewallStatus, setFirewallStatus] = useState(null);
  const [firewallRules, setFirewallRules] = useState([]);
  const [firewallApps, setFirewallApps] = useState([]);
  const [firewallLogs, setFirewallLogs] = useState([]);
  const [projectPorts, setProjectPorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [syncingPorts, setSyncingPorts] = useState(false);
  const [newRule, setNewRule] = useState({ action: 'allow', port: '', protocol: 'tcp', from: 'any', comment: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchFirewallStatus = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, logsRes, portsRes] = await Promise.all([
        fetch('/api/admin-users/firewall/status'),
        fetch('/api/admin-users/firewall/logs'),
        fetch('/api/admin-users/firewall/project-ports')
      ]);

      if (statusRes.ok) {
        const data = await statusRes.json();
        setFirewallStatus(data.status);
        setFirewallRules(data.rules || []);
        setFirewallApps(data.apps || []);
      }
      if (logsRes.ok) {
        const data = await logsRes.json();
        setFirewallLogs(data.logs || []);
      }
      if (portsRes.ok) {
        const data = await portsRes.json();
        setProjectPorts(data.ports || []);
      }
    } catch (err) {
      console.error('Error fetching firewall status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFirewall = useCallback(async (enable) => {
    try {
      setLoading(true);
      const endpoint = enable ? '/api/admin-users/firewall/enable' : '/api/admin-users/firewall/disable';
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to toggle firewall');
      fetchFirewallStatus();
      setSuccess(`Firewall ${enable ? 'enabled' : 'disabled'}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFirewallStatus]);

  const addFirewallRule = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin-users/firewall/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchFirewallStatus();
      setShowAddRule(false);
      setNewRule({ action: 'allow', port: '', protocol: 'tcp', from: 'any', comment: '' });
      setSuccess('Rule added successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [newRule, fetchFirewallStatus]);

  const deleteFirewallRule = useCallback(async (ruleNumber) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/admin-users/firewall/rules/${ruleNumber}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        if (data.protected) {
          throw new Error('SSH rules cannot be deleted - SSH access is protected');
        }
        throw new Error(data.error || 'Failed to delete rule');
      }
      fetchFirewallStatus();
      setSuccess('Rule deleted');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFirewallStatus]);

  const syncProjectPorts = useCallback(async () => {
    try {
      setSyncingPorts(true);
      setError('');
      const res = await fetch('/api/admin-users/firewall/sync-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { summary } = data;
      setSuccess(`Firewall synced! SSH: ${summary.sshStatus}, Added: ${summary.portsAdded} ports, Skipped: ${summary.portsSkipped} (already exist)`);
      fetchFirewallStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncingPorts(false);
    }
  }, [fetchFirewallStatus]);

  // Helper to check if a rule is SSH (protected)
  const isSSHRule = (rule) => {
    const port = (rule.port || '').toString().toLowerCase();
    return port.includes('22') || port.includes('ssh') || port === 'openssh';
  };

  useEffect(() => {
    fetchFirewallStatus();
  }, [fetchFirewallStatus]);

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="p-3 rounded-lg bg-hacker-error/10 border border-hacker-error/30 text-hacker-error text-sm font-mono flex items-center justify-between">
          <span>[ERROR] {error}</span>
          <button onClick={() => setError('')} className="hover:text-hacker-text">&#10005;</button>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-hacker-green/10 border border-hacker-green/30 text-hacker-green text-sm font-mono flex items-center justify-between">
          <span>[SUCCESS] {success}</span>
          <button onClick={() => setSuccess('')} className="hover:text-hacker-text">&#10005;</button>
        </div>
      )}

      {/* Firewall Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="hacker-card text-center">
          <div className={`stat-value ${firewallStatus?.active ? 'text-hacker-green' : 'text-hacker-error'}`}>
            {firewallStatus?.active ? 'ACTIVE' : 'INACTIVE'}
          </div>
          <div className="stat-label">STATUS</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-cyan">{firewallRules.length}</div>
          <div className="stat-label">RULES</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-purple">{projectPorts.length}</div>
          <div className="stat-label">PROJECT PORTS</div>
        </div>
        <div className="hacker-card text-center">
          <button
            onClick={() => toggleFirewall(!firewallStatus?.active)}
            disabled={loading}
            className={`hacker-btn w-full h-full text-xs ${
              firewallStatus?.active
                ? 'border-hacker-error/30 text-hacker-error'
                : 'border-hacker-green/30 text-hacker-green'
            }`}
          >
            {firewallStatus?.active ? 'DISABLE' : 'ENABLE'}
          </button>
        </div>
      </div>

      {/* Rules Management */}
      <div className="hacker-card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-hacker-error uppercase tracking-wider">
            FIREWALL RULES
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={syncProjectPorts}
              disabled={syncingPorts}
              className="hacker-btn text-xs border-hacker-purple/30 text-hacker-purple"
            >
              {syncingPorts ? 'SYNCING...' : 'SYNC PROJECTS'}
            </button>
            <button
              onClick={() => setShowAddRule(true)}
              className="hacker-btn text-xs bg-hacker-green/10 border-hacker-green/30 text-hacker-green"
            >
              + ADD RULE
            </button>
            <button
              onClick={fetchFirewallStatus}
              disabled={loading}
              className="hacker-btn text-xs"
            >
              {loading ? '...' : 'REFRESH'}
            </button>
          </div>
        </div>

        {/* Add Rule Form */}
        {showAddRule && (
          <div className="mb-4 p-4 bg-hacker-surface rounded border border-hacker-green/30">
            <div className="grid grid-cols-5 gap-3">
              <select
                value={newRule.action}
                onChange={(e) => setNewRule(r => ({ ...r, action: e.target.value }))}
                className="input-glass text-sm"
              >
                <option value="allow">ALLOW</option>
                <option value="deny">DENY</option>
              </select>
              <input
                type="text"
                placeholder="Port (e.g., 80, 443)"
                value={newRule.port}
                onChange={(e) => setNewRule(r => ({ ...r, port: e.target.value }))}
                className="input-glass text-sm"
              />
              <select
                value={newRule.protocol}
                onChange={(e) => setNewRule(r => ({ ...r, protocol: e.target.value }))}
                className="input-glass text-sm"
              >
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
                <option value="both">Both</option>
              </select>
              <input
                type="text"
                placeholder="From (any or IP)"
                value={newRule.from}
                onChange={(e) => setNewRule(r => ({ ...r, from: e.target.value }))}
                className="input-glass text-sm"
              />
              <input
                type="text"
                placeholder="Comment"
                value={newRule.comment}
                onChange={(e) => setNewRule(r => ({ ...r, comment: e.target.value }))}
                className="input-glass text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setShowAddRule(false)}
                className="hacker-btn text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={addFirewallRule}
                disabled={loading || !newRule.port}
                className="hacker-btn text-xs bg-hacker-green/10 border-hacker-green/30 text-hacker-green"
              >
                ADD RULE
              </button>
            </div>
          </div>
        )}

        {/* Rules List */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {firewallRules.length === 0 ? (
            <p className="text-xs text-hacker-text-dim font-mono">No firewall rules configured</p>
          ) : (
            firewallRules.map((rule, idx) => {
              const isSSH = isSSHRule(rule);
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 bg-hacker-surface rounded border ${
                    isSSH ? 'border-hacker-warning/30' : 'border-hacker-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`hacker-badge text-[10px] ${
                      rule.action === 'ALLOW' ? 'hacker-badge-green' : 'hacker-badge-error'
                    }`}>
                      {rule.action}
                    </span>
                    <span className="font-mono text-sm text-hacker-cyan">{rule.port}</span>
                    <span className="text-xs text-hacker-text-dim">{rule.protocol}</span>
                    {rule.from && rule.from !== 'Anywhere' && (
                      <span className="text-xs text-hacker-purple">from {rule.from}</span>
                    )}
                    {isSSH && (
                      <span className="hacker-badge text-[9px] hacker-badge-warning">SSH PROTECTED</span>
                    )}
                    {rule.comment && (
                      <span className="text-xs text-hacker-text-dim">// {rule.comment}</span>
                    )}
                  </div>
                  {!isSSH && (
                    <button
                      onClick={() => {
                        if (confirm('Delete this firewall rule?')) deleteFirewallRule(rule.number);
                      }}
                      className="hacker-btn text-[10px] px-2 py-0.5 border-hacker-error/30 text-hacker-error"
                    >
                      DELETE
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Firewall Logs */}
      {firewallLogs.length > 0 && (
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider">
            RECENT FIREWALL LOGS
          </h4>
          <div className="bg-black/50 rounded p-3 max-h-60 overflow-y-auto font-mono text-[10px]">
            {firewallLogs.slice(0, 20).map((log, idx) => (
              <div key={idx} className="text-hacker-text-dim py-0.5 hover:text-hacker-text">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Ports */}
      {projectPorts.length > 0 && (
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
            PROJECT PORTS [{projectPorts.length}]
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {projectPorts.map((port, idx) => (
              <div key={idx} className="p-2 bg-hacker-surface rounded border border-hacker-border text-xs font-mono">
                <div className="text-hacker-cyan">{port.port}</div>
                <div className="text-hacker-text-dim truncate">{port.project || port.service}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FirewallPane;
