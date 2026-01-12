/**
 * Voice Command Pattern Matching Engine
 * P0 Phase 2: Enhanced Command Pattern Matching
 *
 * Supports 50+ command patterns across 5 categories:
 * - Terminal/Claude Code commands
 * - Git commands
 * - Navigation commands
 * - UI commands
 * - Session commands
 *
 * Features:
 * - Regex pattern matching
 * - Fuzzy string matching with Levenshtein distance
 * - Multi-match disambiguation detection
 * - Confidence scoring with multiple algorithms
 */

import {
  fuzzyMatch,
  findBestMatches,
  suggestCommands,
  wordOverlapSimilarity
} from './fuzzyMatcher.js';

// Command pattern definitions
const PATTERNS = {
  // Terminal/Claude Code Commands
  terminal: [
    {
      patterns: [
        /^(?:ask|tell|hey)\s+claude\s+(.+)$/i,
        /^claude[,:]?\s+(.+)$/i,
        /^(?:can you|please|could you)\s+(.+)$/i
      ],
      action: 'claude-query',
      format: (match) => match[1],
      type: 'terminal',
      description: 'Send query to Claude Code'
    },
    {
      patterns: [
        /^run\s+(?:the\s+)?tests?$/i,
        /^(?:execute|start)\s+(?:the\s+)?tests?$/i,
        /^test\s+(?:the\s+)?(?:code|project)$/i
      ],
      action: 'run-tests',
      format: () => 'npm test',
      type: 'terminal',
      description: 'Run test suite'
    },
    {
      patterns: [
        /^run\s+(?:the\s+)?build$/i,
        /^build\s+(?:the\s+)?(?:project|app)$/i,
        /^(?:execute|start)\s+build$/i
      ],
      action: 'run-build',
      format: () => 'npm run build',
      type: 'terminal',
      description: 'Run build process'
    },
    {
      patterns: [
        /^(?:start|run)\s+(?:the\s+)?(?:dev\s+)?server$/i,
        /^(?:start|run)\s+development$/i,
        /^(?:npm\s+)?run\s+dev$/i
      ],
      action: 'start-dev',
      format: () => 'npm run dev',
      type: 'terminal',
      description: 'Start development server'
    },
    {
      patterns: [
        /^install\s+(?:the\s+)?(?:dependencies|packages)$/i,
        /^(?:run\s+)?npm\s+install$/i
      ],
      action: 'npm-install',
      format: () => 'npm install',
      type: 'terminal',
      description: 'Install dependencies'
    },
    {
      patterns: [
        /^install\s+(?:package\s+)?(.+)$/i,
        /^add\s+(?:package\s+)?(.+)$/i,
        /^npm\s+install\s+(.+)$/i
      ],
      action: 'install-package',
      format: (match) => `npm install ${match[1]}`,
      type: 'terminal',
      description: 'Install specific package'
    },
    {
      patterns: [
        /^(?:clear|cls)(?:\s+(?:the\s+)?(?:terminal|screen))?$/i
      ],
      action: 'clear-terminal',
      format: () => 'clear',
      type: 'terminal',
      description: 'Clear terminal'
    },
    {
      patterns: [
        /^(?:stop|cancel|abort|ctrl\s*c)$/i,
        /^(?:kill|terminate)\s+(?:the\s+)?(?:process|command)$/i,
        /^interrupt$/i
      ],
      action: 'send-interrupt',
      format: () => '\x03', // Ctrl+C
      type: 'terminal',
      description: 'Send interrupt signal'
    },
    {
      patterns: [
        /^(?:show|list|display)\s+(?:the\s+)?files?$/i,
        /^(?:what(?:'s| is)\s+(?:in\s+)?(?:this|the)\s+)?(?:directory|folder)$/i,
        /^ls$/i
      ],
      action: 'list-files',
      format: () => 'ls -la',
      type: 'terminal',
      description: 'List directory contents'
    },
    {
      patterns: [
        /^(?:go\s+(?:to|into)|cd|change\s+(?:to|directory))\s+(.+)$/i,
        /^(?:open|enter)\s+(?:the\s+)?(?:folder|directory)\s+(.+)$/i
      ],
      action: 'change-directory',
      format: (match) => `cd ${match[1]}`,
      type: 'terminal',
      description: 'Change directory'
    },
    {
      patterns: [
        /^(?:show|display|cat|read)\s+(?:the\s+)?(?:file\s+)?(.+)$/i,
        /^(?:what(?:'s| is)\s+in)\s+(.+)$/i
      ],
      action: 'show-file',
      format: (match) => `cat ${match[1]}`,
      type: 'terminal',
      description: 'Display file contents'
    },
    {
      patterns: [
        /^(?:create|make|touch)\s+(?:file\s+)?(.+)$/i,
        /^(?:new)\s+file\s+(.+)$/i
      ],
      action: 'create-file',
      format: (match) => `touch ${match[1]}`,
      type: 'terminal',
      description: 'Create new file'
    },
    {
      patterns: [
        /^(?:delete|remove|rm)\s+(?:file\s+)?(.+)$/i
      ],
      action: 'delete-file',
      format: (match) => `rm ${match[1]}`,
      type: 'terminal',
      description: 'Delete file'
    },
    {
      patterns: [
        /^lint(?:\s+(?:the\s+)?code)?$/i,
        /^run\s+(?:the\s+)?linter$/i,
        /^(?:check|fix)\s+(?:code\s+)?style$/i
      ],
      action: 'run-lint',
      format: () => 'npm run lint',
      type: 'terminal',
      description: 'Run linter'
    },
    {
      patterns: [
        /^format(?:\s+(?:the\s+)?code)?$/i,
        /^(?:run\s+)?prettier$/i
      ],
      action: 'run-format',
      format: () => 'npm run format',
      type: 'terminal',
      description: 'Format code'
    },
    {
      patterns: [
        /^type\s*check$/i,
        /^check\s+types?$/i,
        /^(?:run\s+)?tsc$/i
      ],
      action: 'run-typecheck',
      format: () => 'npm run type-check',
      type: 'terminal',
      description: 'Run type check'
    }
  ],

  // Git Commands
  git: [
    {
      patterns: [
        /^(?:git\s+)?status$/i,
        /^(?:show|check)\s+(?:git\s+)?status$/i,
        /^(?:what(?:'s| is)\s+(?:the\s+)?)?(?:git\s+)?status$/i
      ],
      action: 'git-status',
      format: () => 'git status',
      type: 'terminal',
      description: 'Show git status'
    },
    {
      patterns: [
        /^commit\s+(?:with\s+message\s+)?(?:"|')?(.+?)(?:"|')?$/i,
        /^(?:git\s+)?commit\s+(.+)$/i,
        /^save\s+(?:changes|work)\s+(?:as\s+)?(?:"|')?(.+?)(?:"|')?$/i
      ],
      action: 'git-commit',
      format: (match) => `git add -A && git commit -m "${match[1].replace(/"/g, '\\"')}"`,
      type: 'terminal',
      description: 'Stage and commit changes'
    },
    {
      patterns: [
        /^push(?:\s+(?:to\s+)?(?:remote|origin))?$/i,
        /^(?:git\s+)?push$/i,
        /^upload\s+(?:changes|commits)$/i
      ],
      action: 'git-push',
      format: () => 'git push',
      type: 'terminal',
      description: 'Push to remote'
    },
    {
      patterns: [
        /^pull(?:\s+(?:from\s+)?(?:remote|origin))?$/i,
        /^(?:git\s+)?pull$/i,
        /^(?:get|fetch)\s+(?:latest\s+)?changes$/i
      ],
      action: 'git-pull',
      format: () => 'git pull',
      type: 'terminal',
      description: 'Pull from remote'
    },
    {
      patterns: [
        /^(?:show\s+)?(?:the\s+)?diff$/i,
        /^(?:what(?:'s| are)\s+(?:the\s+)?)?changes$/i,
        /^(?:git\s+)?diff$/i
      ],
      action: 'git-diff',
      format: () => 'git diff',
      type: 'terminal',
      description: 'Show changes'
    },
    {
      patterns: [
        /^(?:create|make|new)\s+branch\s+(.+)$/i,
        /^(?:git\s+)?(?:checkout|switch)\s+-b\s+(.+)$/i,
        /^branch\s+(.+)$/i
      ],
      action: 'git-branch-create',
      format: (match) => `git checkout -b ${match[1].replace(/\s+/g, '-')}`,
      type: 'terminal',
      description: 'Create new branch'
    },
    {
      patterns: [
        /^(?:switch|checkout)\s+(?:to\s+)?(?:branch\s+)?(.+)$/i,
        /^(?:go\s+to|change\s+to)\s+branch\s+(.+)$/i
      ],
      action: 'git-checkout',
      format: (match) => `git checkout ${match[1]}`,
      type: 'terminal',
      description: 'Switch branch'
    },
    {
      patterns: [
        /^(?:show\s+)?(?:the\s+)?(?:git\s+)?log$/i,
        /^(?:recent\s+)?commits$/i,
        /^(?:commit\s+)?history$/i
      ],
      action: 'git-log',
      format: () => 'git log --oneline -10',
      type: 'terminal',
      description: 'Show recent commits'
    },
    {
      patterns: [
        /^(?:show\s+)?(?:all\s+)?branches$/i,
        /^(?:list\s+)?branches$/i,
        /^(?:git\s+)?branch(?:\s+-a)?$/i
      ],
      action: 'git-branches',
      format: () => 'git branch -a',
      type: 'terminal',
      description: 'List all branches'
    },
    {
      patterns: [
        /^(?:git\s+)?stash$/i,
        /^stash\s+(?:changes|work)$/i,
        /^save\s+(?:for\s+)?later$/i
      ],
      action: 'git-stash',
      format: () => 'git stash',
      type: 'terminal',
      description: 'Stash changes'
    },
    {
      patterns: [
        /^(?:git\s+)?stash\s+pop$/i,
        /^(?:restore|apply)\s+stash$/i,
        /^pop\s+stash$/i
      ],
      action: 'git-stash-pop',
      format: () => 'git stash pop',
      type: 'terminal',
      description: 'Apply stashed changes'
    },
    {
      patterns: [
        /^(?:undo|revert)\s+(?:last\s+)?commit$/i,
        /^(?:git\s+)?reset\s+(?:--)?soft$/i
      ],
      action: 'git-reset-soft',
      format: () => 'git reset --soft HEAD~1',
      type: 'terminal',
      description: 'Undo last commit (keep changes)'
    }
  ],

  // Navigation Commands
  navigation: [
    {
      patterns: [
        /^(?:go\s+to|open|show|switch\s+to)\s+(?:the\s+)?projects?(?:\s+(?:view|page|list))?$/i,
        /^projects?$/i
      ],
      action: 'navigate-projects',
      route: '/projects',
      type: 'navigation',
      description: 'Navigate to projects'
    },
    {
      patterns: [
        /^(?:go\s+to|open|show|switch\s+to)\s+(?:the\s+)?(?:terminal|console)$/i,
        /^terminal$/i
      ],
      action: 'navigate-terminal',
      route: '/terminal',
      type: 'navigation',
      description: 'Navigate to terminal'
    },
    {
      patterns: [
        /^(?:go\s+to|open|show|switch\s+to)\s+(?:the\s+)?(?:admin|dashboard)$/i,
        /^(?:admin|dashboard)$/i
      ],
      action: 'navigate-admin',
      route: '/admin',
      type: 'navigation',
      description: 'Navigate to admin dashboard'
    },
    {
      patterns: [
        /^(?:go\s+to|open|show|switch\s+to)\s+(?:the\s+)?settings?$/i,
        /^settings?$/i
      ],
      action: 'navigate-settings',
      route: '/settings',
      type: 'navigation',
      description: 'Navigate to settings'
    },
    {
      patterns: [
        /^(?:open|switch\s+to|select)\s+(?:project\s+)?(.+)$/i,
        /^(?:work\s+on|go\s+to\s+project)\s+(.+)$/i
      ],
      action: 'open-project',
      format: (match) => ({ project: match[1] }),
      type: 'navigation',
      description: 'Open specific project'
    },
    {
      patterns: [
        /^(?:go\s+)?back$/i,
        /^(?:previous|back)\s+(?:page|view)$/i
      ],
      action: 'navigate-back',
      type: 'navigation',
      description: 'Go back'
    },
    {
      patterns: [
        /^(?:go\s+)?(?:home|start)$/i,
        /^(?:main|home)\s+(?:page|view)$/i
      ],
      action: 'navigate-home',
      route: '/',
      type: 'navigation',
      description: 'Go to home'
    }
  ],

  // UI Commands
  ui: [
    {
      patterns: [
        /^(?:toggle|show|hide|open|close)\s+(?:the\s+)?sidebar$/i
      ],
      action: 'toggle-sidebar',
      type: 'ui',
      description: 'Toggle sidebar'
    },
    {
      patterns: [
        /^(?:dark|night)\s+mode$/i,
        /^(?:switch\s+to|enable)\s+dark(?:\s+mode)?$/i
      ],
      action: 'theme-dark',
      type: 'ui',
      description: 'Switch to dark mode'
    },
    {
      patterns: [
        /^(?:light|day)\s+mode$/i,
        /^(?:switch\s+to|enable)\s+light(?:\s+mode)?$/i
      ],
      action: 'theme-light',
      type: 'ui',
      description: 'Switch to light mode'
    },
    {
      patterns: [
        /^(?:full\s*screen|maximize)$/i,
        /^(?:enter|toggle)\s+full\s*screen$/i
      ],
      action: 'fullscreen-toggle',
      type: 'ui',
      description: 'Toggle fullscreen'
    },
    {
      patterns: [
        /^(?:exit|leave)\s+full\s*screen$/i,
        /^(?:restore|minimize)$/i
      ],
      action: 'fullscreen-exit',
      type: 'ui',
      description: 'Exit fullscreen'
    },
    {
      patterns: [
        /^(?:zoom|scale)\s+(?:in|up)$/i,
        /^(?:make\s+(?:it\s+)?)?(?:bigger|larger)$/i
      ],
      action: 'zoom-in',
      type: 'ui',
      description: 'Zoom in'
    },
    {
      patterns: [
        /^(?:zoom|scale)\s+(?:out|down)$/i,
        /^(?:make\s+(?:it\s+)?)?smaller$/i
      ],
      action: 'zoom-out',
      type: 'ui',
      description: 'Zoom out'
    },
    {
      patterns: [
        /^(?:reset|default)\s+zoom$/i,
        /^(?:zoom\s+)?(?:100|normal|reset)(?:\s*%)?$/i
      ],
      action: 'zoom-reset',
      type: 'ui',
      description: 'Reset zoom'
    },
    {
      patterns: [
        /^(?:open|show)\s+(?:the\s+)?command\s+palette$/i,
        /^commands?$/i
      ],
      action: 'command-palette',
      type: 'ui',
      description: 'Open command palette'
    },
    {
      patterns: [
        /^(?:open|show)\s+(?:the\s+)?prompt(?:s|\s+library)?$/i,
        /^prompts?$/i
      ],
      action: 'open-prompts',
      type: 'ui',
      description: 'Open prompt library'
    },
    {
      patterns: [
        /^(?:open|show)\s+(?:the\s+)?snippets?(?:\s+palette)?$/i,
        /^snippets?$/i
      ],
      action: 'open-snippets',
      type: 'ui',
      description: 'Open snippet palette'
    },
    {
      patterns: [
        /^(?:open|show)\s+(?:the\s+)?themes?(?:\s+picker)?$/i,
        /^themes?$/i,
        /^change\s+theme$/i
      ],
      action: 'open-themes',
      type: 'ui',
      description: 'Open theme picker'
    },
    {
      patterns: [
        /^(?:open|show)\s+(?:keyboard\s+)?shortcuts?$/i,
        /^shortcuts?$/i,
        /^(?:help|hotkeys)$/i
      ],
      action: 'show-shortcuts',
      type: 'ui',
      description: 'Show keyboard shortcuts'
    },
    {
      patterns: [
        /^refresh$/i,
        /^reload(?:\s+(?:the\s+)?page)?$/i
      ],
      action: 'refresh',
      type: 'ui',
      description: 'Refresh page'
    }
  ],

  // Session Commands
  session: [
    {
      patterns: [
        /^(?:new|create|start)\s+(?:a\s+)?(?:new\s+)?session$/i,
        /^(?:new|fresh)\s+terminal$/i
      ],
      action: 'session-new',
      type: 'session',
      description: 'Create new session'
    },
    {
      patterns: [
        /^(?:save|persist)\s+(?:the\s+)?session$/i,
        /^(?:keep|store)\s+(?:this\s+)?session$/i
      ],
      action: 'session-save',
      type: 'session',
      description: 'Save current session'
    },
    {
      patterns: [
        /^(?:close|end|kill|terminate)\s+(?:the\s+)?session$/i,
        /^(?:exit|quit)(?:\s+session)?$/i
      ],
      action: 'session-close',
      type: 'session',
      description: 'Close session'
    },
    {
      patterns: [
        /^(?:rename|name)\s+session\s+(?:to\s+)?(.+)$/i,
        /^(?:call|set)\s+(?:this\s+)?session\s+(.+)$/i
      ],
      action: 'session-rename',
      format: (match) => ({ name: match[1] }),
      type: 'session',
      description: 'Rename session'
    },
    {
      patterns: [
        /^(?:show|list)\s+(?:all\s+)?sessions?$/i,
        /^(?:my\s+)?sessions?$/i
      ],
      action: 'session-list',
      type: 'session',
      description: 'List sessions'
    },
    {
      patterns: [
        /^(?:create\s+)?checkpoint$/i,
        /^save\s+(?:a\s+)?snapshot$/i,
        /^(?:take\s+)?backup$/i
      ],
      action: 'checkpoint-create',
      type: 'session',
      description: 'Create checkpoint'
    },
    {
      patterns: [
        /^(?:show|view)\s+checkpoints?$/i,
        /^(?:list\s+)?checkpoints?$/i
      ],
      action: 'checkpoint-list',
      type: 'session',
      description: 'View checkpoints'
    }
  ],

  // Aider Commands (P1 Integration)
  aider: [
    {
      patterns: [
        /^(?:start|open|launch)\s+aider$/i,
        /^(?:switch\s+to|use)\s+aider$/i,
        /^aider\s+mode$/i
      ],
      action: 'aider-start',
      type: 'aider',
      description: 'Start Aider session'
    },
    {
      patterns: [
        /^(?:stop|close|exit|quit)\s+aider$/i,
        /^(?:end|terminate)\s+aider(?:\s+session)?$/i
      ],
      action: 'aider-stop',
      type: 'aider',
      description: 'Stop Aider session'
    },
    {
      patterns: [
        /^(?:start\s+)?aider\s+voice$/i,
        /^(?:enable|turn\s+on)\s+aider\s+voice$/i,
        /^voice\s+mode\s+aider$/i
      ],
      action: 'aider-voice-start',
      type: 'aider',
      description: 'Start Aider voice mode'
    },
    {
      patterns: [
        /^(?:stop|disable|turn\s+off)\s+aider\s+voice$/i,
        /^(?:end|exit)\s+aider\s+voice(?:\s+mode)?$/i
      ],
      action: 'aider-voice-stop',
      type: 'aider',
      description: 'Stop Aider voice mode'
    },
    {
      patterns: [
        /^(?:aider\s+)?add\s+file\s+(.+)$/i,
        /^aider\s+add\s+(.+)$/i
      ],
      action: 'aider-add-file',
      format: (match) => `/add ${match[1]}`,
      type: 'aider',
      description: 'Add file to Aider context'
    },
    {
      patterns: [
        /^(?:aider\s+)?(?:drop|remove)\s+file\s+(.+)$/i,
        /^aider\s+drop\s+(.+)$/i
      ],
      action: 'aider-drop-file',
      format: (match) => `/drop ${match[1]}`,
      type: 'aider',
      description: 'Remove file from Aider context'
    },
    {
      patterns: [
        /^(?:aider\s+)?(?:show\s+)?diff$/i,
        /^(?:what\s+did\s+aider\s+)?chang(?:e|es)$/i
      ],
      action: 'aider-diff',
      format: () => '/diff',
      type: 'aider',
      description: 'Show Aider changes'
    },
    {
      patterns: [
        /^(?:aider\s+)?undo$/i,
        /^(?:undo|revert)\s+aider(?:\s+changes)?$/i
      ],
      action: 'aider-undo',
      format: () => '/undo',
      type: 'aider',
      description: 'Undo Aider changes'
    },
    {
      patterns: [
        /^(?:aider\s+)?clear(?:\s+(?:history|context))?$/i,
        /^(?:reset|clear)\s+aider$/i
      ],
      action: 'aider-clear',
      format: () => '/clear',
      type: 'aider',
      description: 'Clear Aider history'
    },
    {
      patterns: [
        /^(?:aider\s+)?(?:help|commands?)$/i,
        /^(?:show\s+)?aider\s+(?:help|commands?)$/i
      ],
      action: 'aider-help',
      format: () => '/help',
      type: 'aider',
      description: 'Show Aider help'
    },
    {
      patterns: [
        /^(?:tell|ask)\s+aider\s+(?:to\s+)?(.+)$/i,
        /^aider[,:]?\s+(.+)$/i
      ],
      action: 'aider-query',
      format: (match) => match[1],
      type: 'aider',
      description: 'Send query to Aider'
    },
    {
      patterns: [
        /^(?:switch\s+(?:back\s+)?to|use)\s+claude(?:\s+code)?$/i,
        /^claude\s+mode$/i,
        /^(?:exit|leave)\s+aider$/i
      ],
      action: 'switch-to-claude',
      type: 'mode-switch',
      description: 'Switch to Claude Code mode'
    },
    {
      patterns: [
        /^(?:what\s+)?model(?:\s+is\s+aider\s+using)?$/i,
        /^(?:aider\s+)?current\s+model$/i
      ],
      action: 'aider-model',
      format: () => '/model',
      type: 'aider',
      description: 'Show current Aider model'
    },
    {
      patterns: [
        /^(?:change|switch|set)\s+(?:aider\s+)?model\s+(?:to\s+)?(.+)$/i,
        /^(?:use\s+)?model\s+(.+)$/i
      ],
      action: 'aider-set-model',
      format: (match) => `/model ${match[1]}`,
      type: 'aider',
      description: 'Change Aider model'
    },
    {
      patterns: [
        /^(?:aider\s+)?commit(?:\s+(?:changes|work))?$/i,
        /^(?:save|commit)\s+aider\s+(?:changes|work)$/i
      ],
      action: 'aider-commit',
      format: () => '/commit',
      type: 'aider',
      description: 'Commit Aider changes'
    }
  ]
}

/**
 * Calculate confidence score for a match
 * @param {string} transcript - Original transcript
 * @param {RegExp} pattern - Matched pattern
 * @param {Array} match - Regex match result
 * @returns {number} Confidence score 0-1
 */
function calculateConfidence(transcript, pattern, match) {
  let confidence = 0.8; // Base confidence for regex match

  // Boost for exact matches
  if (match[0].toLowerCase().trim() === transcript.toLowerCase().trim()) {
    confidence += 0.15;
  }

  // Boost for longer matches (more context)
  if (transcript.length > 15) {
    confidence += 0.03;
  }

  // Boost if match covers most of the input
  const coverage = match[0].length / transcript.length;
  if (coverage > 0.9) {
    confidence += 0.02;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Find suggestions for failed or low-confidence matches
 * @param {string} transcript - Original transcript
 * @returns {Array} Suggestions
 */
function findSuggestions(transcript) {
  const suggestions = [];
  const words = transcript.toLowerCase().split(/\s+/);

  // Check for partial matches
  for (const [category, patterns] of Object.entries(PATTERNS)) {
    for (const item of patterns) {
      const desc = item.description.toLowerCase();
      const action = item.action.toLowerCase().replace(/-/g, ' ');

      // Check if any words match the description or action
      if (words.some(word => word.length > 2 && (desc.includes(word) || action.includes(word)))) {
        suggestions.push({
          action: item.action,
          description: item.description,
          category,
          example: getExamplePhrase(item.patterns[0])
        });
      }
    }
  }

  // Remove duplicates and limit
  const unique = [];
  const seen = new Set();
  for (const s of suggestions) {
    if (!seen.has(s.action)) {
      seen.add(s.action);
      unique.push(s);
    }
  }

  return unique.slice(0, 5);
}

/**
 * Get an example phrase from a regex pattern
 * @param {RegExp} pattern - Regex pattern
 * @returns {string} Example phrase
 */
function getExamplePhrase(pattern) {
  // Simple extraction - remove regex syntax
  let example = pattern.source
    .replace(/\(\?:[^)]+\)/g, '') // Remove non-capturing groups
    .replace(/\\s\+/g, ' ')       // Replace \s+ with space
    .replace(/\\s\*/g, ' ')       // Replace \s* with space
    .replace(/[\[\]()^$.*+?{}|\\]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')         // Normalize spaces
    .trim();

  return example.charAt(0).toUpperCase() + example.slice(1);
}

/**
 * Parse a voice transcript into a command
 * @param {string} transcript - The voice transcript
 * @param {Object} options - Parsing options
 * @returns {Object} Parsed command with confidence
 */
export function parseCommand(transcript, options = {}) {
  const {
    enableFuzzy = true,         // Enable fuzzy matching
    fuzzyThreshold = 0.65,      // Minimum fuzzy match score
    disambiguationThreshold = 0.15, // Max score diff for disambiguation
    returnMultiple = false      // Return multiple matches for disambiguation
  } = options;

  const trimmed = transcript.trim();

  if (!trimmed) {
    return {
      type: 'unknown',
      action: null,
      command: null,
      confidence: 0,
      suggestions: [],
      needsDisambiguation: false,
      alternatives: []
    };
  }

  const allMatches = [];

  // Try each category with regex patterns
  for (const [category, patterns] of Object.entries(PATTERNS)) {
    for (const item of patterns) {
      for (const pattern of item.patterns) {
        const match = trimmed.match(pattern);

        if (match) {
          const confidence = calculateConfidence(trimmed, pattern, match);
          const command = item.format ? item.format(match) : null;

          allMatches.push({
            type: item.type || category,
            action: item.action,
            command: typeof command === 'string' ? command : null,
            parameters: typeof command === 'object' ? command : null,
            route: item.route || null,
            confidence,
            description: item.description,
            category,
            matchMethod: 'regex'
          });
        }
      }
    }
  }

  // If no regex match and fuzzy is enabled, try fuzzy matching
  if (allMatches.length === 0 && enableFuzzy) {
    const fuzzyMatches = findFuzzyMatches(trimmed, fuzzyThreshold);
    allMatches.push(...fuzzyMatches);
  }

  // Sort by confidence
  allMatches.sort((a, b) => b.confidence - a.confidence);

  // Check for disambiguation needed (multiple close matches)
  const needsDisambiguation = allMatches.length > 1 &&
    (allMatches[0].confidence - allMatches[1].confidence) < disambiguationThreshold;

  // Return best match with alternatives if needed
  if (allMatches.length > 0) {
    const best = allMatches[0];
    const alternatives = allMatches.slice(1, 5).map(m => ({
      action: m.action,
      description: m.description,
      confidence: m.confidence,
      command: m.command
    }));

    return {
      ...best,
      suggestions: [],
      needsDisambiguation,
      alternatives: needsDisambiguation ? alternatives : [],
      ...(returnMultiple && { allMatches })
    };
  }

  // No match found - return with suggestions
  const suggestions = findSuggestions(trimmed);
  const fuzzySuggestions = enableFuzzy ? suggestCommands(trimmed, getAllCommandsFlat()) : [];

  return {
    type: 'unknown',
    action: 'passthrough',
    command: trimmed, // Pass through as raw text to Claude
    confidence: 0.4,
    description: 'Send to Claude Code',
    matchMethod: 'passthrough',
    suggestions: [...suggestions, ...fuzzySuggestions.slice(0, 3)],
    needsDisambiguation: false,
    alternatives: []
  };
}

/**
 * Find fuzzy matches using string similarity
 * @param {string} transcript - The voice transcript
 * @param {number} threshold - Minimum match score
 * @returns {Array} Fuzzy matches
 */
function findFuzzyMatches(transcript, threshold = 0.65) {
  const matches = [];

  for (const [category, patterns] of Object.entries(PATTERNS)) {
    for (const item of patterns) {
      // Check against description
      const descMatch = fuzzyMatch(transcript, item.description);

      // Check against action name (with dashes converted to spaces)
      const actionMatch = fuzzyMatch(transcript, item.action.replace(/-/g, ' '));

      // Check against example phrases
      let bestExampleScore = 0;
      for (const pattern of item.patterns) {
        const example = getExamplePhrase(pattern);
        const exampleMatch = fuzzyMatch(transcript, example);
        bestExampleScore = Math.max(bestExampleScore, exampleMatch.score);
      }

      // Word overlap for partial matches
      const wordOverlap = wordOverlapSimilarity(transcript, item.description);

      // Best score across all methods
      const bestScore = Math.max(
        descMatch.score,
        actionMatch.score,
        bestExampleScore,
        wordOverlap
      );

      if (bestScore >= threshold) {
        // Generate command
        const fakeMatch = [transcript, transcript]; // Passthrough for format
        const command = item.format ? item.format(fakeMatch) : null;

        matches.push({
          type: item.type || category,
          action: item.action,
          command: typeof command === 'string' ? command : null,
          parameters: typeof command === 'object' ? command : null,
          route: item.route || null,
          confidence: bestScore * 0.9, // Slightly lower confidence for fuzzy matches
          description: item.description,
          category,
          matchMethod: 'fuzzy',
          fuzzyDetails: {
            descriptionScore: descMatch.score,
            actionScore: actionMatch.score,
            exampleScore: bestExampleScore,
            wordOverlap
          }
        });
      }
    }
  }

  return matches;
}

/**
 * Enhanced parseCommand with disambiguation support
 * Returns multiple options when commands are ambiguous
 * @param {string} transcript - The voice transcript
 * @returns {Object} Result with possible disambiguation
 */
export function parseCommandWithDisambiguation(transcript) {
  return parseCommand(transcript, {
    enableFuzzy: true,
    disambiguationThreshold: 0.15,
    returnMultiple: true
  });
}

/**
 * Get all available commands grouped by category
 * @returns {Object} Commands grouped by category
 */
export function getAllCommands() {
  const commands = {};

  for (const [category, patterns] of Object.entries(PATTERNS)) {
    commands[category] = patterns.map(item => ({
      action: item.action,
      description: item.description,
      type: item.type || category,
      examples: item.patterns.slice(0, 2).map(p => getExamplePhrase(p))
    }));
  }

  return commands;
}

/**
 * Get a flat list of all commands
 * @returns {Array} All commands
 */
export function getAllCommandsFlat() {
  const commands = [];

  for (const [category, patterns] of Object.entries(PATTERNS)) {
    for (const item of patterns) {
      commands.push({
        action: item.action,
        description: item.description,
        category,
        type: item.type || category,
        examples: item.patterns.slice(0, 2).map(p => getExamplePhrase(p))
      });
    }
  }

  return commands;
}

export default {
  parseCommand,
  parseCommandWithDisambiguation,
  getAllCommands,
  getAllCommandsFlat
};
