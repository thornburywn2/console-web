/**
 * ProjectsTab Component
 * Project list with completion metrics and management actions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TabContainer } from '../shared';

export function ProjectsTab({
  onEditClaudeMd,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onComplianceCheck
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [projectSortBy, setProjectSortBy] = useState('name');
  const [projectSortOrder, setProjectSortOrder] = useState('asc');

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/projects-extended');
      if (res.ok) {
        const data = await res.json();
        setProjects(data || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleProjectSkipPermissions = useCallback(async (projectName, currentValue) => {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/skip-permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipPermissions: !currentValue })
      });
      if (res.ok) {
        fetchProjects();
      }
    } catch (err) {
      console.error('Error toggling skip permissions:', err);
    }
  }, [fetchProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Sort projects
  const sortedProjects = useMemo(() => {
    const sorted = [...projects].sort((a, b) => {
      let comparison = 0;
      switch (projectSortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'completion':
          comparison = (a.completion?.percentage || 0) - (b.completion?.percentage || 0);
          break;
        case 'lastModified':
          comparison = new Date(b.lastModified || 0) - new Date(a.lastModified || 0);
          break;
        case 'active':
          comparison = (b.hasActiveSession ? 1 : 0) - (a.hasActiveSession ? 1 : 0);
          break;
        default:
          comparison = 0;
      }
      return projectSortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [projects, projectSortBy, projectSortOrder]);

  return (
    <TabContainer>
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-hacker-green uppercase tracking-wider font-mono">
            {'>'} PROJECTS [{projects.length}]
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Sorting Controls */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-hacker-text-dim">SORT:</span>
              <select
                value={projectSortBy}
                onChange={(e) => setProjectSortBy(e.target.value)}
                className="input-glass text-xs !py-1"
              >
                <option value="name">Name</option>
                <option value="completion">Completion</option>
                <option value="lastModified">Last Modified</option>
                <option value="active">Active</option>
              </select>
              <button
                onClick={() => setProjectSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                className="p-1 rounded hover:bg-hacker-surface border border-hacker-border"
                title={projectSortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                <svg className="w-4 h-4 text-hacker-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {projectSortOrder === 'asc' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                  )}
                </svg>
              </button>
            </div>
            {/* Stats summary */}
            <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
              <span className="text-hacker-text-dim">
                AVG: <span className="text-hacker-cyan">
                  {projects.length > 0
                    ? Math.round(projects.reduce((sum, p) => sum + (p.completion?.percentage || 0), 0) / projects.length)
                    : 0}%
                </span>
              </span>
              <span className="text-hacker-text-dim">
                ACTIVE: <span className="text-hacker-green">{projects.filter(p => p.hasActiveSession).length}</span>
              </span>
            </div>
            <button onClick={fetchProjects} className="hacker-btn text-xs">
              {loading ? '[SCANNING...]' : '[REFRESH]'}
            </button>
            {onCreateProject && (
              <button
                onClick={onCreateProject}
                className="hacker-btn text-xs bg-hacker-green/20 border-hacker-green text-hacker-green hover:bg-hacker-green/30"
              >
                [+ NEW PROJECT]
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onEditClaudeMd={onEditClaudeMd}
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
              onComplianceCheck={onComplianceCheck}
              onToggleSkipPermissions={toggleProjectSkipPermissions}
            />
          ))}
        </div>

        {/* Summary Stats */}
        {projects.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
            <div className="hacker-card p-3 text-center">
              <div className="stat-value text-xl">{projects.length}</div>
              <div className="stat-label text-[10px]">TOTAL</div>
            </div>
            <div className="hacker-card p-3 text-center">
              <div className="stat-value text-xl" style={{color: '#00ff41'}}>
                {projects.filter(p => (p.completion?.percentage || 0) >= 80).length}
              </div>
              <div className="stat-label text-[10px]">EXCELLENT (80%+)</div>
            </div>
            <div className="hacker-card p-3 text-center">
              <div className="stat-value text-xl" style={{color: '#00d4ff'}}>
                {projects.filter(p => (p.completion?.percentage || 0) >= 60 && (p.completion?.percentage || 0) < 80).length}
              </div>
              <div className="stat-label text-[10px]">GOOD (60-79%)</div>
            </div>
            <div className="hacker-card p-3 text-center">
              <div className="stat-value text-xl" style={{color: '#ffb000'}}>
                {projects.filter(p => (p.completion?.percentage || 0) >= 40 && (p.completion?.percentage || 0) < 60).length}
              </div>
              <div className="stat-label text-[10px]">MEDIUM (40-59%)</div>
            </div>
            <div className="hacker-card p-3 text-center">
              <div className="stat-value text-xl" style={{color: '#ff3333'}}>
                {projects.filter(p => (p.completion?.percentage || 0) < 40).length}
              </div>
              <div className="stat-label text-[10px]">NEEDS WORK (&lt;40%)</div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {projects.length === 0 && !loading && (
          <div className="hacker-card p-8 text-center">
            <p className="text-hacker-text-dim font-mono">No projects found</p>
            {onCreateProject && (
              <button
                onClick={onCreateProject}
                className="hacker-btn mt-4 text-xs bg-hacker-green/20 border-hacker-green text-hacker-green"
              >
                [+ CREATE FIRST PROJECT]
              </button>
            )}
          </div>
        )}
      </div>
    </TabContainer>
  );
}

