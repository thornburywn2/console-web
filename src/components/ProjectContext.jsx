/**
 * Project Context Component
 * Display project health and tech stack information
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect } from 'react';
import { projectsApi } from '../services/api.js';

// Tech stack detection patterns
const TECH_PATTERNS = {
  React: ['react', 'react-dom'],
  Vue: ['vue'],
  Angular: ['@angular/core'],
  Svelte: ['svelte'],
  'Next.js': ['next'],
  Nuxt: ['nuxt'],
  TypeScript: ['typescript'],
  Vite: ['vite'],
  Webpack: ['webpack'],
  Tailwind: ['tailwindcss'],
  Express: ['express'],
  Fastify: ['fastify'],
  Prisma: ['prisma', '@prisma/client'],
  Docker: ['Dockerfile'],
  'Socket.IO': ['socket.io'],
};

function ProjectContext({ project }) {
  const [projectData, setProjectData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!project?.name) return;

      setIsLoading(true);
      try {
        const data = await projectsApi.listExtended();
        // Defensive: ensure data is an array before calling find
        const projects = Array.isArray(data) ? data : [];
        const found = projects.find((p) => p.name === project.name);
        setProjectData(found || null);
      } catch (err) {
        console.error('Error fetching project data:', err.getUserMessage?.() || err.message);
        setProjectData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [project?.name]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <svg className="w-5 h-5 animate-spin text-hacker-cyan" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  // completion is an object with {percentage, scores, weights, missing}
  const completionData = projectData?.completion || { percentage: 0, missing: [] };
  const completion = typeof completionData === 'number' ? completionData : completionData.percentage || 0;
  const techStack = projectData?.technologies || projectData?.techStack || [];
  const missing = completionData?.missing || projectData?.missing || [];

  // Get health status
  const getHealthStatus = (score) => {
    if (score >= 80) return { label: 'EXCELLENT', color: 'hacker-green' };
    if (score >= 60) return { label: 'GOOD', color: 'hacker-cyan' };
    if (score >= 40) return { label: 'FAIR', color: 'hacker-warning' };
    return { label: 'NEEDS WORK', color: 'hacker-error' };
  };

  const health = getHealthStatus(completion);

  return (
    <div className="space-y-3">
      {/* Project name */}
      <div className="text-xs font-mono text-hacker-cyan truncate font-semibold">{project.name}</div>

      {/* Health score */}
      <div>
        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
          <span className="text-hacker-text-dim">HEALTH SCORE</span>
          <span className={`text-${health.color} font-semibold`}>{health.label}</span>
        </div>
        <div className="h-2 bg-hacker-bg rounded-full overflow-hidden border border-hacker-green/10">
          <div
            className={`h-full bg-${health.color} transition-all duration-500 rounded-full`}
            style={{ width: `${completion}%` }}
          />
        </div>
        <div className="text-right text-[10px] font-mono text-hacker-text-dim mt-0.5">{completion}%</div>
      </div>

      {/* Tech stack badges */}
      {techStack.length > 0 && (
        <div>
          <div className="text-[10px] font-mono text-hacker-text-dim mb-1">TECH STACK</div>
          <div className="flex flex-wrap gap-1">
            {techStack.slice(0, 6).map((tech) => (
              <TechBadge key={tech} tech={tech} />
            ))}
            {techStack.length > 6 && (
              <span className="text-[10px] font-mono text-hacker-text-dim px-1">+{techStack.length - 6}</span>
            )}
          </div>
        </div>
      )}

      {/* Missing components */}
      {missing.length > 0 && (
        <div>
          <div className="text-[10px] font-mono text-hacker-text-dim mb-1">MISSING</div>
          <div className="flex flex-wrap gap-1">
            {missing.slice(0, 4).map((item) => (
              <span
                key={item}
                className="text-[10px] font-mono text-hacker-warning bg-hacker-warning/10 px-1.5 py-0.5 rounded border border-hacker-warning/20"
              >
                {item}
              </span>
            ))}
            {missing.length > 4 && (
              <span className="text-[10px] font-mono text-hacker-text-dim px-1">+{missing.length - 4}</span>
            )}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="flex gap-1 pt-1 border-t border-hacker-green/10">
        <QuickLink
          href={`vscode://file${project.path}`}
          label="VSCode"
          icon={
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          }
        />
        <QuickLink
          href={`file://${project.path}/README.md`}
          label="README"
          icon={
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
      </div>
    </div>
  );
}

// Tech badge component with color coding
function TechBadge({ tech }) {
  const colorMap = {
    React: 'cyan',
    Vue: 'green',
    Angular: 'error',
    TypeScript: 'cyan',
    Vite: 'purple',
    Tailwind: 'cyan',
    Express: 'green',
    Fastify: 'green',
    Prisma: 'purple',
    Docker: 'cyan',
    'Socket.IO': 'purple',
    'Next.js': 'green',
  };

  const color = colorMap[tech] || 'green';
  const colorClasses = {
    green: 'text-hacker-green bg-hacker-green/10 border-hacker-green/20',
    cyan: 'text-hacker-cyan bg-hacker-cyan/10 border-hacker-cyan/20',
    purple: 'text-hacker-purple bg-hacker-purple/10 border-hacker-purple/20',
    warning: 'text-hacker-warning bg-hacker-warning/10 border-hacker-warning/20',
    error: 'text-hacker-error bg-hacker-error/10 border-hacker-error/20',
  };

  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${colorClasses[color]}`}>{tech}</span>
  );
}

// Quick link button
function QuickLink({ href, label, icon }) {
  return (
    <a
      href={href}
      className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] font-mono text-hacker-text-dim hover:text-hacker-green hover:bg-hacker-green/10 transition-colors border border-hacker-green/10 hover:border-hacker-green/30"
      title={label}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

export default ProjectContext;
