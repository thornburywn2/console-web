/**
 * PackagesPane Component
 * System package management (apt/dpkg)
 */

import { useState, useEffect, useCallback } from 'react';

export function PackagesPane() {
  const [packages, setPackages] = useState({ packages: [], total: 0 });
  const [packageSearch, setPackageSearch] = useState('');
  const [packageUpdates, setPackageUpdates] = useState({ updates: [], count: 0 });
  const [packageSearchResults, setPackageSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/infra/packages');
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      }
    } catch (err) {
      console.error('Error fetching packages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPackageUpdates = useCallback(async () => {
    try {
      const res = await fetch('/api/infra/packages/updates');
      if (res.ok) {
        const data = await res.json();
        setPackageUpdates(data);
      }
    } catch (err) {
      console.error('Error fetching package updates:', err);
    }
  }, []);

  const searchAvailablePackages = useCallback(async (query) => {
    if (!query.trim()) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/infra/packages/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setPackageSearchResults(data.packages || []);
      }
    } catch (err) {
      console.error('Error searching packages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const installPackage = useCallback(async (pkgName) => {
    try {
      setLoading(true);
      const res = await fetch('/api/infra/packages/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: pkgName })
      });
      if (res.ok) {
        fetchPackages();
        setPackageSearchResults([]);
      }
    } catch (err) {
      console.error('Error installing package:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchPackages]);

  const upgradeAllPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/infra/packages/upgrade-all', { method: 'POST' });
      if (res.ok) {
        fetchPackages();
        fetchPackageUpdates();
      }
    } catch (err) {
      console.error('Error upgrading packages:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchPackages, fetchPackageUpdates]);

  useEffect(() => {
    fetchPackages();
    fetchPackageUpdates();
  }, [fetchPackages, fetchPackageUpdates]);

  return (
    <div className="space-y-6">
      {/* Package Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="hacker-card text-center">
          <div className="stat-value">{packages.total || packages.packages?.length || 0}</div>
          <div className="stat-label">INSTALLED</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value" style={{color: packageUpdates.count > 0 ? '#ffb000' : '#00ff41'}}>
            {packageUpdates.count || 0}
          </div>
          <div className="stat-label">UPDATES</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-cyan">{packageSearchResults.length}</div>
          <div className="stat-label">SEARCH RESULTS</div>
        </div>
        <div className="hacker-card text-center">
          <button
            onClick={upgradeAllPackages}
            disabled={loading || packageUpdates.count === 0}
            className="hacker-btn text-xs w-full h-full flex items-center justify-center gap-2"
          >
            {loading ? 'UPGRADING...' : 'UPGRADE ALL'}
          </button>
        </div>
      </div>

      {/* Package Search & Install */}
      <div className="hacker-card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-hacker-purple uppercase tracking-wider">
            SEARCH & INSTALL PACKAGES
          </h4>
          <button
            onClick={() => { fetchPackages(); fetchPackageUpdates(); }}
            disabled={loading}
            className="hacker-btn text-xs"
          >
            {loading ? '[LOADING...]' : '[REFRESH]'}
          </button>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search packages (e.g., nginx, vim, htop)..."
            value={packageSearch}
            onChange={(e) => setPackageSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchAvailablePackages(packageSearch)}
            className="input-glass font-mono flex-1"
          />
          <button
            onClick={() => searchAvailablePackages(packageSearch)}
            disabled={loading || !packageSearch.trim()}
            className="hacker-btn px-4"
          >
            {loading ? 'SEARCHING...' : 'SEARCH'}
          </button>
        </div>

        {/* Search Results */}
        {packageSearchResults.length > 0 && (
          <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
            {packageSearchResults.map(pkg => (
              <div key={pkg.package} className="flex items-center justify-between p-2 bg-hacker-surface rounded border border-hacker-border">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-mono text-hacker-cyan">{pkg.package}</span>
                  <span className="text-xs text-hacker-text-dim ml-2">{pkg.version}</span>
                  {pkg.description && (
                    <p className="text-xs text-hacker-text-dim truncate">{pkg.description}</p>
                  )}
                </div>
                <button
                  onClick={() => installPackage(pkg.package)}
                  disabled={loading}
                  className="hacker-btn text-xs ml-2 border-hacker-green/30 text-hacker-green hover:bg-hacker-green/10"
                >
                  INSTALL
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Updates */}
      {packageUpdates.count > 0 && (
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-warning mb-4 uppercase tracking-wider">
            AVAILABLE UPDATES ({packageUpdates.count})
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(packageUpdates.updates || []).map(pkg => (
              <div key={pkg.package} className="flex items-center justify-between p-2 bg-hacker-surface rounded border border-hacker-warning/30">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-mono text-hacker-warning">{pkg.package}</span>
                  <div className="text-xs text-hacker-text-dim">
                    {pkg.current} → <span className="text-hacker-green">{pkg.available}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Installed Packages */}
      <div className="hacker-card">
        <h4 className="text-sm font-semibold text-hacker-green mb-4 uppercase tracking-wider">
          INSTALLED PACKAGES ({packages.total || packages.packages?.length || 0})
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 max-h-80 overflow-y-auto">
          {(packages.packages || []).slice(0, 100).map(pkg => (
            <div key={pkg.name} className="p-2 bg-hacker-surface rounded border border-hacker-border text-xs font-mono">
              <div className="text-hacker-text truncate">{pkg.name}</div>
              <div className="text-hacker-text-dim">{pkg.version}</div>
            </div>
          ))}
        </div>
        {(packages.packages?.length || 0) > 100 && (
          <p className="text-xs text-hacker-text-dim mt-2">
            Showing first 100 of {packages.packages.length} packages
          </p>
        )}
      </div>
    </div>
  );
}

export default PackagesPane;
