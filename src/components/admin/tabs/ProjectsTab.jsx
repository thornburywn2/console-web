/**
 * ProjectsTab Component
 * Project list with completion metrics and management actions
 * Updated to use cohesive Panel design
 */

import { useState, useMemo, useCallback } from 'react';
import { Panel, PanelGroup } from '../../shared';
import { useApiQuery, useApiMutation } from '../../../hooks/useApiQuery';

// Icons
const FolderIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const StatsIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export function ProjectsTab({
  onEditClaudeMd,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onComplianceCheck
}) {
  const [projectSortBy, setProjectSortBy] = useState('name');
  const [projectSortOrder, setProjectSortOrder] = useState('asc');

  // Fetch projects using useApiQuery
  const {
    data: projectsData,
    loading,
    error,
    refetch: fetchProjects
  } = useApiQuery('/admin/projects-extended', {
    initialData: [],
  });

  // Ensure projects is always an array
  const projects = Array.isArray(projectsData) ? projectsData : [];

  // Mutation for toggling skip permissions
  const { mutate: toggleSkipPermissions } = useApiMutation();

  const toggleProjectSkipPermissions = useCallback(async (projectName, currentValue) => {
    const result = await toggleSkipPermissions(
      `/projects/${encodeURIComponent(projectName)}/skip-permissions`,
      'PUT',
      { skipPermissions: !currentValue }
    );
    if (result.success) {
      fetchProjects();
    }
  }, [toggleSkipPermissions, fetchProjects]);

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

  const avgCompletion = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + (p.completion?.percentage || 0), 0) / projects.length)
    : 0;
  const activeCount = projects.filter(p => p.hasActiveSession).length;
  const excellentCount = projects.filter(p => (p.completion?.percentage || 0) >= 80).length;
  const goodCount = projects.filter(p => (p.completion?.percentage || 0) >= 60 && (p.completion?.percentage || 0) < 80).length;
  const mediumCount = projects.filter(p => (p.completion?.percentage || 0) >= 40 && (p.completion?.percentage || 0) < 60).length;
  const needsWorkCount = projects.filter(p => (p.completion?.percentage || 0) < 40).length;

  return (
    <div className="space-y-1 animate-fade-in">
      {/* Projects Panel */}
      <Panel
        id="admin-projects-list"
        title="Projects"
        icon={FolderIcon}
        badge={projects.length}
        badgeColor="var(--accent-primary)"
        emptyText={!loading ? "No projects found" : undefined}
      >
        {/* Controls Row */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4 -mt-1">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Sorting Controls */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-[var(--text-muted)]">Sort:</span>
              <select
                value={projectSortBy}
                onChange={(e) => setProjectSortBy(e.target.value)}
                className="px-2 py-1 text-xs font-mono rounded border bg-[var(--bg-primary)]
                           border-[var(--border-subtle)] text-[var(--text-primary)]
                           focus:border-[var(--accent-primary)] focus:outline-none"
              >
                <option value="name">Name</option>
                <option value="completion">Completion</option>
                <option value="lastModified">Last Modified</option>
                <option value="active">Active</option>
              </select>
              <button
                onClick={() => setProjectSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                className="p-1 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)]
                           hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
                title={projectSortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <span className="text-[var(--text-muted)]">
                Avg: <span className="text-[var(--accent-secondary)]">{avgCompletion}%</span>
              </span>
              <span className="text-[var(--text-muted)]">
                Active: <span className="text-[var(--accent-primary)]">{activeCount}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchProjects}
              className="px-2 py-1 text-xs font-mono rounded border transition-colors
                         border-[var(--border-subtle)] text-[var(--text-secondary)]
                         hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
            >
              {loading ? 'Scanning...' : 'Refresh'}
            </button>
            {onCreateProject && (
              <button
                onClick={onCreateProject}
                className="px-2 py-1 text-xs font-mono rounded border transition-colors
                           border-[var(--accent-primary)]/50 text-[var(--accent-primary)]
                           bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20"
              >
                + New Project
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded border border-[var(--status-error)]/50 bg-[var(--status-error)]/10">
            <p className="text-[var(--status-error)] text-sm">{error.getUserMessage?.() || 'Failed to load projects'}</p>
            <button
              onClick={fetchProjects}
              className="mt-2 px-2 py-1 text-xs font-mono rounded border transition-colors
                         border-[var(--status-error)]/50 text-[var(--status-error)]
                         hover:bg-[var(--status-error)]/20"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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

        {/* Empty State for Create */}
        {projects.length === 0 && !loading && onCreateProject && (
          <div className="text-center py-6">
            <button
              onClick={onCreateProject}
              className="px-3 py-1.5 text-xs font-mono rounded border transition-colors
                         border-[var(--accent-primary)]/50 text-[var(--accent-primary)]
                         bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20"
            >
              + Create First Project
            </button>
          </div>
        )}
      </Panel>

      {/* Summary Stats Panel */}
      {projects.length > 0 && (
        <Panel id="admin-projects-stats" title="Summary" icon={StatsIcon} defaultExpanded={false}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center p-3 rounded bg-[var(--bg-primary)]/50 border border-[var(--border-subtle)]">
              <div className="text-xl font-bold font-mono text-[var(--text-primary)]">{projects.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Total</div>
            </div>
            <div className="text-center p-3 rounded bg-[var(--bg-primary)]/50 border border-[var(--border-subtle)]">
              <div className="text-xl font-bold font-mono text-[var(--accent-primary)]">{excellentCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Excellent (80%+)</div>
            </div>
            <div className="text-center p-3 rounded bg-[var(--bg-primary)]/50 border border-[var(--border-subtle)]">
              <div className="text-xl font-bold font-mono text-[var(--accent-secondary)]">{goodCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Good (60-79%)</div>
            </div>
            <div className="text-center p-3 rounded bg-[var(--bg-primary)]/50 border border-[var(--border-subtle)]">
              <div className="text-xl font-bold font-mono text-[var(--status-warning)]">{mediumCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Medium (40-59%)</div>
            </div>
            <div className="text-center p-3 rounded bg-[var(--bg-primary)]/50 border border-[var(--border-subtle)]">
              <div className="text-xl font-bold font-mono text-[var(--status-error)]">{needsWorkCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Needs Work (&lt;40%)</div>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

/**
 * ProjectCard - Individual project card component
 * Updated to use CSS variables instead of hacker-* classes
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
  const completionColor = completion.percentage >= 80 ? 'var(--accent-primary)' :
                          completion.percentage >= 60 ? 'var(--accent-secondary)' :
                          completion.percentage >= 40 ? 'var(--status-warning)' : 'var(--status-error)';

  return (
    <div className="p-4 flex flex-col group/card rounded border transition-colors
                    bg-[var(--bg-tertiary)] border-[var(--border-subtle)]
                    hover:border-[var(--border-default)]">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              project.hasActiveSession ? 'bg-[var(--accent-primary)] animate-pulse' : 'bg-[var(--border-default)]'
            }`}
          />
          <span className="font-semibold text-sm truncate text-[var(--text-primary)] font-mono">{project.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold font-mono" style={{ color: completionColor }}>
            {completion.percentage}%
          </span>
          {/* Rename button */}
          {onRenameProject && (
            <button
              onClick={() => onRenameProject({ name: project.name, newName: project.name })}
              className="p-1 rounded opacity-0 group-hover/card:opacity-100 transition-opacity
                         hover:bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)]"
              title="Rename project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {/* Delete button */}
          {onDeleteProject && (
            <button
              onClick={() => onDeleteProject({ name: project.name, permanent: false })}
              className="p-1 rounded opacity-0 group-hover/card:opacity-100 transition-opacity
                         hover:bg-[var(--status-error)]/20 text-[var(--status-error)]"
              title="Delete project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          className={`p-1 rounded ${project.hasGit ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] opacity-40'}`}
          title={project.hasGit ? 'Git initialized' : 'No git repository'}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </span>
        {/* GitHub connected */}
        <span
          className={`p-1 rounded ${project.hasGithub ? 'text-[var(--accent-tertiary)]' : 'text-[var(--text-muted)] opacity-40'}`}
          title={project.hasGithub ? `GitHub: ${project.githubRepo || 'connected'}` : 'Not connected to GitHub'}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </span>
        {/* Has tests */}
        <span
          className={`p-1 rounded ${project.hasTests ? 'text-[var(--accent-secondary)]' : 'text-[var(--text-muted)] opacity-40'}`}
          title={project.hasTests ? 'Has test suite' : 'No tests found'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        {/* Has Docker */}
        <span
          className={`p-1 rounded ${project.hasDocker ? 'text-[var(--accent-secondary)]' : 'text-[var(--text-muted)] opacity-40'}`}
          title={project.hasDocker ? 'Docker configured' : 'No Docker configuration'}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.119a.185.185 0 00-.186.185v1.888c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z"/>
          </svg>
        </span>
        {/* Has TypeScript */}
        <span
          className={`p-1 rounded text-[10px] font-bold ${project.technologies?.includes('TypeScript') ? 'text-[var(--accent-secondary)]' : 'text-[var(--text-muted)] opacity-40'}`}
          title={project.technologies?.includes('TypeScript') ? 'TypeScript project' : 'No TypeScript'}
        >
          TS
        </span>
        {/* Has CLAUDE.md */}
        <span
          className={`p-1 rounded ${project.hasClaudeMd ? 'text-[var(--status-warning)]' : 'text-[var(--text-muted)] opacity-40'}`}
          title={project.hasClaudeMd ? 'Has CLAUDE.md instructions' : 'No CLAUDE.md'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Completion Bar */}
      <div className="mb-3">
        <div className="h-1.5 rounded-full bg-[var(--bg-primary)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${completion.percentage}%`,
              backgroundColor: completionColor
            }}
          />
        </div>
      </div>

      {/* Technologies */}
      {project.technologies && project.technologies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {project.technologies.slice(0, 5).map(tech => (
            <span key={tech} className="px-2 py-0.5 text-[10px] bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded font-mono text-[var(--text-muted)]">
              {tech}
            </span>
          ))}
          {project.technologies.length > 5 && (
            <span className="px-2 py-0.5 text-[10px] bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded font-mono text-[var(--accent-secondary)]">
              +{project.technologies.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Status badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {project.hasActiveSession && (
          <span className="px-1.5 py-0.5 text-[10px] rounded font-mono bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
            ACTIVE
          </span>
        )}
        {/* CLAUDE.md Edit Button */}
        {onEditClaudeMd && (
          <button
            onClick={() => onEditClaudeMd(project.name)}
            className={`px-2 py-0.5 text-[10px] rounded font-mono transition-all flex items-center gap-1 ${
              project.hasClaudeMd
                ? 'bg-[var(--accent-secondary)]/20 border border-[var(--accent-secondary)]/50 text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/30'
                : 'bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--accent-secondary)]/50 hover:text-[var(--accent-secondary)]'
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
            className="px-2 py-0.5 text-[10px] rounded font-mono transition-all flex items-center gap-1
                       bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)]
                       hover:border-[var(--accent-tertiary)]/50 hover:text-[var(--accent-tertiary)]"
            title="Check project compliance with standards"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            COMPLIANCE
          </button>
        )}
        {project.hasSessionData && (
          <span className="px-1.5 py-0.5 text-[10px] rounded font-mono bg-[var(--accent-tertiary)]/20 text-[var(--accent-tertiary)]">
            SESSIONS
          </span>
        )}
        {/* Skip Permissions Toggle */}
        <button
          onClick={() => onToggleSkipPermissions(project.name, project.skipPermissions)}
          className={`px-2 py-0.5 text-[10px] rounded font-mono transition-all flex items-center gap-1 ${
            project.skipPermissions
              ? 'bg-[var(--status-warning)]/20 border border-[var(--status-warning)]/50 text-[var(--status-warning)] hover:bg-[var(--status-warning)]/30'
              : 'bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--status-warning)]/50 hover:text-[var(--status-warning)]'
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
        <div className="mt-auto pt-3 border-t border-[var(--border-subtle)]/30">
          <div className="text-[10px] uppercase tracking-wider text-[var(--status-error)] mb-1.5 font-semibold flex items-center gap-1">
            <span>⚠</span> MISSING
          </div>
          <div className="flex flex-wrap gap-1">
            {completion.missing.slice(0, 4).map(item => (
              <span
                key={item}
                className="px-1.5 py-0.5 text-[9px] bg-[var(--status-error)]/10 border border-[var(--status-error)]/30 rounded text-[var(--status-error)]/80 font-mono"
              >
                {item}
              </span>
            ))}
            {completion.missing.length > 4 && (
              <span className="px-1.5 py-0.5 text-[9px] bg-[var(--status-error)]/10 border border-[var(--status-error)]/30 rounded text-[var(--status-error)] font-mono">
                +{completion.missing.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Last Modified */}
      {project.lastModified && (
        <div className="mt-2 text-[10px] text-[var(--text-muted)] font-mono">
          Last modified: {new Date(project.lastModified).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

export default ProjectsTab;