/**
 * ProjectCard - Individual project card component
 */
function ProjectCard({
  project,
  onEditClaudeMd,
  onRenameProject,
  onDeleteProject,
  onComplianceCheck,
  onToggleSkipPermissions
}) {
  const completion = project.completion || { percentage: 0, missing: [], scores: {} };
  const completionClass = completion.percentage >= 80 ? 'text-hacker-green' :
                          completion.percentage >= 60 ? 'text-hacker-cyan' :
                          completion.percentage >= 40 ? 'text-hacker-warning' : 'text-hacker-error';
  const barColor = completion.percentage >= 80 ? 'bg-hacker-green' :
                   completion.percentage >= 60 ? 'bg-hacker-cyan' :
                   completion.percentage >= 40 ? 'bg-hacker-warning' : 'bg-hacker-error';

  return (
    <div className="hacker-card p-4 flex flex-col group/card">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              project.hasActiveSession ? 'bg-hacker-green animate-pulse-glow' : 'bg-hacker-border'
            }`}
          />
          <span className="font-semibold text-sm truncate text-hacker-text font-mono">{project.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold font-display ${completionClass}`}>
            {completion.percentage}%
          </span>
          {/* Rename button */}
          {onRenameProject && (
            <button
              onClick={() => onRenameProject({ name: project.name, newName: project.name })}
              className="p-1 rounded opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-hacker-cyan/20"
              title="Rename project"
            >
              <svg className="w-4 h-4 text-hacker-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {/* Delete button */}
          {onDeleteProject && (
            <button
              onClick={() => onDeleteProject({ name: project.name, permanent: false })}
              className="p-1 rounded opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-hacker-error/20"
              title="Delete project"
            >
              <svg className="w-4 h-4 text-hacker-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Status Icons Row */}
      <div className="flex items-center gap-1.5 mb-2">
        {/* Git initialized */}
        <span
          className={`p-1 rounded ${project.hasGit ? 'text-hacker-green' : 'text-hacker-text-dim opacity-40'}`}
          title={project.hasGit ? 'Git initialized' : 'No git repository'}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </span>
        {/* GitHub connected */}
        <span
          className={`p-1 rounded ${project.hasGithub ? 'text-hacker-purple' : 'text-hacker-text-dim opacity-40'}`}
          title={project.hasGithub ? `GitHub: ${project.githubRepo || 'connected'}` : 'Not connected to GitHub'}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </span>
        {/* Has tests */}
        <span
          className={`p-1 rounded ${project.hasTests ? 'text-hacker-cyan' : 'text-hacker-text-dim opacity-40'}`}
          title={project.hasTests ? 'Has test suite' : 'No tests found'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        {/* Has Docker */}
        <span
          className={`p-1 rounded ${project.hasDocker ? 'text-hacker-blue' : 'text-hacker-text-dim opacity-40'}`}
          title={project.hasDocker ? 'Docker configured' : 'No Docker configuration'}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.119a.185.185 0 00-.186.185v1.888c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z"/>
          </svg>
        </span>
        {/* Has TypeScript */}
        <span
          className={`p-1 rounded ${project.technologies?.includes('TypeScript') ? 'text-hacker-blue' : 'text-hacker-text-dim opacity-40'}`}
          title={project.technologies?.includes('TypeScript') ? 'TypeScript project' : 'No TypeScript'}
        >
          <span className="text-[10px] font-bold">TS</span>
        </span>
        {/* Has CLAUDE.md */}
        <span
          className={`p-1 rounded ${project.hasClaudeMd ? 'text-hacker-warning' : 'text-hacker-text-dim opacity-40'}`}
          title={project.hasClaudeMd ? 'Has CLAUDE.md instructions' : 'No CLAUDE.md'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-hacker-text-dim mb-3 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Completion Bar */}
      <div className="mb-3">
        <div className="hacker-progress">
          <div
            className={`hacker-progress-bar ${barColor}`}
            style={{
              width: `${completion.percentage}%`,
              background: completion.percentage >= 80 ? 'linear-gradient(90deg, #00cc33, #00ff41)' :
                          completion.percentage >= 60 ? 'linear-gradient(90deg, #00a8cc, #00d4ff)' :
                          completion.percentage >= 40 ? 'linear-gradient(90deg, #cc8800, #ffb000)' :
                          'linear-gradient(90deg, #cc3333, #ff3333)'
            }}
          />
        </div>
      </div>

      {/* Technologies */}
      {project.technologies && project.technologies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {project.technologies.slice(0, 5).map(tech => (
            <span key={tech} className="px-2 py-0.5 text-[10px] bg-hacker-surface border border-hacker-border rounded font-mono text-hacker-text-dim">
              {tech}
            </span>
          ))}
          {project.technologies.length > 5 && (
            <span className="px-2 py-0.5 text-[10px] bg-hacker-surface border border-hacker-border rounded font-mono text-hacker-cyan">
              +{project.technologies.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Status badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {project.hasActiveSession && (
          <span className="hacker-badge hacker-badge-green text-[10px]">ACTIVE</span>
        )}
        {/* CLAUDE.md Edit Button */}
        {onEditClaudeMd && (
          <button
            onClick={() => onEditClaudeMd(project.name)}
            className={`px-2 py-0.5 text-[10px] rounded font-mono transition-all flex items-center gap-1 ${
              project.hasClaudeMd
                ? 'bg-hacker-cyan/20 border border-hacker-cyan/50 text-hacker-cyan hover:bg-hacker-cyan/30'
                : 'bg-hacker-surface border border-hacker-border text-hacker-text-dim hover:border-hacker-cyan/50 hover:text-hacker-cyan'
            }`}
            title={project.hasClaudeMd ? 'Edit project CLAUDE.md' : 'Create project CLAUDE.md'}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {project.hasClaudeMd ? 'CLAUDE.MD' : 'NEW CLAUDE.MD'}
          </button>
        )}
        {/* Compliance Check Button */}
        {onComplianceCheck && (
          <button
            onClick={() => onComplianceCheck({
              path: project.path || project.name,
              name: project.name
            })}
            className="px-2 py-0.5 text-[10px] rounded font-mono transition-all flex items-center gap-1 bg-hacker-surface border border-hacker-border text-hacker-text-dim hover:border-hacker-purple/50 hover:text-hacker-purple"
            title="Check project compliance with standards"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            COMPLIANCE
          </button>
        )}
        {project.hasSessionData && (
          <span className="hacker-badge hacker-badge-purple text-[10px]">SESSIONS</span>
        )}
        {/* Skip Permissions Toggle */}
        <button
          onClick={() => onToggleSkipPermissions(project.name, project.skipPermissions)}
          className={`px-2 py-0.5 text-[10px] rounded font-mono transition-all flex items-center gap-1 ${
            project.skipPermissions
              ? 'bg-hacker-warning/20 border border-hacker-warning/50 text-hacker-warning hover:bg-hacker-warning/30'
              : 'bg-hacker-surface border border-hacker-border text-hacker-text-dim hover:border-hacker-warning/50 hover:text-hacker-warning'
          }`}
          title={project.skipPermissions
            ? 'Click to require permission prompts'
            : 'Click to skip permission prompts (--dangerously-skip-permissions)'}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={project.skipPermissions
                ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"} />
          </svg>
          {project.skipPermissions ? 'SKIP-PERMS' : 'NORMAL'}
        </button>
      </div>

      {/* Missing Items Callout */}
      {completion.missing && completion.missing.length > 0 && (
        <div className="mt-auto pt-3 border-t border-hacker-border/30">
          <div className="text-[10px] uppercase tracking-wider text-hacker-error mb-1.5 font-semibold flex items-center gap-1">
            <span>&#9888;</span> MISSING
          </div>
          <div className="flex flex-wrap gap-1">
            {completion.missing.slice(0, 4).map(item => (
              <span
                key={item}
                className="px-1.5 py-0.5 text-[9px] bg-hacker-error/10 border border-hacker-error/30 rounded text-hacker-error/80 font-mono"
              >
                {item}
              </span>
            ))}
            {completion.missing.length > 4 && (
              <span className="px-1.5 py-0.5 text-[9px] bg-hacker-error/10 border border-hacker-error/30 rounded text-hacker-error font-mono">
                +{completion.missing.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Last Modified */}
      {project.lastModified && (
        <div className="mt-2 text-[10px] text-hacker-text-dim font-mono">
          Last modified: {new Date(project.lastModified).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

export default ProjectsTab;
