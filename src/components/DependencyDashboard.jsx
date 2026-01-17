/**
 * Dependency Dashboard Component
 * View and manage project dependencies
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { dependenciesApi } from '../services/api.js';

const SEVERITY_COLORS = {
  critical: '#e74c3c',
  high: '#e67e22',
  moderate: '#f39c12',
  low: '#3498db',
  info: '#95a5a6',
};

const UPDATE_TYPES = {
  major: { color: '#e74c3c', label: 'Major' },
  minor: { color: '#f39c12', label: 'Minor' },
  patch: { color: '#2ecc71', label: 'Patch' },
};

function PackageCard({ pkg, onUpdate }) {
  const hasUpdate = pkg.latest !== pkg.current;
  const updateType = pkg.updateType;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Package info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-primary">{pkg.name}</span>
          {pkg.isDev && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">dev</span>
          )}
          {pkg.vulnerabilities > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(231, 76, 60, 0.2)', color: SEVERITY_COLORS.critical }}
            >
              {pkg.vulnerabilities} vuln
            </span>
          )}
        </div>
        <div className="text-xs text-muted mt-0.5 truncate">
          {pkg.description || 'No description'}
        </div>
      </div>

      {/* Version info */}
      <div className="text-right flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-secondary">{pkg.current}</span>
          {hasUpdate && (
            <>
              <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <span
                className="text-sm font-medium px-1.5 py-0.5 rounded"
                style={{
                  background: UPDATE_TYPES[updateType]?.color + '20',
                  color: UPDATE_TYPES[updateType]?.color,
                }}
              >
                {pkg.latest}
              </span>
            </>
          )}
        </div>
        {hasUpdate && (
          <button
            onClick={() => onUpdate(pkg.name, pkg.latest)}
            className="text-xs text-accent hover:underline mt-1"
          >
            Update to {pkg.latest}
          </button>
        )}
      </div>
    </div>
  );
}

