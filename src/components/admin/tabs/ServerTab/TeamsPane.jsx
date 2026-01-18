/**
 * TeamsPane Component
 * Team management for multi-tenant access control
 *
 * Phase 6: Team-Based Access Control
 * - Create/edit/delete teams
 * - Manage team membership
 * - Assign projects to teams with access levels
 */

import { useState, useEffect, useCallback } from 'react';
import { teamsApi } from '../../../../services/api.js';

const ACCESS_LEVELS = [
  { value: 'READ_ONLY', label: 'Read Only', color: 'hacker-text-dim' },
  { value: 'READ_WRITE', label: 'Read/Write', color: 'hacker-cyan' },
  { value: 'ADMIN', label: 'Admin', color: 'hacker-warning' },
];

const ROLES = [
  { value: 'VIEWER', label: 'Viewer' },
  { value: 'USER', label: 'User' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

export function TeamsPane() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [showEditTeam, setShowEditTeam] = useState(false);

  // Form states
  const [newTeam, setNewTeam] = useState({ name: '', description: '', slug: '', defaultRole: 'USER', maxMembers: 10 });
  const [newMember, setNewMember] = useState({ userId: '', role: 'USER' });
  const [newProject, setNewProject] = useState({ projectPath: '', accessLevel: 'READ_WRITE' });
  const [editTeam, setEditTeam] = useState(null);

  // Available users/projects for assignment (would come from API)
  const [availableProjects, setAvailableProjects] = useState([]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      clearMessages();
      const data = await teamsApi.list();
      // Backend returns array directly, not wrapped in {teams: [...]}
      setTeams(Array.isArray(data) ? data : (data.teams || []));
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      // Backend returns array directly, not wrapped in {projects: [...]}
      setAvailableProjects(Array.isArray(data) ? data : (data.projects || []));
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, []);

  const fetchTeamDetails = useCallback(async (teamId) => {
    try {
      setLoading(true);
      const data = await teamsApi.get(teamId);
      // Backend returns team object directly, not wrapped in {team: {...}}
      setSelectedTeam(data.id ? data : data.team);
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTeam = useCallback(async () => {
    try {
      setLoading(true);
      clearMessages();
      await teamsApi.create(newTeam);
      setSuccess('Team created successfully');
      setShowCreateTeam(false);
      setNewTeam({ name: '', description: '', slug: '', defaultRole: 'USER', maxMembers: 10 });
      fetchTeams();
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [newTeam, fetchTeams]);

  const updateTeam = useCallback(async () => {
    if (!editTeam) return;
    try {
      setLoading(true);
      clearMessages();
      await teamsApi.update(editTeam.id, {
        name: editTeam.name,
        description: editTeam.description,
        defaultRole: editTeam.defaultRole,
        maxMembers: editTeam.maxMembers,
        isActive: editTeam.isActive,
      });
      setSuccess('Team updated successfully');
      setShowEditTeam(false);
      setEditTeam(null);
      fetchTeams();
      if (selectedTeam?.id === editTeam.id) {
        fetchTeamDetails(editTeam.id);
      }
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [editTeam, fetchTeams, fetchTeamDetails, selectedTeam]);

  const deleteTeam = useCallback(async (teamId) => {
    if (!confirm('Delete this team? All members will be unassigned and project assignments will be removed.')) return;
    try {
      setLoading(true);
      clearMessages();
      await teamsApi.delete(teamId);
      setSuccess('Team deleted successfully');
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(null);
      }
      fetchTeams();
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchTeams, selectedTeam]);

  const addMember = useCallback(async () => {
    if (!selectedTeam || !newMember.userId) return;
    try {
      setLoading(true);
      clearMessages();
      await teamsApi.addMember(selectedTeam.id, newMember.userId, newMember.role);
      setSuccess('Member added successfully');
      setShowAddMember(false);
      setNewMember({ userId: '', role: 'USER' });
      fetchTeamDetails(selectedTeam.id);
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, newMember, fetchTeamDetails]);

  const removeMember = useCallback(async (userId) => {
    if (!selectedTeam) return;
    if (!confirm('Remove this member from the team?')) return;
    try {
      setLoading(true);
      clearMessages();
      await teamsApi.removeMember(selectedTeam.id, userId);
      setSuccess('Member removed successfully');
      fetchTeamDetails(selectedTeam.id);
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, fetchTeamDetails]);

  const assignProject = useCallback(async () => {
    if (!selectedTeam || !newProject.projectPath) return;
    try {
      setLoading(true);
      clearMessages();
      await teamsApi.assignProject(selectedTeam.id, newProject.projectPath, newProject.accessLevel);
      setSuccess('Project assigned successfully');
      setShowAssignProject(false);
      setNewProject({ projectPath: '', accessLevel: 'READ_WRITE' });
      fetchTeamDetails(selectedTeam.id);
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, newProject, fetchTeamDetails]);

  const updateProjectAccess = useCallback(async (assignmentId, accessLevel) => {
    if (!selectedTeam) return;
    try {
      setLoading(true);
      clearMessages();
      await teamsApi.updateProjectAccess(selectedTeam.id, assignmentId, accessLevel);
      setSuccess('Access level updated');
      fetchTeamDetails(selectedTeam.id);
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, fetchTeamDetails]);

  const removeProject = useCallback(async (assignmentId) => {
    if (!selectedTeam) return;
    if (!confirm('Remove this project assignment?')) return;
    try {
      setLoading(true);
      clearMessages();
      await teamsApi.removeProject(selectedTeam.id, assignmentId);
      setSuccess('Project removed from team');
      fetchTeamDetails(selectedTeam.id);
    } catch (err) {
      const message = err.getUserMessage?.() || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, fetchTeamDetails]);

  useEffect(() => {
    fetchTeams();
    fetchProjects();
  }, [fetchTeams, fetchProjects]);

  // Auto-generate slug from name
  useEffect(() => {
    if (newTeam.name && !newTeam.slug) {
      setNewTeam(t => ({
        ...t,
        slug: t.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      }));
    }
  }, [newTeam.name]);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-cyan">{teams.length}</div>
          <div className="stat-label">TEAMS</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-green">{teams.filter(t => t.isActive).length}</div>
          <div className="stat-label">ACTIVE</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-purple">{teams.reduce((sum, t) => sum + (t._count?.members || 0), 0)}</div>
          <div className="stat-label">TOTAL MEMBERS</div>
        </div>
        <div className="hacker-card text-center">
          <div className="stat-value text-hacker-warning">{teams.reduce((sum, t) => sum + (t._count?.projects || 0), 0)}</div>
          <div className="stat-label">PROJECT ASSIGNMENTS</div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 rounded bg-hacker-error/10 border border-hacker-error/30 text-hacker-error text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded bg-hacker-green/10 border border-hacker-green/30 text-hacker-green text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teams List */}
        <div className="hacker-card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">
              TEAMS
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateTeam(true)}
                className="hacker-btn text-xs bg-hacker-green/10 border-hacker-green/30 text-hacker-green"
              >
                + CREATE TEAM
              </button>
              <button
                onClick={fetchTeams}
                disabled={loading}
                className="hacker-btn text-xs"
              >
                {loading ? '...' : 'REFRESH'}
              </button>
            </div>
          </div>

          {/* Create Team Modal */}
          {showCreateTeam && (
            <div className="mb-4 p-4 bg-hacker-surface rounded border border-hacker-cyan/30">
              <h5 className="text-sm font-semibold text-hacker-cyan mb-3">Create New Team</h5>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Team Name"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam(t => ({ ...t, name: e.target.value }))}
                  className="input-glass text-sm"
                />
                <input
                  type="text"
                  placeholder="Slug (auto-generated)"
                  value={newTeam.slug}
                  onChange={(e) => setNewTeam(t => ({ ...t, slug: e.target.value }))}
                  className="input-glass text-sm"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam(t => ({ ...t, description: e.target.value }))}
                  className="input-glass text-sm col-span-2"
                />
                <select
                  value={newTeam.defaultRole}
                  onChange={(e) => setNewTeam(t => ({ ...t, defaultRole: e.target.value }))}
                  className="input-glass text-sm"
                >
                  {ROLES.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Max Members"
                  value={newTeam.maxMembers}
                  onChange={(e) => setNewTeam(t => ({ ...t, maxMembers: parseInt(e.target.value) || 10 }))}
                  className="input-glass text-sm"
                  min="1"
                  max="100"
                />
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => { setShowCreateTeam(false); setNewTeam({ name: '', description: '', slug: '', defaultRole: 'USER', maxMembers: 10 }); }}
                  className="hacker-btn text-xs"
                >
                  CANCEL
                </button>
                <button
                  onClick={createTeam}
                  disabled={loading || !newTeam.name || !newTeam.slug}
                  className="hacker-btn text-xs bg-hacker-green/10 border-hacker-green/30 text-hacker-green"
                >
                  CREATE TEAM
                </button>
              </div>
            </div>
          )}

          {/* Teams List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {teams.length === 0 ? (
              <p className="text-xs text-hacker-text-dim font-mono">No teams found. Create your first team to get started.</p>
            ) : (
              teams.map(team => (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-3 bg-hacker-surface rounded border cursor-pointer transition-colors ${
                    selectedTeam?.id === team.id ? 'border-hacker-cyan' : 'border-hacker-border hover:border-hacker-text-dim'
                  }`}
                  onClick={() => fetchTeamDetails(team.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono text-lg ${
                      team.isActive ? 'bg-hacker-cyan/20 text-hacker-cyan' : 'bg-hacker-text-dim/20 text-hacker-text-dim'
                    }`}>
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-mono text-sm text-hacker-text flex items-center gap-2">
                        {team.name}
                        {!team.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-hacker-text-dim/20 rounded text-hacker-text-dim">INACTIVE</span>
                        )}
                      </div>
                      <div className="text-xs text-hacker-text-dim">
                        {team._count?.members || 0} members | {team._count?.projects || 0} projects
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditTeam(team); setShowEditTeam(true); }}
                      className="hacker-btn text-[10px] px-2 py-0.5"
                    >
                      EDIT
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTeam(team.id); }}
                      className="hacker-btn text-[10px] px-2 py-0.5 border-hacker-error/30 text-hacker-error"
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Team Details */}
        <div className="hacker-card">
          <h4 className="text-sm font-semibold text-hacker-purple mb-4 uppercase tracking-wider">
            {selectedTeam ? `TEAM: ${selectedTeam.name}` : 'SELECT A TEAM'}
          </h4>

          {selectedTeam ? (
            <div className="space-y-4">
              {/* Team Info */}
              <div className="p-3 bg-hacker-surface rounded border border-hacker-border">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-hacker-text-dim">Slug:</span>
                    <span className="ml-2 text-hacker-text">{selectedTeam.slug}</span>
                  </div>
                  <div>
                    <span className="text-hacker-text-dim">Default Role:</span>
                    <span className="ml-2 text-hacker-cyan">{selectedTeam.defaultRole}</span>
                  </div>
                  <div>
                    <span className="text-hacker-text-dim">Max Members:</span>
                    <span className="ml-2 text-hacker-text">{selectedTeam.maxMembers}</span>
                  </div>
                  <div>
                    <span className="text-hacker-text-dim">Status:</span>
                    <span className={`ml-2 ${selectedTeam.isActive ? 'text-hacker-green' : 'text-hacker-error'}`}>
                      {selectedTeam.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                {selectedTeam.description && (
                  <p className="mt-2 text-xs text-hacker-text-dim">{selectedTeam.description}</p>
                )}
              </div>

              {/* Members Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-semibold text-hacker-cyan uppercase tracking-wider">
                    MEMBERS ({selectedTeam.members?.length || 0}/{selectedTeam.maxMembers})
                  </h5>
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="hacker-btn text-[10px] px-2 py-0.5 bg-hacker-cyan/10 border-hacker-cyan/30 text-hacker-cyan"
                    disabled={(selectedTeam.members?.length || 0) >= selectedTeam.maxMembers}
                  >
                    + ADD
                  </button>
                </div>

                {/* Add Member Form */}
                {showAddMember && (
                  <div className="mb-2 p-3 bg-hacker-surface rounded border border-hacker-cyan/30">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="User ID"
                        value={newMember.userId}
                        onChange={(e) => setNewMember(m => ({ ...m, userId: e.target.value }))}
                        className="input-glass text-xs flex-1"
                      />
                      <select
                        value={newMember.role}
                        onChange={(e) => setNewMember(m => ({ ...m, role: e.target.value }))}
                        className="input-glass text-xs w-32"
                      >
                        {ROLES.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={addMember}
                        disabled={loading || !newMember.userId}
                        className="hacker-btn text-[10px] px-2 py-0.5 bg-hacker-green/10 border-hacker-green/30 text-hacker-green"
                      >
                        ADD
                      </button>
                      <button
                        onClick={() => { setShowAddMember(false); setNewMember({ userId: '', role: 'USER' }); }}
                        className="hacker-btn text-[10px] px-2 py-0.5"
                      >
                        X
                      </button>
                    </div>
                  </div>
                )}

                {/* Members List */}
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedTeam.members?.length === 0 ? (
                    <p className="text-xs text-hacker-text-dim font-mono">No members yet</p>
                  ) : (
                    selectedTeam.members?.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 bg-hacker-surface rounded border border-hacker-border"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-hacker-purple/20 flex items-center justify-center text-hacker-purple text-xs font-mono">
                            {(member.username || member.name || member.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-mono text-hacker-text">{member.username || member.name || member.email}</span>
                            <span className="ml-2 text-[10px] text-hacker-text-dim">{member.role}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeMember(member.id)}
                          className="hacker-btn text-[10px] px-1.5 py-0.5 border-hacker-error/30 text-hacker-error"
                        >
                          X
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Projects Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-semibold text-hacker-warning uppercase tracking-wider">
                    PROJECT ASSIGNMENTS ({selectedTeam.projects?.length || 0})
                  </h5>
                  <button
                    onClick={() => setShowAssignProject(true)}
                    className="hacker-btn text-[10px] px-2 py-0.5 bg-hacker-warning/10 border-hacker-warning/30 text-hacker-warning"
                  >
                    + ASSIGN
                  </button>
                </div>

                {/* Assign Project Form */}
                {showAssignProject && (
                  <div className="mb-2 p-3 bg-hacker-surface rounded border border-hacker-warning/30">
                    <div className="flex gap-2">
                      <select
                        value={newProject.projectPath}
                        onChange={(e) => setNewProject(p => ({ ...p, projectPath: e.target.value }))}
                        className="input-glass text-xs flex-1"
                      >
                        <option value="">Select Project...</option>
                        {availableProjects
                          .filter(p => !selectedTeam.projects?.some(tp => tp.projectPath === p.path))
                          .map(project => (
                            <option key={project.path} value={project.path}>{project.name}</option>
                          ))}
                      </select>
                      <select
                        value={newProject.accessLevel}
                        onChange={(e) => setNewProject(p => ({ ...p, accessLevel: e.target.value }))}
                        className="input-glass text-xs w-32"
                      >
                        {ACCESS_LEVELS.map(level => (
                          <option key={level.value} value={level.value}>{level.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={assignProject}
                        disabled={loading || !newProject.projectPath}
                        className="hacker-btn text-[10px] px-2 py-0.5 bg-hacker-green/10 border-hacker-green/30 text-hacker-green"
                      >
                        ASSIGN
                      </button>
                      <button
                        onClick={() => { setShowAssignProject(false); setNewProject({ projectPath: '', accessLevel: 'READ_WRITE' }); }}
                        className="hacker-btn text-[10px] px-2 py-0.5"
                      >
                        X
                      </button>
                    </div>
                  </div>
                )}

                {/* Projects List */}
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {selectedTeam.projects?.length === 0 ? (
                    <p className="text-xs text-hacker-text-dim font-mono">No projects assigned</p>
                  ) : (
                    selectedTeam.projects?.map(assignment => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-2 bg-hacker-surface rounded border border-hacker-border"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-hacker-text">{assignment.projectPath.split('/').pop()}</span>
                          <select
                            value={assignment.accessLevel}
                            onChange={(e) => updateProjectAccess(assignment.id, e.target.value)}
                            className="input-glass text-[10px] px-2 py-0.5 w-28"
                          >
                            {ACCESS_LEVELS.map(level => (
                              <option key={level.value} value={level.value}>{level.label}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => removeProject(assignment.id)}
                          className="hacker-btn text-[10px] px-1.5 py-0.5 border-hacker-error/30 text-hacker-error"
                        >
                          X
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-hacker-text-dim font-mono">
              Click on a team from the list to view and manage its details.
            </p>
          )}
        </div>
      </div>

      {/* Edit Team Modal */}
      {showEditTeam && editTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="hacker-card w-full max-w-md">
            <h4 className="text-sm font-semibold text-hacker-cyan mb-4 uppercase tracking-wider">
              Edit Team: {editTeam.name}
            </h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Team Name"
                value={editTeam.name}
                onChange={(e) => setEditTeam(t => ({ ...t, name: e.target.value }))}
                className="input-glass text-sm w-full"
              />
              <input
                type="text"
                placeholder="Description"
                value={editTeam.description || ''}
                onChange={(e) => setEditTeam(t => ({ ...t, description: e.target.value }))}
                className="input-glass text-sm w-full"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={editTeam.defaultRole}
                  onChange={(e) => setEditTeam(t => ({ ...t, defaultRole: e.target.value }))}
                  className="input-glass text-sm"
                >
                  {ROLES.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Max Members"
                  value={editTeam.maxMembers}
                  onChange={(e) => setEditTeam(t => ({ ...t, maxMembers: parseInt(e.target.value) || 10 }))}
                  className="input-glass text-sm"
                  min="1"
                  max="100"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-mono cursor-pointer">
                <input
                  type="checkbox"
                  checked={editTeam.isActive}
                  onChange={(e) => setEditTeam(t => ({ ...t, isActive: e.target.checked }))}
                  className="form-checkbox h-4 w-4 text-hacker-green bg-hacker-surface border-hacker-border rounded"
                />
                <span className="text-hacker-text-dim">Team is Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowEditTeam(false); setEditTeam(null); }}
                className="hacker-btn text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={updateTeam}
                disabled={loading || !editTeam.name}
                className="hacker-btn text-xs bg-hacker-green/10 border-hacker-green/30 text-hacker-green"
              >
                SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamsPane;
