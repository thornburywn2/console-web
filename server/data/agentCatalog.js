/**
 * AI Agent Marketplace Catalog
 * Pre-configured agent templates for automation tasks
 * Organized by category for easy browsing
 */

export const AGENT_CATALOG = {
  categories: [
    {
      id: 'code-quality',
      name: 'Code Quality',
      description: 'Linting, formatting, and code review automation',
      icon: 'CheckCircle'
    },
    {
      id: 'git-workflow',
      name: 'Git Workflow',
      description: 'Commit helpers, PR reviewers, branch management',
      icon: 'GitBranch'
    },
    {
      id: 'security',
      name: 'Security',
      description: 'Vulnerability scanning, secret detection, SAST',
      icon: 'Shield'
    },
    {
      id: 'testing',
      name: 'Testing',
      description: 'Test generation, coverage analysis, validation',
      icon: 'FlaskConical'
    },
    {
      id: 'documentation',
      name: 'Documentation',
      description: 'README generators, API docs, changelog automation',
      icon: 'FileText'
    },
    {
      id: 'devops',
      name: 'DevOps',
      description: 'CI/CD, deployment, monitoring automation',
      icon: 'Server'
    },
    {
      id: 'productivity',
      name: 'Productivity',
      description: 'Task automation, refactoring helpers, utilities',
      icon: 'Zap'
    }
  ],

  agents: [
    // ========== CODE QUALITY ==========
    {
      id: 'eslint-auto-fixer',
      name: 'ESLint Auto-Fixer',
      category: 'code-quality',
      description: 'Automatically fixes ESLint issues on file save. Keeps your code clean without manual intervention.',
      longDescription: `This agent runs ESLint with auto-fix on supported file types whenever they are saved.

**Features:**
- Auto-fixes fixable ESLint violations
- Configurable file extensions
- Works with project-local ESLint config
- Preserves unfixable issues for manual review

**Requirements:**
- ESLint installed in project (npm i -D eslint)
- Valid ESLint configuration file`,
      author: 'Console.web',
      version: '1.0.0',
      icon: 'CheckCircle',
      tags: ['linting', 'javascript', 'typescript', 'auto-fix', 'eslint'],
      actionType: 'shell',
      command: 'npx eslint --fix "{{filePath}}"',
      defaultTrigger: 'FILE_CHANGE',
      supportedTriggers: ['FILE_CHANGE', 'MANUAL', 'GIT_PRE_COMMIT'],
      configFields: [
        {
          name: 'extensions',
          label: 'File Extensions',
          type: 'text',
          default: '.js,.jsx,.ts,.tsx',
          description: 'Comma-separated list of extensions to lint'
        },
        {
          name: 'autoFix',
          label: 'Auto-fix Issues',
          type: 'boolean',
          default: true,
          description: 'Automatically fix fixable issues'
        }
      ],
      requirements: ['Node.js', 'ESLint'],
      repository: 'https://eslint.org'
    },
    {
      id: 'prettier-formatter',
      name: 'Prettier Formatter',
      category: 'code-quality',
      description: 'Formats code with Prettier on save. Consistent code style across your project.',
      longDescription: `Runs Prettier to format files automatically when saved.

**Features:**
- Formats on file save
- Respects .prettierrc configuration
- Works with .prettierignore
- Supports all Prettier-compatible languages

**Requirements:**
- Prettier installed in project`,
      author: 'Console.web',
      version: '1.0.0',
      icon: 'Paintbrush',
      tags: ['formatting', 'prettier', 'style', 'auto-format'],
      actionType: 'shell',
      command: 'npx prettier --write "{{filePath}}"',
      defaultTrigger: 'FILE_CHANGE',
      supportedTriggers: ['FILE_CHANGE', 'MANUAL', 'GIT_PRE_COMMIT'],
      configFields: [
        {
          name: 'extensions',
          label: 'File Extensions',
          type: 'text',
          default: '.js,.jsx,.ts,.tsx,.json,.css,.md',
          description: 'Comma-separated list of extensions to format'
        }
      ],
      requirements: ['Node.js', 'Prettier'],
      repository: 'https://prettier.io'
    },
    {
      id: 'dead-code-finder',
      name: 'Dead Code Finder',
      category: 'code-quality',
      description: 'Finds unused exports, variables, and dependencies in your codebase.',
      longDescription: `Scans your project for dead code that can be safely removed.

**Features:**
- Finds unused exports
- Detects unused dependencies
- Identifies unreachable code
- Reports unused variables

**Requirements:**
- ts-prune or knip installed`,
      author: 'Console.web',
      version: '1.0.0',
      icon: 'Trash2',
      tags: ['cleanup', 'unused-code', 'maintenance', 'typescript'],
      actionType: 'shell',
      command: 'npx knip',
      defaultTrigger: 'MANUAL',
      supportedTriggers: ['MANUAL', 'GIT_PRE_PUSH'],
      configFields: [
        {
          name: 'strict',
          label: 'Strict Mode',
          type: 'boolean',
          default: false,
          description: 'Enable strict mode for more thorough analysis'
        }
      ],
      requirements: ['Node.js', 'knip'],
      repository: 'https://github.com/webpro/knip'
    },

    // ========== GIT WORKFLOW ==========
    {
      id: 'commit-message-ai',
      name: 'Commit Message AI',
      category: 'git-workflow',
      description: 'AI-powered commit message suggestions based on staged changes.',
      longDescription: `Analyzes your staged changes and generates meaningful commit messages.

**Features:**
- Analyzes git diff for context
- Follows Conventional Commits format
- Suggests scope based on file paths
- Provides multiple message options

**How it works:**
Uses Claude to analyze staged changes and generate commit messages following best practices.`,
      author: 'Console.web',
      version: '1.0.0',
      icon: 'MessageSquare',
      tags: ['git', 'commit', 'ai', 'conventional-commits'],
      actionType: 'shell',
      command: 'git diff --cached | head -500',
      defaultTrigger: 'GIT_PRE_COMMIT',
      supportedTriggers: ['GIT_PRE_COMMIT', 'MANUAL'],
      configFields: [
        {
          name: 'style',
          label: 'Commit Style',
          type: 'select',
          options: ['conventional', 'descriptive', 'emoji'],
          default: 'conventional',
          description: 'Style of commit message to generate'
        },
        {
          name: 'maxLength',
          label: 'Max Subject Length',
          type: 'number',
          default: 72,
          description: 'Maximum characters for commit subject line'
        }
      ],
      requirements: ['Git'],
      repository: 'https://www.conventionalcommits.org'
    },
    {
      id: 'branch-cleaner',
      name: 'Branch Cleaner',
      category: 'git-workflow',
      description: 'Removes stale local branches that have been merged or deleted remotely.',
      longDescription: `Keeps your local git repository clean by removing branches that are no longer needed.

**Features:**
- Detects merged branches
- Finds branches deleted on remote
- Safe deletion (won't delete unmerged work)
- Dry-run mode for preview

**Safety:**
Never deletes main/master or current branch.`,
      author: 'Console.web',
      version: '1.0.0',
      icon: 'Scissors',
      tags: ['git', 'cleanup', 'branches', 'maintenance'],
      actionType: 'shell',
      command: 'git fetch -p && git branch -vv | grep "\\[.*: gone\\]" | awk "{print \\$1}" | xargs -r git branch -d',
      defaultTrigger: 'MANUAL',
      supportedTriggers: ['MANUAL', 'SESSION_START'],
      configFields: [
        {
          name: 'dryRun',
          label: 'Dry Run',
          type: 'boolean',
          default: true,
          description: 'Preview branches to delete without actually deleting'
        },
        {
          name: 'includeUnmerged',
          label: 'Include Unmerged',
          type: 'boolean',
          default: false,
          description: 'Also delete branches that are gone but not merged (dangerous)'
        }
      ],
      requirements: ['Git'],
      repository: 'https://git-scm.com'
    },

    // ========== SECURITY ==========
    {
      id: 'security-scanner',
      name: 'Security Scanner',
      category: 'security',
      description: 'Comprehensive security scan using npm audit and optional SAST tools.',
      longDescription: `Runs security scans to find vulnerabilities in your project.

**Features:**
- npm audit for dependency vulnerabilities
- Optional Semgrep SAST scanning
- Secret detection in code
- SBOM generation

**Severity levels:**
Reports critical, high, medium, and low severity issues.`,
      author: 'Console.web',
      version: '1.0.0',
      icon: 'Shield',
      tags: ['security', 'audit', 'vulnerabilities', 'npm'],
      actionType: 'shell',
      command: 'npm audit --json || true',
      defaultTrigger: 'GIT_PRE_PUSH',
      supportedTriggers: ['GIT_PRE_PUSH', 'GIT_PRE_COMMIT', 'MANUAL'],
      configFields: [
        {
          name: 'severity',
          label: 'Minimum Severity',
          type: 'select',
          options: ['critical', 'high', 'moderate', 'low'],
          default: 'high',
          description: 'Minimum severity level to fail on'
        },
        {
          name: 'enableSast',
          label: 'Enable SAST',
          type: 'boolean',
          default: false,
          description: 'Enable Semgrep static analysis (requires semgrep)'
        }
      ],
      requirements: ['Node.js', 'npm'],
      repository: 'https://docs.npmjs.com/cli/audit'
    },
    {
      id: 'secret-scanner',
      name: 'Secret Scanner',
      category: 'security',
      description: 'Scans for accidentally committed secrets, API keys, and credentials.',
      longDescription: `Prevents accidental credential exposure by scanning staged files.

**Detects:**
- API keys and tokens
- Database connection strings
- AWS credentials
- Private keys
- Passwords in code

**Runs on:**
Pre-commit to catch secrets before they're committed.`,
      author: 'Console.web',
      version: '1.0.0',
      icon: 'KeyRound',
      tags: ['security', 'secrets', 'credentials', 'prevention'],
      actionType: 'shell',
      command: 'git diff --cached --name-only | xargs grep -l -E "(api[_-]?key|secret|password|token|credential|private[_-]?key)" 2>/dev/null || echo "No secrets detected"',
      defaultTrigger: 'GIT_PRE_COMMIT',
      supportedTriggers: ['GIT_PRE_COMMIT', 'MANUAL'],
      configFields: [
        {
          name: 'patterns',
          label: 'Additional Patterns',
          type: 'text',
          default: '',
          description: 'Additional regex patterns to scan for (comma-separated)'
        }
      ],
      requirements: ['Git', 'grep'],
      repository: 'https://github.com/gitleaks/gitleaks'
    },

    // ========== TESTING ==========
    {
      id: 'test-runner',
      name: 'Test Runner',
      category: 'testing',
      description: 'Runs tests automatically when files change. Supports Jest, Vitest, and more.',
      longDescription: `Automatically runs relevant tests when source files are modified.

**Features:**
- Smart test selection based on changed files
- Watch mode support
- Coverage reporting
- Failed test notifications

**Supports:**
Jest, Vitest, Mocha, and other npm test runners.`,
      author: 'Console.web',
      version: '1.0.0',
      icon: 'TestTube2',
      tags: ['testing', 'jest', 'vitest', 'automation'],
      actionType: 'shell',
      command: 'npm test -- --passWithNoTests',
      defaultTrigger: 'FILE_CHANGE',
      supportedTriggers: ['FILE_CHANGE', 'GIT_PRE_PUSH', 'MANUAL'],
      configFields: [
        {
          name: 'coverage',
          label: 'Run Coverage',
          type: 'boolean',
          default: false,
          description: 'Generate coverage report'
        },
        {
          name: 'watchMode',
          label: 'Watch Mode',
          type: 'boolean',
          default: false,
          description: 'Keep tests running in watch mode'
        }
      ],
      requirements: ['Node.js', 'test framework'],
      repository: 'https://vitest.dev'
    },
    {
      id: 'test-generator',
      name: 'Test Generator',
      category: 'testing',
      description: 'AI-powered test generation for new functions and components.',
      longDescription: `Analyzes your code and generates appropriate unit tests.

**Generates:**
- Unit tests for functions
- Component tests for React
- Edge case coverage
- Mock suggestions

**Frameworks:**
Supports Jest, Vitest, and React Testing Library.`,
      author: 'Console.web',
      version: '1.0.0',
      icon: 'Wand2',
      tags: ['testing', 'ai', 'generation', 'unit-tests'],
      actionType: 'shell',
      command: 'cat "{{filePath}}"',
      defaultTrigger: 'MANUAL',
      supportedTriggers: ['MANUAL'],
      configFields: [
        {
          name: 'framework',
          label: 'Test Framework',
          type: 'select',
          options: ['vitest', 'jest', 'mocha'],
          default: 'vitest',
          description: 'Test framework to use'
        },
        {
          name: 'style',
          label: 'Test Style',
          type: 'select',
          options: ['describe-it', 'test-blocks'],
          default: 'describe-it',
          description: 'Test organization style'
        }
      ],
      requirements: ['Node.js', 'Test framework'],
      repository: 'https://vitest.dev'
    },

    // ========== DOCUMENTATION ==========
    {
      id: 'readme-generator',
      name: 'README Generator',
      category: 'documentation',
      description: 'Auto-generates or updates README.md based on project structure.',
      longDescription: `Scans your project and generates comprehensive documentation.

**Generates:**
- Project overview
- Installation instructions
- Usage examples
- API documentation
- License information

**Updates:**
Can update existing README while preserving custom sections.`,
      author: 'Console.web',
      version: '1.0.0',
      icon: 'BookOpen',
      tags: ['documentation', 'readme', 'markdown', 'auto-generate'],
      actionType: 'shell',
      command: 'cat package.json && ls -la',
      defaultTrigger: 'MANUAL',
      supportedTriggers: ['MANUAL'],
      configFields: [
        {
          name: 'sections',
          label: 'Sections',
          type: 'text',
          default: 'overview,install,usage,api,license',
          description: 'Comma-separated sections to generate'
        },
        {
          name: 'preserveCustom',
          label: 'Preserve Custom Content',
          type: 'boolean',
          default: true,
          description: 'Keep custom sections when updating'
        }
      ],
      requirements: [],
      repository: 'https://github.com'
    },
    {
      id: 'changelog-updater',
      name: 'Changelog Updater',
      category: 'documentation',
      description: 'Automatically updates CHANGELOG.md based on conventional commits.',
      longDescription: `Generates changelog entries from your commit history.

**Features:**
- Parses Conventional Commits
- Groups by version
- Categories: Features, Fixes, Breaking Changes
- Links to commits and issues

**Format:**
Follows Keep a Changelog format.`,
      author: 'Console.web',
      version: '1.0.0',
      icon: 'History',
      tags: ['documentation', 'changelog', 'versioning', 'releases'],
      actionType: 'shell',
      command: 'git log --oneline -20',
      defaultTrigger: 'MANUAL',
      supportedTriggers: ['MANUAL', 'GIT_POST_COMMIT'],
      configFields: [
        {
          name: 'format',
          label: 'Format',
          type: 'select',
          options: ['keepachangelog', 'conventional', 'simple'],
          default: 'keepachangelog',
          description: 'Changelog format style'
        }
      ],
      requirements: ['Git'],
      repository: 'https://keepachangelog.com'
    },

    // ========== DEVOPS ==========
    {
      id: 'dependency-checker',
      name: 'Dependency Checker',
      category: 'devops',
      description: 'Checks for outdated dependencies and suggests updates.',
      longDescription: `Monitors your project dependencies for updates and security issues.

**Features:**
- Checks for outdated packages
- Shows update types (major/minor/patch)
- Security vulnerability alerts
- Update command generation

**Modes:**
Interactive or automatic update.`,
      author: 'Console.web',
      version: '1.0.0',
      icon: 'Package',
      tags: ['dependencies', 'npm', 'updates', 'maintenance'],
      actionType: 'shell',
      command: 'npm outdated --json || true',
      defaultTrigger: 'SESSION_START',
      supportedTriggers: ['SESSION_START', 'MANUAL'],
      configFields: [
        {
          name: 'updateType',
          label: 'Update Type',
          type: 'select',
          options: ['major', 'minor', 'patch'],
          default: 'minor',
          description: 'Maximum update level to suggest'
        },
        {
          name: 'autoUpdate',
          label: 'Auto Update',
          type: 'boolean',
          default: false,
          description: 'Automatically apply safe updates'
        }
      ],
      requirements: ['Node.js', 'npm'],
      repository: 'https://docs.npmjs.com/cli/outdated'
    },
    {
      id: 'env-sync',
      name: 'Environment Sync',
      category: 'devops',
      description: 'Keeps .env.example in sync with .env, without exposing secrets.',
      longDescription: `Ensures your environment template stays up to date.

**Features:**
- Detects new environment variables
- Updates .env.example automatically
- Preserves placeholder values
- Never exposes actual secrets

**Triggers:**
Runs before commits to catch missing template updates.`,
      author: 'Console.web',
      version: '1.0.0',
      icon: 'RefreshCw',
      tags: ['environment', 'env', 'configuration', 'sync'],
      actionType: 'shell',
      command: 'diff <(cat .env | cut -d= -f1 | sort) <(cat .env.example | cut -d= -f1 | sort) || true',
      defaultTrigger: 'GIT_PRE_COMMIT',
      supportedTriggers: ['GIT_PRE_COMMIT', 'MANUAL'],
      configFields: [
        {
          name: 'sourcefile',
          label: 'Source File',
          type: 'text',
          default: '.env',
          description: 'Environment file with actual values'
        },
        {
          name: 'templateFile',
          label: 'Template File',
          type: 'text',
          default: '.env.example',
          description: 'Template file to update'
        }
      ],
      requirements: ['bash'],
      repository: 'https://github.com'
    },

    // ========== PRODUCTIVITY ==========
    {
      id: 'import-sorter',
      name: 'Import Sorter',
      category: 'productivity',
      description: 'Organizes and sorts imports in JavaScript/TypeScript files.',
      longDescription: `Keeps your imports clean and consistently organized.

**Features:**
- Sorts imports alphabetically
- Groups by type (external, internal, relative)
- Removes unused imports
- Configurable sort order

**Supports:**
JavaScript, TypeScript, JSX, TSX files.`,
      author: 'Console.web',
      version: '1.0.0',
      icon: 'ArrowUpDown',
      tags: ['imports', 'organization', 'cleanup', 'typescript'],
      actionType: 'shell',
      command: 'npx organize-imports-cli "{{filePath}}"',
      defaultTrigger: 'FILE_CHANGE',
      supportedTriggers: ['FILE_CHANGE', 'GIT_PRE_COMMIT', 'MANUAL'],
      configFields: [
        {
          name: 'groupOrder',
          label: 'Group Order',
          type: 'text',
          default: 'builtin,external,internal,parent,sibling,index',
          description: 'Order of import groups'
        }
      ],
      requirements: ['Node.js'],
      repository: 'https://github.com/lydell/eslint-plugin-simple-import-sort'
    }
  ]
};

/**
 * Get agents by category
 */
export function getAgentsByCategory(categoryId) {
  return AGENT_CATALOG.agents.filter(a => a.category === categoryId);
}

/**
 * Get a specific agent by ID
 */
export function getAgentById(agentId) {
  return AGENT_CATALOG.agents.find(a => a.id === agentId);
}

/**
 * Search agents by name, description, or tags
 */
export function searchAgents(query) {
  const q = query.toLowerCase();
  return AGENT_CATALOG.agents.filter(a =>
    a.name.toLowerCase().includes(q) ||
    a.description.toLowerCase().includes(q) ||
    a.tags.some(t => t.toLowerCase().includes(q))
  );
}

/**
 * Get all categories with agent counts
 */
export function getCategoriesWithCounts() {
  return AGENT_CATALOG.categories.map(cat => ({
    ...cat,
    agentCount: AGENT_CATALOG.agents.filter(a => a.category === cat.id).length
  }));
}

/**
 * Get agents by trigger type
 */
export function getAgentsByTrigger(triggerType) {
  return AGENT_CATALOG.agents.filter(a =>
    a.supportedTriggers.includes(triggerType)
  );
}

export default AGENT_CATALOG;