function VulnerabilityCard({ vuln }) {
  return (
    <div
      className="p-3 rounded-lg"
      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded font-medium"
              style={{
                background: SEVERITY_COLORS[vuln.severity] + '20',
                color: SEVERITY_COLORS[vuln.severity],
              }}
            >
              {vuln.severity}
            </span>
            <span className="font-medium text-primary">{vuln.package}</span>
          </div>
          <p className="text-sm text-secondary mt-1">{vuln.title}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted">
            <span>via {vuln.via}</span>
            {vuln.fixAvailable && <span className="text-green-400">Fix available</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DependencyDashboard({ projectPath, isOpen, onClose, embedded = false }) {
  const [packages, setPackages] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, outdated, vulnerable
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('packages');

  const fetchDependencies = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      const data = await dependenciesApi.list(projectPath);
      setPackages(data.packages || []);
      setVulnerabilities(data.vulnerabilities || []);
    } catch (error) {
      console.error('Failed to fetch dependencies:', error);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    if (isOpen || embedded) {
      fetchDependencies();
    }
  }, [isOpen, embedded, fetchDependencies]);

  const handleUpdate = async (packageName, version) => {
    try {
      await dependenciesApi.update(projectPath, packageName);
      fetchDependencies();
    } catch (error) {
      console.error('Failed to update package:', error);
    }
  };

  const handleUpdateAll = async () => {
    if (!confirm('Update all outdated packages? This may cause breaking changes.')) return;
    try {
      await dependenciesApi.updateAll(projectPath);
      fetchDependencies();
    } catch (error) {
      console.error('Failed to update packages:', error);
    }
  };

  const handleAuditFix = async () => {
    try {
      await dependenciesApi.auditFix(projectPath);
      fetchDependencies();
    } catch (error) {
      console.error('Failed to fix vulnerabilities:', error);
    }
  };

  // Filter packages
  const filteredPackages = packages.filter(pkg => {
    if (search && !pkg.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'outdated' && pkg.current === pkg.latest) return false;
    if (filter === 'vulnerable' && pkg.vulnerabilities === 0) return false;
    return true;
  });

  const outdatedCount = packages.filter(p => p.current !== p.latest).length;
  const vulnerableCount = packages.filter(p => p.vulnerabilities > 0).length;

  if (!isOpen && !embedded) return null;

  // Show message when no project is selected
  if (!projectPath && embedded) {
    return (
      <div className="text-center py-8 text-muted">
        <p className="text-sm">Select a project from the sidebar to view dependencies</p>
      </div>
    );
  }

  // Embedded content for inline use
  const embeddedContent = (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded" style={{ background: 'rgba(243, 156, 18, 0.2)' }}>
          <div className="text-lg font-bold text-yellow-400">{outdatedCount}</div>
          <div className="text-xs text-muted">Outdated</div>
        </div>
        <div className="p-2 rounded" style={{ background: 'rgba(231, 76, 60, 0.2)' }}>
          <div className="text-lg font-bold text-red-400">{vulnerableCount}</div>
          <div className="text-xs text-muted">Vulnerable</div>
        </div>
        <div className="p-2 rounded" style={{ background: 'rgba(46, 204, 113, 0.2)' }}>
          <div className="text-lg font-bold text-green-400">{packages.length - outdatedCount - vulnerableCount}</div>
          <div className="text-xs text-muted">OK</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        {outdatedCount > 0 && (
          <button
            onClick={handleUpdateAll}
            className="flex-1 py-2 text-sm rounded bg-accent text-white hover:bg-accent/80"
          >
            Update All
          </button>
        )}
        {vulnerabilities.length > 0 && (
          <button
            onClick={handleAuditFix}
            className="flex-1 py-2 text-sm rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            Fix Vulnerabilities
          </button>
        )}
        <button
          onClick={fetchDependencies}
          className="px-4 py-2 text-sm rounded bg-white/10 hover:bg-white/20"
        >
          Refresh
        </button>
      </div>

      {/* Status indicator */}
      <div className="text-xs text-center text-muted">
        {loading ? 'Analyzing dependencies...' : `${packages.length} packages total`}
      </div>
    </div>
  );

  if (embedded) {
    return embeddedContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Dependencies</h2>
            <span className="text-xs text-muted">({packages.length} packages)</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary */}
        <div
          className="grid grid-cols-4 gap-4 p-4"
          style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{packages.length}</div>
            <div className="text-xs text-muted">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{outdatedCount}</div>
            <div className="text-xs text-muted">Outdated</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{vulnerableCount}</div>
            <div className="text-xs text-muted">Vulnerable</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {packages.length - outdatedCount - vulnerableCount}
            </div>
            <div className="text-xs text-muted">Up to Date</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('packages')}
            className={'px-3 py-1.5 text-sm rounded ' +
              (activeTab === 'packages' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-primary')}
          >
            Packages
          </button>
          <button
            onClick={() => setActiveTab('vulnerabilities')}
            className={'px-3 py-1.5 text-sm rounded ' +
              (activeTab === 'vulnerabilities' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-primary')}
          >
            Vulnerabilities ({vulnerabilities.length})
          </button>
          <div className="flex-1" />
          {activeTab === 'packages' && outdatedCount > 0 && (
            <button
              onClick={handleUpdateAll}
              className="px-3 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent/80"
            >
              Update All
            </button>
          )}
          {activeTab === 'vulnerabilities' && vulnerabilities.length > 0 && (
            <button
              onClick={handleAuditFix}
              className="px-3 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent/80"
            >
              Auto-Fix
            </button>
          )}
        </div>

        {/* Filters (packages tab) */}
        {activeTab === 'packages' && (
          <div className="flex items-center gap-3 px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search packages..."
              className="flex-1 px-3 py-1.5 text-sm rounded"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-2 py-1.5 text-sm rounded"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            >
              <option value="all">All Packages</option>
              <option value="outdated">Outdated Only</option>
              <option value="vulnerable">Vulnerable Only</option>
            </select>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center text-muted py-8">Analyzing dependencies...</div>
          ) : activeTab === 'packages' ? (
            filteredPackages.length === 0 ? (
              <div className="text-center text-muted py-8">No packages found</div>
            ) : (
              filteredPackages.map(pkg => (
                <PackageCard key={pkg.name} pkg={pkg} onUpdate={handleUpdate} />
              ))
            )
          ) : vulnerabilities.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">No vulnerabilities found</div>
              <div className="text-muted">Your dependencies are secure</div>
            </div>
          ) : (
            vulnerabilities.map((vuln, i) => (
              <VulnerabilityCard key={i} vuln={vuln} />
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs text-muted"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <span>{projectPath || 'No project selected'}</span>
          <button onClick={fetchDependencies} className="text-accent hover:underline">
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
