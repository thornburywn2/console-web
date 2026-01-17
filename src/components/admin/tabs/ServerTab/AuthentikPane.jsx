/**
 * AuthentikPane Component
 * Authentik SSO user and group management
 */

import { useState, useEffect, useCallback } from 'react';

export function AuthentikPane() {
  const [authentikStatus, setAuthentikStatus] = useState(null);
  const [authentikSettings, setAuthentikSettings] = useState(null);
  const [authentikTokenInput, setAuthentikTokenInput] = useState('');
  const [authentikSaving, setAuthentikSaving] = useState(false);
  const [authentikUsers, setAuthentikUsers] = useState({ users: [], pagination: {} });
  const [authentikGroups, setAuthentikGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', name: '', email: '', password: '', groups: [] });
  const [error, setError] = useState('');

  const fetchAuthentikStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-users/authentik/status');
      if (res.ok) {
        const data = await res.json();
        setAuthentikStatus(data);
      }
    } catch (err) {
      console.error('Error fetching Authentik status:', err);
    }
  }, []);

  const fetchAuthentikSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-users/authentik/settings');
      if (res.ok) {
        const data = await res.json();
        setAuthentikSettings(data);
      }
    } catch (err) {
      console.error('Error fetching Authentik settings:', err);
    }
  }, []);

  const fetchAuthentikUsers = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/admin-users/authentik/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAuthentikUsers(data);
      }
    } catch (err) {
      console.error('Error fetching Authentik users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuthentikGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-users/authentik/groups');
      if (res.ok) {
        const data = await res.json();
        setAuthentikGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Error fetching Authentik groups:', err);
    }
  }, []);

  const saveAuthentikToken = useCallback(async () => {
    try {
      setAuthentikSaving(true);
      const res = await fetch('/api/admin-users/authentik/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: authentikTokenInput })
      });
      if (res.ok) {
        setAuthentikTokenInput('');
        fetchAuthentikSettings();
        fetchAuthentikStatus();
        fetchAuthentikUsers(search);
      }
    } catch (err) {
      console.error('Error saving Authentik token:', err);
    } finally {
      setAuthentikSaving(false);
    }
  }, [authentikTokenInput, fetchAuthentikSettings, fetchAuthentikStatus, fetchAuthentikUsers, search]);

  const createUser = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin-users/authentik/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }
      setShowAddUser(false);
      setNewUser({ username: '', name: '', email: '', password: '', groups: [] });
      fetchAuthentikUsers(search);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [newUser, fetchAuthentikUsers, search]);

  useEffect(() => {
    fetchAuthentikSettings();
    fetchAuthentikStatus();
    fetchAuthentikUsers(search);
    fetchAuthentikGroups();
  }, [fetchAuthentikSettings, fetchAuthentikStatus, fetchAuthentikUsers, fetchAuthentikGroups, search]);

  return (
    <div className="space-y-6">
      {/* API Token Configuration */}
      <div className="hacker-card">
        <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
          API TOKEN CONFIGURATION
        </h4>
        <div className="space-y-4">
          {authentikSettings?.hasToken ? (
            <div className="flex items-center justify-between p-3 bg-hacker-green/10 border border-hacker-green/30 rounded">
              <div>
                <span className="text-hacker-green font-mono text-sm">Token configured: </span>
                <code className="text-hacker-text-dim">{authentikSettings.tokenPreview}</code>
              </div>
              <button
                onClick={() => setAuthentikSettings({ ...authentikSettings, hasToken: false })}
                className="hacker-btn text-xs border-hacker-error/30 text-hacker-error"
              >
                CHANGE
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Enter Authentik API Token..."
                  value={authentikTokenInput}
                  onChange={(e) => setAuthentikTokenInput(e.target.value)}
                  className="input-glass flex-1"
                />
                <button
                  onClick={saveAuthentikToken}
                  disabled={authentikSaving || !authentikTokenInput.trim()}
                  className="hacker-btn"
                >
                  {authentikSaving ? 'SAVING...' : 'SAVE TOKEN'}
                </button>
              </div>
              <p className="text-xs text-hacker-text-dim">
                Create an API token in Authentik: Admin Interface → System → Tokens
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Authentik Status */}
      {authentikStatus && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="hacker-card text-center">
            <div className={`stat-value ${authentikStatus.connected ? 'text-hacker-green' : 'text-hacker-error'}`}>
              {authentikStatus.connected ? 'CONNECTED' : 'DISCONNECTED'}
            </div>
            <div className="stat-label">STATUS</div>
          </div>
          <div className="hacker-card text-center">
            <div className="stat-value text-hacker-cyan">{authentikStatus.userCount || 0}</div>
            <div className="stat-label">USERS</div>
          </div>
          <div className="hacker-card text-center">
            <div className="stat-value text-hacker-purple">{authentikStatus.groupCount || 0}</div>
            <div className="stat-label">GROUPS</div>
          </div>
          <div className="hacker-card text-center">
            <div className="stat-value text-hacker-warning">{authentikStatus.applicationCount || 0}</div>
            <div className="stat-label">APPLICATIONS</div>
          </div>
        </div>
      )}

      {/* User Management */}
      <div className="hacker-card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">
            USER MANAGEMENT
          </h4>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-glass text-sm w-48"
            />
            <button
              onClick={() => setShowAddUser(true)}
              className="hacker-btn text-xs bg-hacker-green/10 border-hacker-green/30 text-hacker-green"
            >
              + ADD USER
            </button>
            <button
              onClick={() => fetchAuthentikUsers(search)}
              disabled={loading}
              className="hacker-btn text-xs"
            >
              {loading ? '...' : 'REFRESH'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-hacker-error/10 border border-hacker-error/30 text-hacker-error text-sm">
            {error}
          </div>
        )}

        {/* Add User Form */}
        {showAddUser && (
          <div className="mb-4 p-4 bg-hacker-surface rounded border border-hacker-cyan/30">
            <h5 className="text-sm font-semibold text-hacker-cyan mb-3">Create New User</h5>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Username"
                value={newUser.username}
                onChange={(e) => setNewUser(u => ({ ...u, username: e.target.value }))}
                className="input-glass text-sm"
              />
              <input
                type="text"
                placeholder="Full Name"
                value={newUser.name}
                onChange={(e) => setNewUser(u => ({ ...u, name: e.target.value }))}
                className="input-glass text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser(u => ({ ...u, email: e.target.value }))}
                className="input-glass text-sm"
              />
              <input
                type="password"
                placeholder="Password"
                value={newUser.password}
                onChange={(e) => setNewUser(u => ({ ...u, password: e.target.value }))}
                className="input-glass text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setShowAddUser(false)}
                className="hacker-btn text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={createUser}
                disabled={loading || !newUser.username || !newUser.email}
                className="hacker-btn text-xs bg-hacker-green/10 border-hacker-green/30 text-hacker-green"
              >
                CREATE USER
              </button>
            </div>
          </div>
        )}

        {/* User List */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {authentikUsers.users?.length === 0 ? (
            <p className="text-xs text-hacker-text-dim font-mono">No users found</p>
          ) : (
            authentikUsers.users?.map(user => (
              <div
                key={user.pk}
                className={`flex items-center justify-between p-3 bg-hacker-surface rounded border ${
                  selectedUser?.pk === user.pk ? 'border-hacker-cyan' : 'border-hacker-border'
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="flex items-center gap-3">
                  {user.avatar && (
                    <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
                  )}
                  <div>
                    <div className="font-mono text-sm text-hacker-text">{user.username}</div>
                    <div className="text-xs text-hacker-text-dim">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`hacker-badge text-[10px] ${
                    user.isActive ? 'hacker-badge-green' : 'hacker-badge-error'
                  }`}>
                    {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Groups */}
      <div className="hacker-card">
        <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
          GROUPS [{authentikGroups.length}]
        </h4>
        <div className="flex flex-wrap gap-2">
          {authentikGroups.map(group => (
            <span
              key={group.pk}
              className="px-3 py-1.5 text-xs font-mono bg-hacker-surface border border-hacker-purple/30 rounded text-hacker-purple"
            >
              {group.name}
              <span className="text-hacker-text-dim ml-1">({group.userCount || 0})</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AuthentikPane;
