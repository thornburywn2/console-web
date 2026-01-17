/**
 * Project Info View Component
 * Displays detailed project information
 */

import BackButton from './BackButton';
import { PRIORITY_OPTIONS } from './constants';

export default function ProjectInfoView({
  menuRef,
  menuStyle,
  project,
  projectInfo,
  projectTags,
  priority,
  loadingInfo,
  onBack,
  onClose,
}) {
  return (
    <div
      ref={menuRef}
      className="w-72 rounded-lg shadow-2xl overflow-hidden"
      style={{
        ...menuStyle,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <BackButton label="Project Info" onBack={onBack} onClose={onClose} />

      <div className="p-3 space-y-3">
        {loadingInfo ? (
          <div className="text-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full mx-auto" />
            <div className="text-xs text-muted mt-2">Loading...</div>
          </div>
        ) : projectInfo ? (
          <>
            <div>
              <div className="text-2xs text-muted uppercase mb-1">Project Name</div>
              <div className="text-sm font-semibold text-primary">{projectInfo.name || project.name}</div>
            </div>

            <div>
              <div className="text-2xs text-muted uppercase mb-1">Path</div>
              <div className="text-xs font-mono text-secondary break-all">{project.path}</div>
            </div>

            {projectTags.length > 0 && (
              <div>
                <div className="text-2xs text-muted uppercase mb-1">Tags</div>
                <div className="flex flex-wrap gap-1">
                  {projectTags.map(tag => (
                    <span
                      key={tag.id}
                      className="text-2xs px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                        border: `1px solid ${tag.color}40`,
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {priority && (
              <div>
                <div className="text-2xs text-muted uppercase mb-1">Priority</div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: PRIORITY_OPTIONS.find(p => p.value === priority)?.color }}
                >
                  {priority}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="text-2xs text-muted">Session</div>
                <div className={`text-xs font-semibold ${project.hasActiveSession ? 'text-green-400' : 'text-muted'}`}>
                  {project.hasActiveSession ? 'Active' : 'Inactive'}
                </div>
              </div>

              {project.lastModified && (
                <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="text-2xs text-muted">Modified</div>
                  <div className="text-xs text-secondary">
                    {new Date(project.lastModified).toLocaleDateString()}
                  </div>
                </div>
              )}

              {projectInfo.fileCount && (
                <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="text-2xs text-muted">Files</div>
                  <div className="text-xs text-secondary">{projectInfo.fileCount}</div>
                </div>
              )}

              {projectInfo.size && (
                <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="text-2xs text-muted">Size</div>
                  <div className="text-xs text-secondary">{projectInfo.size}</div>
                </div>
              )}
            </div>

            {projectInfo.git && (
              <div>
                <div className="text-2xs text-muted uppercase mb-1">Git</div>
                <div className="p-2 rounded space-y-1" style={{ background: 'var(--bg-tertiary)' }}>
                  {projectInfo.git.branch && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted">Branch:</span>
                      <span className="text-secondary font-mono">{projectInfo.git.branch}</span>
                    </div>
                  )}
                  {projectInfo.git.lastCommit && (
                    <div className="text-2xs text-muted truncate" title={projectInfo.git.lastCommit}>
                      {projectInfo.git.lastCommit}
                    </div>
                  )}
                </div>
              </div>
            )}

            {projectInfo.hasClaudeMd !== undefined && (
              <div className="flex items-center gap-2 text-xs">
                <span className={projectInfo.hasClaudeMd ? 'text-green-400' : 'text-amber-400'}>
                  {projectInfo.hasClaudeMd ? '✓' : '○'}
                </span>
                <span className="text-secondary">CLAUDE.md</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-muted text-xs">No info available</div>
        )}
      </div>
    </div>
  );
}
