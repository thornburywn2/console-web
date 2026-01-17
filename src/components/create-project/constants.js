/**
 * Create Project Modal Constants
 */

// Project templates
export const TEMPLATES = [
  {
    id: 'fullstack',
    name: 'Full-Stack Web App',
    icon: '🚀',
    description: 'React frontend with Fastify backend, PostgreSQL database',
    stack: ['React', 'Vite', 'Fastify', 'Prisma', 'Tailwind'],
    recommended: true,
  },
  {
    id: 'frontend',
    name: 'Frontend Only',
    icon: '🎨',
    description: 'React SPA with Vite, no backend',
    stack: ['React', 'Vite', 'Tailwind', 'shadcn/ui'],
  },
  {
    id: 'api',
    name: 'API Service',
    icon: '⚡',
    description: 'Backend API with Fastify and database',
    stack: ['Fastify', 'Prisma', 'PostgreSQL'],
  },
  {
    id: 'empty',
    name: 'Empty Project',
    icon: '📁',
    description: 'Just a folder with CLAUDE.md, configure everything yourself',
    stack: [],
  },
];

// Wizard steps
export const STEPS = [
  { id: 'basics', label: 'Basics' },
  { id: 'template', label: 'Template' },
  { id: 'network', label: 'Network' },
  { id: 'github', label: 'GitHub' },
  { id: 'review', label: 'Review' },
];
