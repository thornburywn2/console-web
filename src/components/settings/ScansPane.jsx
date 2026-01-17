/**
 * ScansPane Component
 * Security & Quality scan settings management
 */

export default function ScansPane({
  generalSettings,
  scanQueueStatus,
  scanRecommendations,
  onSave,
  onReloadSettings,
  onCancelScans,
  setSuccess,
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">Security & Quality Scan Settings</h4>
        {scanQueueStatus && (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${scanQueueStatus.activeScans > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-xs text-hacker-text-dim">
              {scanQueueStatus.activeScans > 0 ? `${scanQueueStatus.activeScans} scan(s) running` : 'Idle'}
              {scanQueueStatus.queueLength > 0 && `, ${scanQueueStatus.queueLength} queued`}
            </span>
          </div>
        )}
      </div>
      <p className="text-xs text-hacker-text-dim">
        Configure resource limits to prevent system overload during security and quality scans.
        These scans can be CPU/memory intensive - adjust based on your system specs.
      </p>

      {/* System Recommendations */}
      {scanRecommendations && scanRecommendations.systemSpecs && (
        <div className="p-4 rounded bg-[var(--bg-surface)] border border-hacker-cyan/30 space-y-3">
          <h5 className="text-xs font-mono text-hacker-cyan uppercase">System Analysis</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-hacker-text-dim">Total Memory:</span>{' '}
              <span className="text-hacker-green">{Math.round(scanRecommendations.systemSpecs.totalMemoryMb / 1024)} GB</span>
            </div>
            <div>
              <span className="text-hacker-text-dim">CPU Cores:</span>{' '}
              <span className="text-hacker-green">{scanRecommendations.systemSpecs.cpuCores}</span>
            </div>
          </div>
          {scanRecommendations.notes && (
            <div className="mt-2 space-y-1">
              {scanRecommendations.notes.slice(0, 3).map((note, i) => (
                <p key={i} className="text-xs text-hacker-text-dim">• {note}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scan Feature Toggles */}
      <div className="space-y-4">
        <h5 className="text-xs font-mono text-hacker-purple uppercase">Scan Toggles</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generalSettings?.enableSecurityScans ?? true}
                onChange={(e) => onSave({ enableSecurityScans: e.target.checked })}
                className="checkbox-glass"
              />
              <span className="text-sm text-hacker-text">Enable Security Scans (AGENT-018)</span>
            </label>
            <p className="text-xs text-hacker-text-dim ml-7">Vulnerability detection, secrets scanning, SAST analysis</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generalSettings?.enableQualityScans ?? true}
                onChange={(e) => onSave({ enableQualityScans: e.target.checked })}
                className="checkbox-glass"
              />
              <span className="text-sm text-hacker-text">Enable Quality Scans (AGENT-019)</span>
            </label>
            <p className="text-xs text-hacker-text-dim ml-7">Tests, coverage analysis, code quality checks</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generalSettings?.enablePrePushPipeline ?? true}
                onChange={(e) => onSave({ enablePrePushPipeline: e.target.checked })}
                className="checkbox-glass"
              />
              <span className="text-sm text-hacker-text">Run Scans Before GitHub Push</span>
            </label>
            <p className="text-xs text-hacker-text-dim ml-7">Automatically run security/quality checks before pushing</p>
          </div>
        </div>
      </div>

      {/* Heavy Operations (Skip Toggles) */}
      <div className="space-y-4">
        <h5 className="text-xs font-mono text-hacker-purple uppercase">Heavy Operations (Skip to Save Resources)</h5>
        <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-xs text-yellow-400">
            These operations are resource-intensive. Enable skipping to reduce CPU/memory usage during scans.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generalSettings?.skipContainerScan ?? true}
                onChange={(e) => onSave({ skipContainerScan: e.target.checked })}
                className="checkbox-glass"
              />
              <span className="text-sm text-hacker-text">Skip Container Scan (Trivy)</span>
            </label>
            <p className="text-xs text-hacker-text-dim ml-7">Builds Docker image then scans - VERY heavy</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generalSettings?.skipSastScan ?? false}
                onChange={(e) => onSave({ skipSastScan: e.target.checked })}
                className="checkbox-glass"
              />
              <span className="text-sm text-hacker-text">Skip SAST Scan (Semgrep)</span>
            </label>
            <p className="text-xs text-hacker-text-dim ml-7">Static code analysis - high CPU usage on large codebases</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generalSettings?.skipE2eTests ?? true}
                onChange={(e) => onSave({ skipE2eTests: e.target.checked })}
                className="checkbox-glass"
              />
              <span className="text-sm text-hacker-text">Skip E2E Tests (Playwright/Cypress)</span>
            </label>
            <p className="text-xs text-hacker-text-dim ml-7">Spawns browser instances - very memory intensive</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generalSettings?.skipCoverageReport ?? false}
                onChange={(e) => onSave({ skipCoverageReport: e.target.checked })}
                className="checkbox-glass"
              />
              <span className="text-sm text-hacker-text">Skip Coverage Report</span>
            </label>
            <p className="text-xs text-hacker-text-dim ml-7">Code coverage analysis during tests</p>
          </div>
        </div>
      </div>

      {/* Resource Limits */}
      <div className="space-y-4">
        <h5 className="text-xs font-mono text-hacker-purple uppercase">Resource Limits</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-hacker-text">Scan Concurrency</label>
            <input
              type="number"
              value={generalSettings?.scanConcurrency ?? 1}
              onChange={(e) => onSave({ scanConcurrency: parseInt(e.target.value) || 1 })}
              min={1}
              max={4}
              className="input-glass font-mono"
            />
            <p className="text-xs text-hacker-text-dim">Max parallel scans (1 = sequential, safest)</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-hacker-text">Memory Limit (MB)</label>
            <input
              type="number"
              value={generalSettings?.scanMemoryLimitMb ?? 2048}
              onChange={(e) => onSave({ scanMemoryLimitMb: parseInt(e.target.value) || 2048 })}
              min={512}
              max={16384}
              step={256}
              className="input-glass font-mono"
            />
            <p className="text-xs text-hacker-text-dim">
              Max memory per scan
              {scanRecommendations?.recommended?.scanMemoryLimitMb && (
                <span className="text-hacker-cyan"> (recommended: {scanRecommendations.recommended.scanMemoryLimitMb}MB)</span>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-hacker-text">Timeout (seconds)</label>
            <input
              type="number"
              value={generalSettings?.scanTimeoutSeconds ?? 600}
              onChange={(e) => onSave({ scanTimeoutSeconds: parseInt(e.target.value) || 600 })}
              min={60}
              max={3600}
              step={60}
              className="input-glass font-mono"
            />
            <p className="text-xs text-hacker-text-dim">Max time per scan before timeout</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-hacker-text">Nice Level (CPU Priority)</label>
            <input
              type="number"
              value={generalSettings?.scanNiceLevel ?? 15}
              onChange={(e) => onSave({ scanNiceLevel: parseInt(e.target.value) || 15 })}
              min={0}
              max={19}
              className="input-glass font-mono"
            />
            <p className="text-xs text-hacker-text-dim">0 = normal, 19 = lowest priority</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-hacker-text">I/O Priority Class</label>
            <select
              value={generalSettings?.scanIoniceClass ?? 3}
              onChange={(e) => onSave({ scanIoniceClass: parseInt(e.target.value) })}
              className="input-glass font-mono"
            >
              <option value={0}>0 - None (no I/O priority)</option>
              <option value={1}>1 - Realtime (highest)</option>
              <option value={2}>2 - Best Effort (normal)</option>
              <option value={3}>3 - Idle (only when system idle)</option>
            </select>
            <p className="text-xs text-hacker-text-dim">ionice class for disk I/O</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-hacker-text">CPU Limit (%)</label>
            <input
              type="number"
              value={generalSettings?.scanCpuLimit ?? 50}
              onChange={(e) => onSave({ scanCpuLimit: parseInt(e.target.value) || 50 })}
              min={10}
              max={100}
              step={10}
              className="input-glass font-mono"
            />
            <p className="text-xs text-hacker-text-dim">Max CPU % per scan (requires cpulimit)</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4 pt-4 border-t border-hacker-green/20">
        <h5 className="text-xs font-mono text-hacker-purple uppercase">Quick Actions</h5>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onReloadSettings}
            className="px-4 py-2 text-sm font-mono border border-hacker-green rounded text-hacker-green hover:bg-hacker-green/10"
          >
            [RELOAD SETTINGS]
          </button>

          <button
            onClick={onCancelScans}
            disabled={!scanQueueStatus || scanQueueStatus.queueLength === 0}
            className="px-4 py-2 text-sm font-mono border border-hacker-warning rounded text-hacker-warning hover:bg-hacker-warning/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            [CANCEL QUEUED SCANS]
          </button>

          {scanRecommendations?.recommended && (
            <button
              onClick={() => {
                if (confirm('Apply recommended settings based on your system specs?')) {
                  onSave(scanRecommendations.recommended);
                }
              }}
              className="px-4 py-2 text-sm font-mono border border-hacker-cyan rounded text-hacker-cyan hover:bg-hacker-cyan/10"
            >
              [APPLY RECOMMENDED]
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
