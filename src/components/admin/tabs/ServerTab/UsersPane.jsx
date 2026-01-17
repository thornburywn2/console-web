/**
 * UsersPane Component
 * Server (Linux) user management
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import { serverUsersApi } from '../../../../services/api.js';

export function UsersPane() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [shells, setShells] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSystemUsers, setShowSystemUsers] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', fullName: '', shell: '/bin/bash', groups: [] });
  const [error, setError] = useState('');

  const fetchServerUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await serverUsersApi.listUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching server users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServerGroups = useCallback(async () => {
    try {
      const data = await serverUsersApi.listGroups();
      setGroups(data.groups || []);
    } catch (err) {
      console.error('Error fetching server groups:', err);
    }
  }, []);

  const fetchShells = useCallback(async () => {
    try {
      const data = await serverUsersApi.listShells();
      setShells(data.shells || ['/bin/bash', '/bin/sh', '/bin/zsh']);
    } catch (err) {
      setShells(['/bin/bash', '/bin/sh', '/bin/zsh', '/usr/bin/fish']);
    }
  }, []);

  const createUser = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      await serverUsersApi.createUser(newUser);
      setShowAddUser(false);
      setNewUser({ username: '', fullName: '', shell: '/bin/bash', groups: [] });
      fetchServerUsers();
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [newUser, fetchServerUsers]);

  const deleteUser = useCallback(async (username) => {
    if (!confirm(`Delete user ${username}? This action cannot be undone.`)) return;
    try {
      setLoading(true);
      await serverUsersApi.deleteUser(username);
      fetchServerUsers();
      setSelectedUser(null);
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchServerUsers]);

  useEffect(() => {
    fetchServerUsers();
    fetchServerGroups();
    fetchShells();
  }, [fetchServerUsers, fetchServerGroups, fetchShells]);

  // Filter users based on showSystemUsers toggle
  const displayedUsers = showSystemUsers
    ? users
    : users.filter(u => u.uid >= 1000 || u.username === 'root');

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-cyan">{users.filter(u => u.uid >= 1000).length}</div>
          <div className="stat-label">REGULAR USERS</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-text-dim">{users.filter(u => u.uid < 1000).length}</div>
          <div className="stat-label">SYSTEM USERS</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-purple">{groups.length}</div>
          <div className="stat-label">GROUPS</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-green">{shells.length}</div>
          <div className="stat-label">SHELLS</div>
        </div>
      </div>

      {/* User Management */}
      <div className="hacker-card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">
            SERVER USERS
          </h4>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-mono cursor-pointer">
              <input
                type="checkbox"
                checked={showSystemUsers}
                onChange={(e) => setShowSystemUsers(e.target.checked)}
                className="form-checkbox h-4 w-4 text-hacker-green bg-hacker-surface border-hacker-border rounded"
              />
              <span className="text-hacker-text-dim">Show System Users</span>
            </label>
            <button
              onClick={() => setShowAddUser(true)}
              className="hacker-btn text-xs bg-hacker-green/10 border-hacker-green/30 text-hacker-green"
            >
              + ADD USER
            </button>
            <button
              onClick={fetchServerUsers}
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
                value={newUser.fullName}
                onChange={(e) => setNewUser(u => ({ ...u, fullName: e.target.value }))}
                className="input-glass text-sm"
              />
              <select
                value={newUser.shell}
                onChange={(e) => setNewUser(u => ({ ...u, shell: e.target.value }))}
                className="input-glass text-sm"
              >
                {shells.map(shell => (
                  <option key={shell} value={shell}>{shell}</option>
                ))}
              </select>
              <select
                multiple
                value={newUser.groups}
                onChange={(e) => setNewUser(u => ({
                  ...u,
                  groups: Array.from(e.target.selectedOptions, o => o.value)
                }))}
                className="input-glass text-sm h-20"
              >
                {groups.map(group => (
                  <option key={group.name} value={group.name}>{group.name}</option>
                ))}
              </select>
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
                disabled={loading || !newUser.username}
                className="hacker-btn text-xs bg-hacker-green/10 border-hacker-green/30 text-hacker-green"
              >
                CREATE USER
              </button>
            </div>
          </div>
        )}

        {/* User List */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {displayedUsers.length === 0 ? (
            <p className="text-xs text-hacker-text-dim font-mono">No users found</p>
          ) : (
            displayedUsers.map(user => (
              <div
                key={user.uid}
                className={`flex items-center justify-between p-3 bg-hacker-surface rounded border ${
                  selectedUser?.uid === user.uid ? 'border-hacker-cyan' : 'border-hacker-border'
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-hacker-cyan/20 flex items-center justify-center text-hacker-cyan font-mono">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-mono text-sm text-hacker-text">{user.username}</div>
                    <div className="text-xs text-hacker-text-dim">UID: {user.uid} | {user.home}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-hacker-text-dim font-mono">{user.shell}</span>
                  {user.uid >= 1000 && user.username !== 'root' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteUser(user.username); }}
                      className="hacker-btn text-[10px] px-2 py-0.5 border-hacker-error/30 text-hacker-error"
                    >
                      DELETE
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Groups */}
      <div className="hacker-card">
        <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
          GROUPS [{groups.length}]
        </h4>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {groups.filter(g => showSystemUsers || g.gid >= 1000 || ['sudo', 'docker', 'www-data', 'adm'].includes(g.name)).map(group => (
            <span
              key={group.gid}
              className="px-3 py-1.5 text-xs font-mono bg-hacker-surface border border-hacker-purple/30 rounded text-hacker-purple"
            >
              {group.name}
              <span className="text-hacker-text-dim ml-1">(GID: {group.gid})</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default UsersPane;
