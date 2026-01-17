/**
 * SecurityDashboard Constants
 */

// Tool status indicators
export const ToolStatus = {
  INSTALLED: 'installed',
  MISSING: 'missing',
  CHECKING: 'checking',
  ERROR: 'error'
};

// Security tools configuration
export const SECURITY_TOOLS = [
  {
    id: 'semgrep',
    name: 'Semgrep',
    description: 'Static Application Security Testing (SAST)',
    installCmd: 'pip install semgrep',
    checkCmd: 'semgrep --version',
    category: 'sast'
  },
  {
    id: 'gitleaks',
    name: 'Gitleaks',
    description: 'Secret and credential scanning',
    installCmd: 'snap install gitleaks',
    checkCmd: 'gitleaks version',
    category: 'secrets'
  },
  {
    id: 'trivy',
    name: 'Trivy',
    description: 'Container vulnerability scanning',
    installCmd: 'snap install trivy',
    checkCmd: 'trivy --version',
    category: 'container'
  },
  {
    id: 'license-checker',
    name: 'License Checker',
    description: 'NPM license compliance checking',
    installCmd: 'npm install -g license-checker',
    checkCmd: 'npx license-checker --version',
    category: 'compliance'
  },
  {
    id: 'lighthouse',
    name: 'Lighthouse',
    description: 'Web performance and accessibility auditing',
    installCmd: 'npm install -g lighthouse',
    checkCmd: 'npx lighthouse --version',
    category: 'performance'
  },
  {
    id: 'jscpd',
    name: 'JSCPD',
    description: 'Code duplication detection',
    installCmd: 'npm install -g jscpd',
    checkCmd: 'npx jscpd --version',
    category: 'quality'
  }
];

// Scan types
export const SCAN_TYPES = [
  {
    id: 'security',
    name: 'Security Scan',
    description: 'Full security analysis (SAST, secrets, dependencies)',
    agent: 'AGENT-018-SECURITY',
    command: 'scan',
    icon: '🔒'
  },
  {
    id: 'quality',
    name: 'Quality Gate',
    description: 'Code quality, coverage, and complexity analysis',
    agent: 'AGENT-019-QUALITY-GATE',
    command: 'all',
    icon: '✅'
  },
  {
    id: 'performance',
    name: 'Performance Audit',
    description: 'Bundle analysis and performance metrics',
    agent: 'AGENT-022-PERFORMANCE',
    command: 'analyze',
    icon: '⚡'
  },
  {
    id: 'dependencies',
    name: 'Dependency Check',
    description: 'Outdated and vulnerable dependency detection',
    agent: 'AGENT-021-DEPENDENCY',
    command: 'check',
    icon: '📦'
  },
  {
    id: 'observability',
    name: 'System Health',
    description: 'System metrics and monitoring status',
    agent: 'AGENT-020-OBSERVABILITY',
    command: 'all',
    icon: '📊'
  }
];
