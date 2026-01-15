/**
 * AboutModal - Comprehensive product information modal
 * Designed for System Engineers, Infrastructure Engineers, and Developers
 */

import { useState, useEffect } from 'react';

// Platform statistics
const PLATFORM_STATS = [
  { value: '114', label: 'React Components', icon: '{}' },
  { value: '51', label: 'Database Models', icon: 'db' },
  { value: '40+', label: 'API Endpoints', icon: '/>' },
  { value: '22+', label: 'MCP Servers', icon: 'AI' },
  { value: '13+', label: 'Automation Agents', icon: 'fx' },
  { value: '11', label: 'Themes', icon: 'ui' },
];

// Infrastructure capabilities
const INFRA_CAPABILITIES = [
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
const DEV_TOOLS = [
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
const AI_FEATURES = [
  { name: 'Agent Marketplace', count: '13+', desc: 'Pre-built agents for linting, testing, security, deployment' },
  { name: 'Custom Agents', count: '5', desc: 'Trigger types: file, git, session, schedule, system' },
  { name: 'MCP Servers', count: '22+', desc: 'Claude Code extensions across 6 categories' },
  { name: 'AI Personas', count: '∞', desc: 'Custom system prompts for different workflows' },
  { name: 'Voice Commands', count: 'Beta', desc: 'Browser-native speech recognition' },
  { name: 'Memory Banks', count: '3', desc: 'Session, project, and global context layers' },
];

// Architecture layers
const ARCHITECTURE = {
  frontend: { name: 'Frontend', tech: 'React 18 + Vite + Tailwind', color: '#61DAFB' },
  realtime: { name: 'Real-time', tech: 'Socket.IO + xterm.js', color: '#25C2A0' },
  api: { name: 'API Layer', tech: 'Express + 40+ endpoints', color: '#68A063' },
  services: { name: 'Services', tech: 'Prisma + Dockerode + node-pty', color: '#F7DF1E' },
  data: { name: 'Data', tech: 'PostgreSQL + tmux sessions', color: '#336791' },
  infra: { name: 'Infrastructure', tech: 'PM2 + Docker + Cloudflare', color: '#FF6B35' },
};

// Integration points
const INTEGRATIONS = [
  { name: 'Authentik', type: 'SSO', desc: 'OAuth2 authentication with user/group sync' },
  { name: 'Cloudflare', type: 'Edge', desc: 'Tunnel publishing with automatic DNS' },
  { name: 'GitHub', type: 'VCS', desc: 'Clone, push, Actions status' },
  { name: 'Docker', type: 'Container', desc: 'Full API via socket' },
  { name: 'PostgreSQL', type: 'Database', desc: 'Prisma ORM with 51 models' },
  { name: 'Claude Code', type: 'AI', desc: 'MCP servers, persistent sessions' },
];

// API coverage
const API_COVERAGE = [
  { category: 'Core', endpoints: 8, examples: ['projects', 'settings', 'search'] },
  { category: 'Sessions', endpoints: 12, examples: ['create', 'folders', 'tags', 'handoff'] },
  { category: 'Infrastructure', endpoints: 15, examples: ['docker/*', 'services', 'firewall'] },
  { category: 'Development', endpoints: 10, examples: ['git/*', 'files', 'database'] },
  { category: 'AI & Agents', endpoints: 8, examples: ['agents', 'marketplace', 'personas'] },
  { category: 'Monitoring', endpoints: 6, examples: ['metrics', 'uptime', 'network'] },
];

function StatCard({ stat }) {
  return (
    <div className="relative group">
      <div
        className="p-4 rounded-xl text-center transition-all duration-300 group-hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="text-xs font-mono text-accent/60 mb-1">{stat.icon}</div>
        <div className="text-3xl font-bold text-accent font-mono">{stat.value}</div>
        <div className="text-xs text-muted mt-1">{stat.label}</div>
      </div>
    </div>
  );
}

function CapabilityCard({ capability }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-300"
      style={{
        background: 'var(--bg-secondary)',
        border: `1px solid ${capability.color}30`,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/5 transition-colors"
      >
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold"
          style={{ background: `${capability.color}20`, color: capability.color }}
        >
          {capability.icon === 'docker' && '🐳'}
          {capability.icon === 'systemd' && '⚙️'}
          {capability.icon === 'shield' && '🛡️'}
          {capability.icon === 'chart' && '📊'}
        </div>
        <div className="flex-1">
          <h4 className="text-primary font-semibold">{capability.category}</h4>
          <p className="text-xs text-muted">{capability.items.length} capabilities</p>
        </div>
        <svg
          className={`w-5 h-5 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          {capability.items.map((item, i) => (
            <div
              key={i}
              className="p-3 rounded-lg"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <div className="text-sm text-primary font-medium">{item.name}</div>
              <div className="text-xs text-muted">{item.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DevToolCard({ tool }) {
  return (
    <div
      className="p-5 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
          <span className="text-accent font-mono font-bold text-sm">{tool.icon}</span>
        </div>
        <h4 className="text-primary font-semibold">{tool.name}</h4>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {tool.features.map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-accent">+</span>
            <span className="text-secondary">{feature}</span>
          </div>
        ))}
      </div>
      <div
        className="p-3 rounded-lg text-xs"
        style={{ background: 'var(--bg-accent)', border: '1px solid var(--border-accent)' }}
      >
        <span className="text-accent font-medium">Highlight:</span>
        <span className="text-primary ml-2">{tool.highlight}</span>
      </div>
    </div>
  );
}

export default function AboutModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [animatedStats, setAnimatedStats] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimatedStats(true), 100);
    } else {
      setAnimatedStats(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '◉' },
    { id: 'infrastructure', label: 'Infrastructure', icon: '⚙' },
    { id: 'developer', label: 'Developer Tools', icon: '>' },
    { id: 'ai', label: 'AI & Automation', icon: '◈' },
    { id: 'architecture', label: 'Architecture', icon: '▣' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 backdrop-blur-xl"
        style={{ background: 'var(--bg-overlay, rgba(0, 0, 0, 0.75))' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-5xl max-h-[92vh] rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-accent)',
          boxShadow: '0 0 60px var(--shadow-color, rgba(0, 0, 0, 0.3)), 0 25px 50px -12px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Header */}
        <div
          className="relative px-8 py-6 overflow-hidden"
          style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}
        >
          {/* Background gradient accent */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: 'radial-gradient(ellipse at top left, var(--accent-primary) 0%, transparent 50%)'
            }}
          />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/30">
                <span className="text-2xl font-mono font-bold text-accent">{'>'}​_</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-primary">Console.web</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-mono text-accent bg-accent/15 px-2 py-0.5 rounded">v1.2.0</span>
                  <span className="text-xs text-muted">Development Operations Platform</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-xl hover:bg-accent/10 text-muted hover:text-primary transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className="px-8 py-3 flex gap-2 overflow-x-auto scrollbar-hide"
          style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-accent text-black font-semibold shadow-lg'
                  : 'text-secondary hover:text-primary hover:bg-accent/10'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          className="overflow-y-auto scrollbar-hide"
          style={{ maxHeight: 'calc(92vh - 200px)' }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-8 space-y-8">
              {/* Hero Section */}
              <div className="text-center py-6">
                <h3 className="text-3xl font-bold text-primary mb-4">
                  Unified Infrastructure Management
                </h3>
                <p className="text-lg text-secondary max-w-3xl mx-auto leading-relaxed">
                  A comprehensive web interface for <span className="text-accent font-semibold">System Engineers</span>,
                  <span className="text-accent font-semibold"> DevOps professionals</span>, and
                  <span className="text-accent font-semibold"> Developers</span> to manage terminals, containers,
                  services, and development workflows from a single browser tab.
                </p>
              </div>

              {/* Platform Stats */}
              <div className={`grid grid-cols-3 md:grid-cols-6 gap-4 transition-all duration-700 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {PLATFORM_STATS.map((stat, i) => (
                  <div key={stat.label} style={{ transitionDelay: `${i * 50}ms` }}>
                    <StatCard stat={stat} />
                  </div>
                ))}
              </div>

              {/* Key Value Props */}
              <div className="grid md:grid-cols-3 gap-6">
                <div
                  className="p-6 rounded-xl"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                    <span className="text-2xl">🖥️</span>
                  </div>
                  <h4 className="text-lg font-semibold text-primary mb-2">Terminal Persistence</h4>
                  <p className="text-sm text-muted">
                    tmux-backed sessions survive disconnects, browser crashes, and server restarts.
                    Reconnect instantly to exactly where you left off.
                  </p>
                </div>
                <div
                  className="p-6 rounded-xl"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                    <span className="text-2xl">🔄</span>
                  </div>
                  <h4 className="text-lg font-semibold text-primary mb-2">Auto-Recovery</h4>
                  <p className="text-sm text-muted">
                    Watcher service performs health checks every 30 seconds with automatic crash recovery,
                    Prisma regeneration, and exponential backoff.
                  </p>
                </div>
                <div
                  className="p-6 rounded-xl"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <h4 className="text-lg font-semibold text-primary mb-2">AI-Native</h4>
                  <p className="text-sm text-muted">
                    Built for Claude Code and AI workflows with 22+ MCP servers, 13+ automation agents,
                    and custom personas for different contexts.
                  </p>
                </div>
              </div>

              {/* Target Users */}
              <div
                className="p-6 rounded-xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-accent)' }}
              >
                <h4 className="text-sm font-mono text-accent mb-4 uppercase tracking-wider">Built For</h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { role: 'System Engineers', desc: 'Managing Linux servers, services, and infrastructure' },
                    { role: 'DevOps Engineers', desc: 'Container orchestration, CI/CD, monitoring' },
                    { role: 'Full-Stack Developers', desc: 'Multi-project development with persistent terminals' },
                    { role: 'AI/ML Engineers', desc: 'Claude Code workflows with MCP integration' },
                  ].map((user, i) => (
                    <div key={i} className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="text-primary font-semibold mb-1">{user.role}</div>
                      <div className="text-xs text-muted">{user.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Infrastructure Tab */}
          {activeTab === 'infrastructure' && (
            <div className="p-8 space-y-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-primary mb-2">Infrastructure Management</h3>
                <p className="text-secondary">
                  Complete control over containers, services, security, and system resources from a unified interface.
                </p>
              </div>

              <div className="space-y-4">
                {INFRA_CAPABILITIES.map((cap, i) => (
                  <CapabilityCard key={i} capability={cap} />
                ))}
              </div>

              {/* Quick Commands */}
              <div
                className="p-6 rounded-xl mt-8"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                <h4 className="text-sm font-mono text-accent mb-4 uppercase tracking-wider">Common Operations</h4>
                <div className="grid md:grid-cols-2 gap-4 font-mono text-sm">
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <span className="text-muted">Container restart:</span>
                    <span className="text-primary ml-2">Dashboard → Docker → Click restart</span>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <span className="text-muted">Open firewall port:</span>
                    <span className="text-primary ml-2">Infrastructure → Firewall → Add Rule</span>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <span className="text-muted">View service logs:</span>
                    <span className="text-primary ml-2">Infrastructure → Services → Logs icon</span>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <span className="text-muted">Check banned IPs:</span>
                    <span className="text-primary ml-2">Security → Fail2ban → View jails</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Developer Tools Tab */}
          {activeTab === 'developer' && (
            <div className="p-8 space-y-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-primary mb-2">Developer Experience</h3>
                <p className="text-secondary">
                  Streamlined tools for modern development workflows, from terminals to deployment.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {DEV_TOOLS.map((tool, i) => (
                  <DevToolCard key={i} tool={tool} />
                ))}
              </div>

              {/* Workflow Example */}
              <div
                className="p-6 rounded-xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-accent)' }}
              >
                <h4 className="text-sm font-mono text-accent mb-4 uppercase tracking-wider">
                  Example: Deploy a Project
                </h4>
                <div className="grid md:grid-cols-5 gap-4">
                  {[
                    { step: '1', action: 'Select project', desc: 'Click in sidebar' },
                    { step: '2', action: 'Run build', desc: 'Terminal: npm run build' },
                    { step: '3', action: 'Commit changes', desc: 'Git panel → Commit' },
                    { step: '4', action: 'Publish', desc: 'Cloudflare → Publish' },
                    { step: '5', action: 'Live!', desc: 'Auto DNS created' },
                  ].map((s, i) => (
                    <div key={i} className="text-center">
                      <div className="w-10 h-10 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center mx-auto mb-2">
                        {s.step}
                      </div>
                      <div className="text-sm text-primary font-medium">{s.action}</div>
                      <div className="text-xs text-muted">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI & Automation Tab */}
          {activeTab === 'ai' && (
            <div className="p-8 space-y-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-primary mb-2">AI & Automation</h3>
                <p className="text-secondary">
                  Built from the ground up for AI-assisted development with Claude Code, MCP, and custom agents.
                </p>
              </div>

              {/* AI Stats Grid */}
              <div className="grid md:grid-cols-3 gap-4">
                {AI_FEATURES.map((feature, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-xl"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-primary font-semibold">{feature.name}</span>
                      <span className="text-accent font-mono font-bold text-lg">{feature.count}</span>
                    </div>
                    <p className="text-sm text-muted">{feature.desc}</p>
                  </div>
                ))}
              </div>

              {/* MCP Categories */}
              <div
                className="p-6 rounded-xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-accent)' }}
              >
                <h4 className="text-sm font-mono text-accent mb-4 uppercase tracking-wider">MCP Server Categories</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { cat: 'File Systems', count: 4, examples: 'filesystem, git, github' },
                    { cat: 'Data & Memory', count: 4, examples: 'sqlite, postgres, memory' },
                    { cat: 'Web & APIs', count: 4, examples: 'fetch, puppeteer, brave-search' },
                    { cat: 'Development', count: 4, examples: 'sequential-thinking, evals' },
                    { cat: 'Communication', count: 3, examples: 'slack, email, notifications' },
                    { cat: 'Utilities', count: 3, examples: 'time, cloudflare, everart' },
                  ].map((cat, i) => (
                    <div key={i} className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-primary font-medium">{cat.cat}</span>
                        <span className="text-accent font-mono">{cat.count}</span>
                      </div>
                      <div className="text-xs text-muted font-mono">{cat.examples}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agent Triggers */}
              <div
                className="p-6 rounded-xl"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <h4 className="text-sm font-mono text-accent mb-4 uppercase tracking-wider">Agent Trigger Types</h4>
                <div className="grid md:grid-cols-5 gap-4 text-center">
                  {[
                    { icon: '📁', name: 'File', desc: 'On file change' },
                    { icon: '🔀', name: 'Git', desc: 'On commit/push' },
                    { icon: '💻', name: 'Session', desc: 'On terminal event' },
                    { icon: '⏰', name: 'Schedule', desc: 'Cron-based' },
                    { icon: '🖥️', name: 'System', desc: 'Resource threshold' },
                  ].map((t, i) => (
                    <div key={i} className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="text-2xl mb-2">{t.icon}</div>
                      <div className="text-sm text-primary font-medium">{t.name}</div>
                      <div className="text-xs text-muted">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Architecture Tab */}
          {activeTab === 'architecture' && (
            <div className="p-8 space-y-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-primary mb-2">System Architecture</h3>
                <p className="text-secondary">
                  A modern, layered architecture designed for reliability, extensibility, and real-time operations.
                </p>
              </div>

              {/* Architecture Layers */}
              <div className="space-y-3">
                {Object.values(ARCHITECTURE).map((layer, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl flex items-center gap-4"
                    style={{
                      background: `linear-gradient(90deg, ${layer.color}15 0%, var(--bg-secondary) 100%)`,
                      borderLeft: `4px solid ${layer.color}`,
                    }}
                  >
                    <div className="w-32 text-sm font-semibold text-primary">{layer.name}</div>
                    <div className="flex-1 text-sm font-mono text-muted">{layer.tech}</div>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: layer.color }}
                    />
                  </div>
                ))}
              </div>

              {/* Integrations */}
              <div
                className="p-6 rounded-xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                <h4 className="text-sm font-mono text-accent mb-4 uppercase tracking-wider">Integration Points</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  {INTEGRATIONS.map((int, i) => (
                    <div key={i} className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-primary font-semibold">{int.name}</span>
                        <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded">{int.type}</span>
                      </div>
                      <div className="text-xs text-muted">{int.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* API Coverage */}
              <div
                className="p-6 rounded-xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-accent)' }}
              >
                <h4 className="text-sm font-mono text-accent mb-4 uppercase tracking-wider">API Coverage</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {API_COVERAGE.map((api, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="text-2xl font-bold text-accent font-mono w-12">{api.endpoints}</div>
                      <div className="flex-1">
                        <div className="text-sm text-primary font-medium">{api.category}</div>
                        <div className="text-xs text-muted font-mono">{api.examples.join(', ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <span className="text-sm text-muted">Total API Endpoints</span>
                  <span className="text-2xl font-bold text-accent font-mono">40+</span>
                </div>
              </div>

              {/* Project Structure */}
              <div
                className="p-6 rounded-xl font-mono text-sm"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="text-accent mb-4">// Project Structure</div>
                <pre className="text-muted leading-relaxed">
{`console-web/
├── server/                    # Backend
│   ├── index.js              # Express + Socket.IO (3,500+ lines)
│   ├── routes/               # 22 modular route files
│   ├── services/             # Business logic & integrations
│   └── middleware/           # Auth, validation, logging
├── src/                      # Frontend
│   ├── components/           # 114 React components
│   ├── hooks/                # Custom hooks (auth, theme, sessions)
│   └── App.jsx               # Main application
├── prisma/
│   └── schema.prisma         # 51 data models
└── server/services/
    └── watcherService.js     # Auto-recovery system`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-8 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted font-mono">
              Built for engineers who value efficiency and control
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-mono rounded-lg bg-accent text-black font-semibold hover:opacity-90 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
