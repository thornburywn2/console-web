/**
 * Create Project Modal Constants
 * Template library aligned with backend registry.json
 *
 * IMPORTANT: Only templates that exist in templates/registry.json are included here.
 * Each template maps to a backend template ID for actual project creation.
 */

// Template categories for organization
export const TEMPLATE_CATEGORIES = [
  { id: 'web', name: 'Web Applications', icon: '🌐' },
  { id: 'desktop', name: 'Desktop Apps', icon: '🖥️' },
  { id: 'mobile', name: 'Mobile Apps', icon: '📱' },
  { id: 'infra', name: 'Infrastructure', icon: '🔧' },
  { id: 'cli', name: 'CLI Tools', icon: '💻' },
];

// Project templates - ONLY templates with backend support
// Each template's `backendId` maps to registry.json
export const TEMPLATES = [
  // Web Applications
  {
    id: 'fullstack',
    backendId: 'web-app-fullstack',
    category: 'web',
    name: 'Full-Stack Web App',
    icon: '🚀',
    description: 'React frontend with Fastify backend, PostgreSQL database, complete with auth and API structure',
    stack: ['React 18', 'TypeScript', 'Fastify', 'Prisma', 'PostgreSQL', 'Tailwind CSS', 'shadcn/ui'],
    features: ['Authentication ready', 'Database migrations', 'API structure', 'Docker support', 'CI/CD workflows'],
    defaultPort: 5175,
    apiPort: 5176,
    recommended: true,
    difficulty: 'intermediate',
    keywords: ['website', 'web app', 'full stack', 'react', 'database', 'application', 'fastify', 'prisma'],
  },
  {
    id: 'frontend',
    backendId: 'web-app-frontend',
    category: 'web',
    name: 'Frontend SPA',
    icon: '🎨',
    description: 'Single-page React application with Vite, optimized for speed and developer experience',
    stack: ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'shadcn/ui'],
    features: ['Hot reload', 'Component library', 'Routing', 'State management', 'CI/CD workflows'],
    defaultPort: 5173,
    difficulty: 'beginner',
    keywords: ['frontend', 'spa', 'react', 'ui', 'interface', 'dashboard', 'vite'],
  },

  // Desktop Applications
  {
    id: 'tauri',
    backendId: 'desktop-tauri',
    category: 'desktop',
    name: 'Tauri Desktop App',
    icon: '🦀',
    description: 'Lightweight cross-platform desktop app with Tauri (Rust) and React',
    stack: ['Tauri 2', 'Rust', 'React 18', 'TypeScript', 'Tailwind CSS'],
    features: ['Small bundle size', 'Native performance', 'System APIs', 'Secure by default', 'Auto-updates'],
    defaultPort: 1420,
    difficulty: 'advanced',
    requirements: ['Rust', 'Cargo'],
    keywords: ['tauri', 'rust', 'desktop', 'native', 'lightweight', 'cross-platform', 'windows', 'mac', 'linux'],
  },

  // Mobile Applications
  {
    id: 'flutter',
    backendId: 'mobile-flutter',
    category: 'mobile',
    name: 'Flutter Mobile App',
    icon: '📱',
    description: 'Cross-platform mobile application with Flutter and Dart',
    stack: ['Flutter', 'Dart', 'Riverpod'],
    features: ['iOS & Android', 'Material Design', 'State management', 'Navigation', 'Hot reload'],
    difficulty: 'intermediate',
    requirements: ['Flutter SDK', 'Dart'],
    keywords: ['mobile', 'flutter', 'ios', 'android', 'app', 'phone', 'cross-platform'],
  },

  // Infrastructure
  {
    id: 'infrastructure',
    backendId: 'infrastructure',
    category: 'infra',
    name: 'Infrastructure Stack',
    icon: '🐳',
    description: 'Docker Compose infrastructure with services, networking, and Cloudflare Tunnel',
    stack: ['Docker', 'Docker Compose', 'Cloudflare Tunnel'],
    features: ['Service definitions', 'Networking', 'Volumes', 'Environment configs', 'Tunnel integration'],
    difficulty: 'intermediate',
    keywords: ['docker', 'compose', 'containers', 'infrastructure', 'deployment', 'devops', 'cloudflare'],
  },

  // CLI Tools
  {
    id: 'cli',
    backendId: 'cli-tool',
    category: 'cli',
    name: 'CLI Tool',
    icon: '💻',
    description: 'Command-line interface tool with argument parsing, interactive prompts, and colors',
    stack: ['Bun', 'TypeScript', 'Commander.js', 'Zod'],
    features: ['Subcommands', 'Interactive prompts', 'Config files', 'Auto-completion', 'CI/CD workflows'],
    difficulty: 'beginner',
    keywords: ['cli', 'command line', 'terminal', 'tool', 'utility', 'bun'],
  },
];

// Wizard steps - updated for new flow
export const STEPS = [
  { id: 'idea', label: 'Idea', icon: '💡' },
  { id: 'template', label: 'Template', icon: '📋' },
  { id: 'details', label: 'Details', icon: '📝' },
  { id: 'integrations', label: 'Integrations', icon: '🔗' },
  { id: 'review', label: 'Create', icon: '✨' },
];

// Common features that can be enabled
export const OPTIONAL_FEATURES = [
  { id: 'docker', name: 'Docker Setup', description: 'Dockerfile and docker-compose.yml' },
  { id: 'ci', name: 'CI/CD Pipeline', description: 'GitHub Actions workflow' },
  { id: 'testing', name: 'Testing Setup', description: 'Vitest with coverage' },
  { id: 'linting', name: 'Linting & Formatting', description: 'ESLint + Prettier' },
  { id: 'husky', name: 'Git Hooks', description: 'Husky + lint-staged' },
  { id: 'sentry', name: 'Error Tracking', description: 'Sentry integration' },
];

// Default ports by template category
export const DEFAULT_PORTS = {
  web: 5173,
  desktop: 1420,
  mobile: null,
  infra: null,
  cli: null,
};

// Helper to find templates by keywords
export function findTemplatesByKeywords(query) {
  if (!query?.trim()) return [];

  const words = query.toLowerCase().split(/\s+/);

  return TEMPLATES
    .map(template => {
      const keywordMatches = template.keywords?.filter(kw =>
        words.some(w => kw.includes(w) || w.includes(kw))
      ).length || 0;

      const nameMatch = words.some(w => template.name.toLowerCase().includes(w)) ? 2 : 0;
      const descMatch = words.some(w => template.description.toLowerCase().includes(w)) ? 1 : 0;

      return {
        ...template,
        score: keywordMatches * 3 + nameMatch + descMatch,
      };
    })
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score);
}

// Helper to generate project name from prompt
export function generateProjectName(prompt) {
  if (!prompt?.trim()) return '';

  // Extract potential name from prompt
  const words = prompt.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'that', 'this', 'want', 'need', 'create', 'build', 'make', 'new'].includes(w))
    .slice(0, 3);

  return words.join('-') || 'my-project';
}

// Helper to generate description from prompt
export function generateDescription(prompt, template) {
  if (!prompt?.trim()) return template?.description || '';

  // Clean up the prompt to be a description
  let desc = prompt.trim();

  // Capitalize first letter
  desc = desc.charAt(0).toUpperCase() + desc.slice(1);

  // Add period if missing
  if (!/[.!?]$/.test(desc)) desc += '.';

  return desc;
}
