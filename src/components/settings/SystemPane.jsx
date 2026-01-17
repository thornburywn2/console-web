/**
 * SystemPane Component
 * System info, software updates, and server configuration
 */

import { useRef, useEffect } from 'react';

export default function SystemPane({
  serverConfig,
  versionInfo,
  updateInProgress,
  updateLogs,
  showUpdateModal,
  setShowUpdateModal,
  onTriggerUpdate,
  onRefreshVersion,
}) {
  const updateLogsEndRef = useRef(null);

  // Auto-scroll update logs
  useEffect(() => {
    if (updateLogsEndRef.current) {
      updateLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [updateLogs]);

  if (!serverConfig) return null;

  return (
    <>
      <div className="space-y-6">
        {/* Software Updates Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-hacker-green uppercase tracking-wider flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Software Updates
          </h4>

          <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-hacker-green/30">
            {versionInfo ? (
              <div className="space-y-4">
                {/* Error Message */}
                {versionInfo.error && (
                  <div className="p-3 rounded-lg bg-hacker-warning/10 border border-hacker-warning/30">
                    <div className="flex items-center gap-2 text-hacker-warning text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{versionInfo.error}</span>
                    </div>
                    <p className="text-xs text-hacker-text-dim mt-2">
                      Run manually: <code className="bg-black/30 px-1 rounded">git pull && npm install --include=dev && npm run build && pm2 restart console-web</code>
                    </p>
                  </div>
                )}

                {/* Current Version Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-mono text-hacker-green">v{versionInfo.version}</span>
                      <span className="px-2 py-0.5 text-xs font-mono bg-hacker-purple/20 text-hacker-purple rounded">
                        {versionInfo.branch}
                      </span>
                      <code className="text-xs text-hacker-text-dim">{versionInfo.commit}</code>
                    </div>
                    {versionInfo.lastCommitDate && (
                      <p className="text-xs text-hacker-text-dim mt-1">
                        Last commit: {new Date(versionInfo.lastCommitDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Update Available Badge */}
                  {versionInfo.hasUpdates && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-hacker-cyan/20 border border-hacker-cyan/50 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-hacker-cyan animate-pulse" />
                      <span className="text-sm font-mono text-hacker-cyan">
                        {versionInfo.behindBy} update{versionInfo.behindBy > 1 ? 's' : ''} available
                      </span>
                    </div>
                  )}
                </div>

                {/* Update Button */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={onTriggerUpdate}
                    disabled={updateInProgress || versionInfo.error}
                    className={`px-6 py-2.5 text-sm font-mono rounded-lg transition-all flex items-center gap-2 ${
                      versionInfo.hasUpdates
                        ? 'bg-hacker-cyan text-black hover:bg-hacker-cyan/90'
                        : 'border border-hacker-green text-hacker-green hover:bg-hacker-green/10'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {updateInProgress ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Updating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {versionInfo.hasUpdates ? 'Install Updates' : 'Check & Update'}
                      </>
                    )}
                  </button>

                  <button
                    onClick={onRefreshVersion}
                    className="px-3 py-2 text-xs font-mono border border-hacker-text-dim/30 rounded text-hacker-text-dim hover:text-hacker-text hover:border-hacker-text-dim/50"
                  >
                    [REFRESH]
                  </button>

                  {updateLogs.length > 0 && !showUpdateModal && (
                    <button
                      onClick={() => setShowUpdateModal(true)}
                      className="text-xs text-hacker-cyan hover:text-hacker-green"
                    >
                      [VIEW LOGS]
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-hacker-green border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* Server Configuration (Read-Only) */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">Server Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded bg-[var(--bg-surface)] border border-hacker-green/20">
              <span className="text-hacker-text-dim">Projects Directory:</span>
              <code className="ml-2 text-hacker-green">{serverConfig.projectsDir}</code>
            </div>
            <div className="p-3 rounded bg-[var(--bg-surface)] border border-hacker-green/20">
              <span className="text-hacker-text-dim">Port:</span>
              <code className="ml-2 text-hacker-green">{serverConfig.port}</code>
            </div>
            <div className="p-3 rounded bg-[var(--bg-surface)] border border-hacker-green/20">
              <span className="text-hacker-text-dim">Environment:</span>
              <code className="ml-2 text-hacker-green">{serverConfig.environment}</code>
            </div>
            <div className="p-3 rounded bg-[var(--bg-surface)] border border-hacker-green/20">
              <span className="text-hacker-text-dim">Auth Enabled:</span>
              <code className="ml-2 text-hacker-green">{serverConfig.authEnabled ? 'Yes' : 'No'}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] border border-hacker-green/30 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-hacker-green/20">
              <h3 className="text-sm font-mono text-hacker-green uppercase">Update Progress</h3>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="text-hacker-text-dim hover:text-hacker-text"
              >
                [CLOSE]
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 font-mono text-xs space-y-1 bg-black/30">
              {updateLogs.map((log, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 ${
                    log.status === 'error' ? 'text-red-400' :
                    log.status === 'complete' ? 'text-green-400' :
                    log.status === 'running' ? 'text-yellow-400' :
                    'text-hacker-text-dim'
                  }`}
                >
                  <span className="text-hacker-text-dim opacity-50">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="uppercase w-16">[{log.step}]</span>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))}
              <div ref={updateLogsEndRef} />
            </div>
            {!updateInProgress && updateLogs.some(l => l.status === 'complete') && (
              <div className="p-4 border-t border-hacker-green/20 text-center">
                <p className="text-sm text-hacker-cyan">Update complete! Page will refresh automatically...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
