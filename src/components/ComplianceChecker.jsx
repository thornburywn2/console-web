/**
 * Compliance Checker Component
 * Display and manage project compliance status
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect } from 'react';
import { projectTemplatesApi } from '../services/api.js';

// Status colors and labels
const STATUS_CONFIG = {
  good: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/30',
    text: 'text-green-400',
    label: 'Compliant',
    icon: '✓'
  },
  warning: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    label: 'Partial',
    icon: '⚠'
  },
  critical: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    text: 'text-red-400',
    label: 'Non-Compliant',
    icon: '✗'
  }
};

export default function ComplianceChecker({ projectPath, projectName, isOpen, onClose, onMigrate }) {
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState(null);
  const [migrateOptions, setMigrateOptions] = useState({
    force: false,
    skipHooks: false
  });

  useEffect(() => {
    if (isOpen && projectPath) {
      checkCompliance();
    }
  }, [isOpen, projectPath]);

  const checkCompliance = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await projectTemplatesApi.checkPath(projectPath);
      setCompliance(data);
    } catch (err) {
      const message = err.getUserMessage?.() || err.message || 'Failed to check compliance';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    try {
      setMigrating(true);
      setError(null);

      const data = await projectTemplatesApi.migrate(projectPath, migrateOptions);

      // Refresh compliance after migration
      await checkCompliance();

      if (onMigrate) {
        onMigrate(data);
      }
    } catch (err) {
      const message = err.getUserMessage?.() || err.message || 'Failed to migrate project';
      setError(message);
    } finally {
      setMigrating(false);
    }
  };

  if (!isOpen) return null;

  const statusConfig = compliance ? STATUS_CONFIG[compliance.status] : STATUS_CONFIG.critical;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-gray-900/95 border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">Compliance Check</h2>
            <p className="text-sm text-gray-400 mt-1">{projectName || projectPath}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400">
              {error}
            </div>
          ) : compliance && (
            <div className="space-y-6">
              {/* Score Card */}
              <div className={`p-6 rounded-xl ${statusConfig.bg} border ${statusConfig.border}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className={`text-4xl font-bold ${statusConfig.text}`}>
                        {compliance.complianceScore}%
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                        {statusConfig.icon} {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-gray-400 mt-2">
                      {compliance.present?.length || 0} of {(compliance.present?.length || 0) + (compliance.missing?.length || 0)} enforcement files present
                    </p>
                  </div>
                  <div className="relative w-24 h-24">
                    <svg className="transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-gray-700"
                        strokeWidth="3"
                        fill="none"
                        stroke="currentColor"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={statusConfig.text}
                        strokeWidth="3"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray={`${compliance.complianceScore}, 100`}
                        strokeLinecap="round"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Missing Files */}
              {compliance.missing?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <span className="text-red-400">✗</span>
                    Missing Files ({compliance.missing.length})
                  </h3>
                  <div className="space-y-2">
                    {compliance.missing.map((file, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <code className="text-sm text-red-300">{file}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Present Files */}
              {compliance.present?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Present Files ({compliance.present.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {compliance.present.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                        <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <code className="text-xs text-green-300 truncate">{file}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outdated Files */}
              {compliance.outdated?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <span className="text-yellow-400">⚠</span>
                    Outdated Files ({compliance.outdated.length})
                  </h3>
                  <div className="space-y-2">
                    {compliance.outdated.map((file, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <code className="text-sm text-yellow-300">{file}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Migration Options */}
              {compliance.missing?.length > 0 && (
                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Migration Options</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700 cursor-pointer hover:bg-gray-800">
                      <input
                        type="checkbox"
                        checked={migrateOptions.force}
                        onChange={(e) => setMigrateOptions(prev => ({ ...prev, force: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-white text-sm font-medium">Force overwrite existing files</span>
                        <p className="text-xs text-gray-400">Replace present files with template versions</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700 cursor-pointer hover:bg-gray-800">
                      <input
                        type="checkbox"
                        checked={migrateOptions.skipHooks}
                        onChange={(e) => setMigrateOptions(prev => ({ ...prev, skipHooks: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-white text-sm font-medium">Skip Git hooks installation</span>
                        <p className="text-xs text-gray-400">Don't run husky install after migration</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={checkCompliance}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>

            {compliance?.missing?.length > 0 && (
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {migrating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Missing Files
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Compliance Badge for use in project lists
 */
export function ComplianceBadge({ score, status, onClick }) {
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.critical;

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
        ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}
        hover:opacity-80 transition-opacity cursor-pointer
      `}
      title={`Compliance: ${score}% - Click to view details`}
    >
      <span>{statusConfig.icon}</span>
      <span>{score}%</span>
    </button>
  );
}
