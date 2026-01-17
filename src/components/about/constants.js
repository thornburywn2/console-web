/**
 * AboutModal Constants
 * Data for About modal display
 */

// Platform statistics
export const PLATFORM_STATS = [
  { value: '114', label: 'React Components', icon: '{}' },
  { value: '51', label: 'Database Models', icon: 'db' },
  { value: '40+', label: 'API Endpoints', icon: '/>' },
  { value: '22+', label: 'MCP Servers', icon: 'AI' },
  { value: '13+', label: 'Automation Agents', icon: 'fx' },
  { value: '11', label: 'Themes', icon: 'ui' },
];

// Infrastructure capabilities
export const INFRA_CAPABILITIES = [
  {
    category: 'Container Orchestration',
    icon: 'docker',
    color: '#2496ED',
    items: [
      { name: 'Container Lifecycle', desc: 'Start, stop, restart, remove containers' },
      { name: 'Image Management', desc: 'Pull, tag, remove images with size tracking' },
      { name: 'Volume Control', desc: 'Create, inspect, prune volumes' },
      { name: 'Network Visibility', desc: 'Bridge, host, overlay network inspection' },
      { name: 'Log Streaming', desc: 'Real-time container logs with filtering' },
      { name: 'Resource Metrics', desc: 'CPU, memory, network I/O per container' },
    ]
  },
  {
    category: 'System Services',
    icon: 'systemd',
    color: '#30D158',
    items: [
      { name: 'Systemd Control', desc: 'Start, stop, restart, enable, disable units' },
      { name: 'Service Status', desc: 'Active, inactive, failed state monitoring' },
      { name: 'Journal Logs', desc: 'Journalctl integration with priority filtering' },
      { name: 'Timer Management', desc: 'Systemd timers and scheduled tasks' },
      { name: 'Unit Dependencies', desc: 'View service dependency trees' },
      { name: 'Boot Analysis', desc: 'Startup time and bottleneck detection' },
    ]
  },
  {
    category: 'Security & Access',
    icon: 'shield',
    color: '#FF453A',
    items: [
      { name: 'UFW Firewall', desc: 'Enable/disable, add/remove rules, port management' },
      { name: 'Fail2ban Monitor', desc: 'Banned IPs, jail status, unban actions' },
      { name: 'SSH Sessions', desc: 'Active connections, failed login attempts' },
      { name: 'User Management', desc: 'Linux users/groups, Authentik SSO users' },
      { name: 'Security Scanning', desc: 'Semgrep, Gitleaks, Trivy integration' },
      { name: 'Push Sanitization', desc: 'Pre-push hooks for secrets detection' },
    ]
  },
  {
    category: 'Monitoring & Metrics',
    icon: 'chart',
    color: '#BF5AF2',
    items: [
      { name: 'Real-time Stats', desc: 'CPU, memory, disk with 2-second refresh' },
      { name: 'Process Manager', desc: 'htop-style list, kill processes' },
      { name: 'Network Diagnostics', desc: 'Interfaces, ping, DNS, connections' },
      { name: 'Disk Analysis', desc: 'Per-project storage consumption' },
      { name: 'Uptime Tracking', desc: 'Service health checks and history' },
      { name: 'Alert Rules', desc: 'Threshold-based notifications' },
    ]
  },
];

// Developer tools
export const DEV_TOOLS = [
  {
    name: 'Terminal Sessions',
    icon: '>_',
    features: ['xterm.js with 256-color', 'tmux persistence', 'Session folders & tags', 'Template quick-start', 'Team handoffs', 'Auto-reconnect'],
    highlight: 'Sessions survive browser crashes, disconnects, and server restarts'
  },
  {
    name: 'Git Workflow',
    icon: 'git',
    features: ['Visual status indicators', 'Commit & push', 'Branch management', 'Diff viewer', 'Ahead/behind tracking', 'GitHub integration'],
    highlight: 'Clone repos, push to GitHub, view CI/CD status'
  },
  {
    name: 'Project Management',
    icon: '[]',
    features: ['Browse & favorite', 'Completion metrics', 'CLAUDE.md editor', 'Template system', 'Checkpoints & rollback', 'Compliance checker'],
    highlight: '6 project templates: Full-Stack, Frontend, Desktop, CLI, Infra, Mobile'
  },
  {
    name: 'API Development',
    icon: '{}',
    features: ['Request builder', 'Auth headers', 'Response inspection', 'History tracking', 'Database browser', 'Query builder'],
    highlight: 'Test endpoints, browse PostgreSQL tables, execute queries'
  },
];

// AI & Automation
export const AI_FEATURES = [
  { name: 'Agent Marketplace', count: '13+', desc: 'Pre-built agents for linting, testing, security, deployment' },
  { name: 'Custom Agents', count: '5', desc: 'Trigger types: file, git, session, schedule, system' },
  { name: 'MCP Servers', count: '22+', desc: 'Claude Code extensions across 6 categories' },
  { name: 'AI Personas', count: '∞', desc: 'Custom system prompts for different workflows' },
  { name: 'Voice Commands', count: 'Beta', desc: 'Browser-native speech recognition' },
  { name: 'Memory Banks', count: '3', desc: 'Session, project, and global context layers' },
];

// Architecture layers
export const ARCHITECTURE = {
  frontend: { name: 'Frontend', tech: 'React 18 + Vite + Tailwind', color: '#61DAFB' },
  realtime: { name: 'Real-time', tech: 'Socket.IO + xterm.js', color: '#25C2A0' },
  api: { name: 'API Layer', tech: 'Express + 40+ endpoints', color: '#68A063' },
  services: { name: 'Services', tech: 'Prisma + Dockerode + node-pty', color: '#F7DF1E' },
  data: { name: 'Data', tech: 'PostgreSQL + tmux sessions', color: '#336791' },
  infra: { name: 'Infrastructure', tech: 'PM2 + Docker + Cloudflare', color: '#FF6B35' },
};

// Integration points
export const INTEGRATIONS = [
  { name: 'Authentik', type: 'SSO', desc: 'OAuth2 authentication with user/group sync' },
  { name: 'Cloudflare', type: 'Edge', desc: 'Tunnel publishing with automatic DNS' },
  { name: 'GitHub', type: 'VCS', desc: 'Clone, push, Actions status' },
  { name: 'Docker', type: 'Container', desc: 'Full API via socket' },
  { name: 'PostgreSQL', type: 'Database', desc: 'Prisma ORM with 51 models' },
  { name: 'Claude Code', type: 'AI', desc: 'MCP servers, persistent sessions' },
];

// API coverage
export const API_COVERAGE = [
  { category: 'Core', endpoints: 8, examples: ['projects', 'settings', 'search'] },
  { category: 'Sessions', endpoints: 12, examples: ['create', 'folders', 'tags', 'handoff'] },
  { category: 'Infrastructure', endpoints: 15, examples: ['docker/*', 'services', 'firewall'] },
  { category: 'Development', endpoints: 10, examples: ['git/*', 'files', 'database'] },
  { category: 'AI & Agents', endpoints: 8, examples: ['agents', 'marketplace', 'personas'] },
  { category: 'Monitoring', endpoints: 6, examples: ['metrics', 'uptime', 'network'] },
];

// Tab definitions
export const TABS = [
  { id: 'overview', label: 'Overview', icon: '◉' },
  { id: 'infrastructure', label: 'Infrastructure', icon: '⚙' },
  { id: 'developer', label: 'Developer Tools', icon: '>' },
  { id: 'ai', label: 'AI & Automation', icon: '◈' },
  { id: 'architecture', label: 'Architecture', icon: '▣' },
];
