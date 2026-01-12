/**
 * MCP Server Catalog
 * Pre-configured templates for popular MCP servers
 * Organized by category for easy browsing
 */

export const MCP_CATALOG = {
  categories: [
    {
      id: 'official',
      name: 'Official Reference Servers',
      description: 'Maintained by Anthropic/Model Context Protocol team',
      icon: 'shield-check'
    },
    {
      id: 'cloud',
      name: 'Cloud & Infrastructure',
      description: 'AWS, Azure, Docker, Kubernetes integrations',
      icon: 'cloud'
    },
    {
      id: 'database',
      name: 'Databases',
      description: 'PostgreSQL, SQLite, MongoDB, and more',
      icon: 'database'
    },
    {
      id: 'developer',
      name: 'Developer Tools',
      description: 'Git, GitHub, Sentry, and development utilities',
      icon: 'code'
    },
    {
      id: 'productivity',
      name: 'Productivity & Knowledge',
      description: 'Notion, Obsidian, Slack, and productivity tools',
      icon: 'sparkles'
    },
    {
      id: 'search',
      name: 'Search & Web',
      description: 'Web search, scraping, and data retrieval',
      icon: 'magnifying-glass'
    }
  ],

  servers: [
    // ========== OFFICIAL REFERENCE SERVERS ==========
    {
      id: 'filesystem',
      name: 'Filesystem',
      category: 'official',
      description: 'Secure read/write access to local directories. Essential for letting agents work with your codebase, logs, and config files.',
      author: 'Model Context Protocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-filesystem',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem'],
      configurable: [
        {
          key: 'directories',
          label: 'Allowed Directories',
          type: 'array',
          description: 'Directories the agent can access (add as additional args)',
          placeholder: '/home/user/projects',
          required: true
        }
      ],
      tools: ['read_file', 'write_file', 'list_directory', 'create_directory', 'move_file', 'search_files', 'get_file_info'],
      tags: ['files', 'local', 'essential']
    },
    {
      id: 'github',
      name: 'GitHub',
      category: 'official',
      description: 'Full GitHub integration - manage repos, PRs, issues, commits, and more. Perfect for automating development workflows.',
      author: 'Model Context Protocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-github',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: ''
      },
      configurable: [
        {
          key: 'GITHUB_PERSONAL_ACCESS_TOKEN',
          label: 'GitHub Personal Access Token',
          type: 'password',
          description: 'PAT with repo, read:org scopes',
          required: true
        }
      ],
      tools: ['create_issue', 'list_issues', 'create_pull_request', 'list_commits', 'get_file_contents', 'push_files', 'search_repositories'],
      tags: ['git', 'vcs', 'essential']
    },
    {
      id: 'git',
      name: 'Git',
      category: 'official',
      description: 'Local Git repository operations - read refs, diffs, commits, and history. Works with any local repo.',
      author: 'Model Context Protocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-git',
      transport: 'STDIO',
      command: 'uvx',
      args: ['mcp-server-git'],
      configurable: [
        {
          key: 'repository',
          label: 'Repository Path',
          type: 'string',
          description: 'Path to the Git repository',
          placeholder: '/home/user/projects/myrepo',
          required: false
        }
      ],
      tools: ['git_status', 'git_diff', 'git_log', 'git_show', 'git_branch', 'git_checkout'],
      tags: ['git', 'vcs', 'local']
    },
    {
      id: 'memory',
      name: 'Memory',
      category: 'official',
      description: 'Knowledge graph-based persistent memory. Agents can remember facts, relationships, and context across sessions.',
      author: 'Model Context Protocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-memory',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      tools: ['create_entities', 'create_relations', 'search_nodes', 'open_nodes', 'delete_entities'],
      tags: ['memory', 'knowledge-graph', 'persistence']
    },
    {
      id: 'fetch',
      name: 'Fetch',
      category: 'official',
      description: 'Optimized web content fetching. Converts HTML to clean Markdown for efficient consumption by agents.',
      author: 'Model Context Protocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-fetch',
      transport: 'STDIO',
      command: 'uvx',
      args: ['mcp-server-fetch'],
      tools: ['fetch'],
      tags: ['web', 'scraping', 'documentation']
    },
    {
      id: 'brave-search',
      name: 'Brave Search',
      category: 'official',
      description: 'Web and local search using Brave Search API. Give your agent live internet access without browser overhead.',
      author: 'Model Context Protocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-brave-search',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      env: {
        BRAVE_API_KEY: ''
      },
      configurable: [
        {
          key: 'BRAVE_API_KEY',
          label: 'Brave Search API Key',
          type: 'password',
          description: 'Get from https://brave.com/search/api/',
          required: true
        }
      ],
      tools: ['brave_web_search', 'brave_local_search'],
      tags: ['search', 'web', 'internet']
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      category: 'official',
      description: 'Access and search files in Google Drive. Retrieve documents, specs, and data stored in the cloud.',
      author: 'Model Context Protocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-gdrive',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-gdrive'],
      configurable: [
        {
          key: 'credentials_path',
          label: 'Credentials File Path',
          type: 'string',
          description: 'Path to Google OAuth credentials JSON',
          required: true
        }
      ],
      tools: ['search_files', 'read_file', 'list_files'],
      tags: ['cloud', 'storage', 'google']
    },

    // ========== DATABASE SERVERS ==========
    {
      id: 'postgresql',
      name: 'PostgreSQL',
      category: 'database',
      description: 'Full PostgreSQL access with schema inspection. Query data, generate reports, or let agents write safe SQL.',
      author: 'Model Context Protocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-postgres',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      env: {
        POSTGRES_CONNECTION_STRING: ''
      },
      configurable: [
        {
          key: 'POSTGRES_CONNECTION_STRING',
          label: 'Connection String',
          type: 'password',
          description: 'PostgreSQL connection URL (postgresql://user:pass@host:5432/db)',
          placeholder: 'postgresql://user:password@localhost:5432/mydb',
          required: true
        }
      ],
      tools: ['query', 'list_tables', 'describe_table'],
      tags: ['sql', 'database', 'postgres']
    },
    {
      id: 'sqlite',
      name: 'SQLite',
      category: 'database',
      description: 'Lightweight SQLite database access. Perfect for local databases, logs, or embedded data stores.',
      author: 'Model Context Protocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-sqlite',
      transport: 'STDIO',
      command: 'uvx',
      args: ['mcp-server-sqlite', '--db-path'],
      configurable: [
        {
          key: 'db_path',
          label: 'Database Path',
          type: 'string',
          description: 'Path to SQLite database file',
          placeholder: '/path/to/database.db',
          required: true
        }
      ],
      tools: ['read_query', 'write_query', 'create_table', 'list_tables', 'describe_table'],
      tags: ['sql', 'database', 'sqlite', 'local']
    },

    // ========== CLOUD & INFRASTRUCTURE ==========
    {
      id: 'docker',
      name: 'Docker',
      category: 'cloud',
      description: 'Full Docker control - list containers, view logs, start/stop containers, manage images and networks.',
      author: 'Community',
      repository: 'https://github.com/ckreiling/mcp-server-docker',
      package: 'mcp-server-docker',
      transport: 'STDIO',
      command: 'uvx',
      args: ['mcp-server-docker'],
      tools: ['list_containers', 'inspect_container', 'container_logs', 'start_container', 'stop_container', 'list_images', 'pull_image'],
      tags: ['docker', 'containers', 'devops']
    },
    {
      id: 'kubernetes',
      name: 'Kubernetes',
      category: 'cloud',
      description: 'Query pods, deployments, services. Retrieve logs and check cluster health across namespaces.',
      author: 'Community',
      repository: 'https://github.com/strowk/mcp-k8s-go',
      package: 'mcp-k8s',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', 'mcp-k8s'],
      configurable: [
        {
          key: 'kubeconfig',
          label: 'Kubeconfig Path',
          type: 'string',
          description: 'Path to kubeconfig file (defaults to ~/.kube/config)',
          required: false
        }
      ],
      tools: ['get_pods', 'get_deployments', 'get_services', 'get_logs', 'describe_pod', 'get_namespaces'],
      tags: ['kubernetes', 'k8s', 'containers', 'orchestration']
    },
    {
      id: 'azure',
      name: 'Azure',
      category: 'cloud',
      description: 'Interact with Azure resources via natural language. Query subscriptions, manage resource groups, list/restart VMs.',
      author: 'Microsoft',
      repository: 'https://github.com/Azure/azure-mcp',
      package: '@azure/mcp',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', '@azure/mcp'],
      configurable: [
        {
          key: 'AZURE_SUBSCRIPTION_ID',
          label: 'Subscription ID',
          type: 'string',
          description: 'Azure Subscription ID',
          required: true
        }
      ],
      env: {
        AZURE_SUBSCRIPTION_ID: ''
      },
      tools: ['list_resource_groups', 'list_vms', 'restart_vm', 'get_vm_status', 'list_storage_accounts'],
      tags: ['azure', 'cloud', 'microsoft', 'vms']
    },
    {
      id: 'aws',
      name: 'AWS',
      category: 'cloud',
      description: 'AWS integration for S3, Lambda, EC2, CloudWatch. Inspect buckets, check logs, manage instances.',
      author: 'Community',
      repository: 'https://github.com/aws-samples/mcp-server-aws',
      package: 'mcp-server-aws',
      transport: 'STDIO',
      command: 'uvx',
      args: ['mcp-server-aws'],
      configurable: [
        {
          key: 'AWS_REGION',
          label: 'AWS Region',
          type: 'string',
          description: 'Default AWS region',
          placeholder: 'us-east-1',
          required: true
        },
        {
          key: 'AWS_PROFILE',
          label: 'AWS Profile',
          type: 'string',
          description: 'AWS credentials profile name',
          required: false
        }
      ],
      env: {
        AWS_REGION: 'us-east-1'
      },
      tools: ['s3_list_buckets', 's3_get_object', 'ec2_describe_instances', 'lambda_list_functions', 'cloudwatch_get_logs'],
      tags: ['aws', 'cloud', 'amazon', 's3', 'lambda']
    },

    // ========== DEVELOPER TOOLS ==========
    {
      id: 'sentry',
      name: 'Sentry',
      category: 'developer',
      description: 'Retrieve and analyze error tracking issues from Sentry. Debug production errors with AI assistance.',
      author: 'Community',
      repository: 'https://github.com/getsentry/sentry-mcp',
      package: '@sentry/mcp-server',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', '@sentry/mcp-server'],
      env: {
        SENTRY_AUTH_TOKEN: '',
        SENTRY_ORG: ''
      },
      configurable: [
        {
          key: 'SENTRY_AUTH_TOKEN',
          label: 'Sentry Auth Token',
          type: 'password',
          description: 'Sentry API authentication token',
          required: true
        },
        {
          key: 'SENTRY_ORG',
          label: 'Organization Slug',
          type: 'string',
          description: 'Your Sentry organization slug',
          required: true
        }
      ],
      tools: ['list_issues', 'get_issue', 'list_events', 'resolve_issue'],
      tags: ['errors', 'monitoring', 'debugging']
    },
    {
      id: 'puppeteer',
      name: 'Puppeteer',
      category: 'developer',
      description: 'Browser automation with Puppeteer. Navigate pages, take screenshots, fill forms, and extract data.',
      author: 'Model Context Protocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-puppeteer',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer'],
      tools: ['puppeteer_navigate', 'puppeteer_screenshot', 'puppeteer_click', 'puppeteer_fill', 'puppeteer_evaluate'],
      tags: ['browser', 'automation', 'testing', 'scraping']
    },
    {
      id: 'sequential-thinking',
      name: 'Sequential Thinking',
      category: 'developer',
      description: 'Enhanced reasoning through dynamic thought chains. Helps agents break down complex problems step-by-step.',
      author: 'Model Context Protocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-sequential-thinking',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      tools: ['sequential_thinking'],
      tags: ['reasoning', 'thinking', 'analysis']
    },

    // ========== PRODUCTIVITY & KNOWLEDGE ==========
    {
      id: 'slack',
      name: 'Slack',
      category: 'productivity',
      description: 'Slack integration for ChatOps. Manage channels, send messages, search conversations, and automate workflows.',
      author: 'Model Context Protocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-slack',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
      env: {
        SLACK_BOT_TOKEN: '',
        SLACK_TEAM_ID: ''
      },
      configurable: [
        {
          key: 'SLACK_BOT_TOKEN',
          label: 'Bot Token',
          type: 'password',
          description: 'Slack Bot OAuth token (xoxb-...)',
          required: true
        },
        {
          key: 'SLACK_TEAM_ID',
          label: 'Team ID',
          type: 'string',
          description: 'Slack workspace team ID',
          required: true
        }
      ],
      tools: ['list_channels', 'post_message', 'reply_to_thread', 'add_reaction', 'get_channel_history', 'search_messages'],
      tags: ['chat', 'messaging', 'chatops']
    },
    {
      id: 'notion',
      name: 'Notion',
      category: 'productivity',
      description: 'Read and write to Notion pages and databases. Manage your knowledge base and documentation with AI.',
      author: 'Community',
      repository: 'https://github.com/makenotion/notion-mcp-server',
      package: 'notion-mcp-server',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', 'notion-mcp-server'],
      env: {
        NOTION_API_KEY: ''
      },
      configurable: [
        {
          key: 'NOTION_API_KEY',
          label: 'Notion API Key',
          type: 'password',
          description: 'Notion integration secret key',
          required: true
        }
      ],
      tools: ['search', 'get_page', 'create_page', 'update_page', 'query_database', 'create_database_item'],
      tags: ['notes', 'knowledge', 'documentation']
    },
    {
      id: 'obsidian',
      name: 'Obsidian',
      category: 'productivity',
      description: 'Access your Obsidian vault. Search notes, read content, create new notes, and manage your second brain.',
      author: 'Community',
      repository: 'https://github.com/smithery-ai/mcp-obsidian',
      package: 'mcp-obsidian',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', 'mcp-obsidian'],
      configurable: [
        {
          key: 'vault_path',
          label: 'Vault Path',
          type: 'string',
          description: 'Path to your Obsidian vault',
          placeholder: '/home/user/Documents/Obsidian/MyVault',
          required: true
        }
      ],
      tools: ['search_notes', 'read_note', 'create_note', 'update_note', 'list_notes', 'get_backlinks'],
      tags: ['notes', 'knowledge', 'markdown', 'pkm']
    },
    {
      id: 'google-maps',
      name: 'Google Maps',
      category: 'productivity',
      description: 'Location services with Google Maps. Geocoding, directions, place search, and distance calculations.',
      author: 'Model Context Protocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-google-maps',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-google-maps'],
      env: {
        GOOGLE_MAPS_API_KEY: ''
      },
      configurable: [
        {
          key: 'GOOGLE_MAPS_API_KEY',
          label: 'Google Maps API Key',
          type: 'password',
          description: 'Google Maps Platform API key',
          required: true
        }
      ],
      tools: ['maps_geocode', 'maps_reverse_geocode', 'maps_search_places', 'maps_directions', 'maps_distance_matrix'],
      tags: ['maps', 'location', 'google']
    },

    // ========== SEARCH & WEB ==========
    {
      id: 'exa',
      name: 'Exa Search',
      category: 'search',
      description: 'Neural search engine API. More precise search results for technical queries and research.',
      author: 'Community',
      repository: 'https://github.com/exa-labs/exa-mcp-server',
      package: 'exa-mcp-server',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', 'exa-mcp-server'],
      env: {
        EXA_API_KEY: ''
      },
      configurable: [
        {
          key: 'EXA_API_KEY',
          label: 'Exa API Key',
          type: 'password',
          description: 'API key from exa.ai',
          required: true
        }
      ],
      tools: ['web_search', 'find_similar', 'get_contents'],
      tags: ['search', 'web', 'research']
    },
    {
      id: 'everart',
      name: 'EverArt',
      category: 'search',
      description: 'AI image generation using various models. Create images from text prompts.',
      author: 'Model Context Protocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-everart',
      transport: 'STDIO',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-everart'],
      env: {
        EVERART_API_KEY: ''
      },
      configurable: [
        {
          key: 'EVERART_API_KEY',
          label: 'EverArt API Key',
          type: 'password',
          description: 'EverArt API key',
          required: true
        }
      ],
      tools: ['generate_image', 'list_models'],
      tags: ['images', 'ai', 'generation']
    }
  ]
};

/**
 * Get servers by category
 */
export function getServersByCategory(categoryId) {
  return MCP_CATALOG.servers.filter(s => s.category === categoryId);
}

/**
 * Get a specific server by ID
 */
export function getServerById(serverId) {
  return MCP_CATALOG.servers.find(s => s.id === serverId);
}

/**
 * Search servers by name, description, or tags
 */
export function searchServers(query) {
  const q = query.toLowerCase();
  return MCP_CATALOG.servers.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q) ||
    s.tags.some(t => t.toLowerCase().includes(q))
  );
}

/**
 * Get all categories with server counts
 */
export function getCategoriesWithCounts() {
  return MCP_CATALOG.categories.map(cat => ({
    ...cat,
    serverCount: MCP_CATALOG.servers.filter(s => s.category === cat.id).length
  }));
}

export default MCP_CATALOG;
