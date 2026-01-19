# MCP Server Catalog

**Version:** 1.0.0
**Last Updated:** 2026-01-18
**Total Servers:** 22

Console.web includes a comprehensive MCP (Model Context Protocol) Server Catalog with 22 pre-configured servers across 6 categories. This document provides complete documentation for all available servers, their configuration requirements, and installation instructions.

---

## Table of Contents

- [Overview](#overview)
- [Categories](#categories)
- [Server Catalog](#server-catalog)
  - [Official Reference Servers](#official-reference-servers)
  - [Cloud and Infrastructure](#cloud-and-infrastructure)
  - [Databases](#databases)
  - [Developer Tools](#developer-tools)
  - [Productivity and Knowledge](#productivity-and-knowledge)
  - [Search and Web](#search-and-web)
- [Installation](#installation)
  - [One-Click Installation](#one-click-installation)
  - [Manual Installation](#manual-installation)
- [Custom MCP Servers](#custom-mcp-servers)
- [API Reference](#api-reference)
- [Transport Types](#transport-types)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Model Context Protocol (MCP) enables AI agents to interact with external tools and services through a standardized interface. Console.web provides a marketplace-style catalog of pre-configured MCP servers that can be installed with one click.

### Key Features

- **22+ Pre-configured Servers**: Ready-to-use templates for popular tools and services
- **6 Categories**: Organized by use case for easy discovery
- **One-Click Installation**: Automatic configuration and startup
- **Tool Discovery**: Automatic detection of available tools after connection
- **Health Monitoring**: 60-second health check intervals
- **Real-time Status**: Socket.IO events for status changes

### Architecture

```
Console.web
    |
    +-- MCP Manager Service
    |       |
    |       +-- Server Lifecycle (start/stop/restart)
    |       +-- Health Checks (60s interval)
    |       +-- Tool Discovery (JSON-RPC tools/list)
    |       +-- Tool Invocation (JSON-RPC tools/call)
    |
    +-- MCP Catalog (22 servers)
    |       |
    |       +-- Official Reference (7)
    |       +-- Cloud & Infrastructure (4)
    |       +-- Databases (2)
    |       +-- Developer Tools (3)
    |       +-- Productivity & Knowledge (4)
    |       +-- Search & Web (2)
    |
    +-- Database (PostgreSQL + Prisma)
            |
            +-- MCPServer (installed servers)
            +-- MCPTool (discovered tools)
            +-- MCPToolLog (invocation history)
```

---

## Categories

| Category | Icon | Description | Server Count |
|----------|------|-------------|--------------|
| **Official** | shield-check | Maintained by Anthropic/Model Context Protocol team | 7 |
| **Cloud** | cloud | AWS, Azure, Docker, Kubernetes integrations | 4 |
| **Database** | database | PostgreSQL, SQLite, MongoDB, and more | 2 |
| **Developer** | code | Git, GitHub, Sentry, and development utilities | 3 |
| **Productivity** | sparkles | Notion, Obsidian, Slack, and productivity tools | 4 |
| **Search** | magnifying-glass | Web search, scraping, and data retrieval | 2 |

---

## Server Catalog

### Official Reference Servers

These servers are maintained by Anthropic and the Model Context Protocol team. They provide core functionality and are recommended as starting points.

---

#### Filesystem

Secure read/write access to local directories. Essential for letting agents work with your codebase, logs, and config files.

| Property | Value |
|----------|-------|
| **ID** | `filesystem` |
| **Author** | Model Context Protocol |
| **Package** | `@modelcontextprotocol/server-filesystem` |
| **Repository** | https://github.com/modelcontextprotocol/servers |
| **Transport** | STDIO |
| **Command** | `npx -y @modelcontextprotocol/server-filesystem` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `directories` | array | Yes | Directories the agent can access (added as additional args) |

**Available Tools:**
- `read_file` - Read contents of a file
- `write_file` - Write contents to a file
- `list_directory` - List files in a directory
- `create_directory` - Create a new directory
- `move_file` - Move or rename a file
- `search_files` - Search for files by pattern
- `get_file_info` - Get file metadata

**Example Configuration:**
```json
{
  "directories": [
    "/home/user/projects",
    "/home/user/documents"
  ]
}
```

**Tags:** files, local, essential

---

#### GitHub

Full GitHub integration - manage repos, PRs, issues, commits, and more. Perfect for automating development workflows.

| Property | Value |
|----------|-------|
| **ID** | `github` |
| **Author** | Model Context Protocol |
| **Package** | `@modelcontextprotocol/server-github` |
| **Repository** | https://github.com/modelcontextprotocol/servers |
| **Transport** | STDIO |
| **Command** | `npx -y @modelcontextprotocol/server-github` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | password | Yes | PAT with repo, read:org scopes |

**Available Tools:**
- `create_issue` - Create a new issue
- `list_issues` - List repository issues
- `create_pull_request` - Create a new PR
- `list_commits` - List recent commits
- `get_file_contents` - Read file from repo
- `push_files` - Push file changes
- `search_repositories` - Search GitHub repos

**Getting Your Token:**
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token (classic)
3. Select scopes: `repo`, `read:org`
4. Copy the token and paste it during installation

**Tags:** git, vcs, essential

---

#### Git

Local Git repository operations - read refs, diffs, commits, and history. Works with any local repo.

| Property | Value |
|----------|-------|
| **ID** | `git` |
| **Author** | Model Context Protocol |
| **Package** | `mcp-server-git` (Python) |
| **Repository** | https://github.com/modelcontextprotocol/servers |
| **Transport** | STDIO |
| **Command** | `uvx mcp-server-git` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `repository` | string | No | Path to the Git repository |

**Available Tools:**
- `git_status` - Show working tree status
- `git_diff` - Show changes between commits
- `git_log` - Show commit history
- `git_show` - Show commit details
- `git_branch` - List branches
- `git_checkout` - Switch branches

**Prerequisites:**
- Python 3.8+ with `uvx` (pipx) installed
- Git installed on the system

**Tags:** git, vcs, local

---

#### Memory

Knowledge graph-based persistent memory. Agents can remember facts, relationships, and context across sessions.

| Property | Value |
|----------|-------|
| **ID** | `memory` |
| **Author** | Model Context Protocol |
| **Package** | `@modelcontextprotocol/server-memory` |
| **Repository** | https://github.com/modelcontextprotocol/servers |
| **Transport** | STDIO |
| **Command** | `npx -y @modelcontextprotocol/server-memory` |

**Configuration:** None required

**Available Tools:**
- `create_entities` - Create new entities in the knowledge graph
- `create_relations` - Create relationships between entities
- `search_nodes` - Search for entities by query
- `open_nodes` - Retrieve entity details
- `delete_entities` - Remove entities from the graph

**Use Cases:**
- Persistent context across sessions
- Building knowledge bases
- Tracking relationships between concepts

**Tags:** memory, knowledge-graph, persistence

---

#### Fetch

Optimized web content fetching. Converts HTML to clean Markdown for efficient consumption by agents.

| Property | Value |
|----------|-------|
| **ID** | `fetch` |
| **Author** | Model Context Protocol |
| **Package** | `mcp-server-fetch` (Python) |
| **Repository** | https://github.com/modelcontextprotocol/servers |
| **Transport** | STDIO |
| **Command** | `uvx mcp-server-fetch` |

**Configuration:** None required

**Available Tools:**
- `fetch` - Fetch a URL and convert to Markdown

**Use Cases:**
- Reading documentation
- Scraping web content
- Retrieving API documentation

**Prerequisites:**
- Python 3.8+ with `uvx` (pipx) installed

**Tags:** web, scraping, documentation

---

#### Brave Search

Web and local search using Brave Search API. Give your agent live internet access without browser overhead.

| Property | Value |
|----------|-------|
| **ID** | `brave-search` |
| **Author** | Model Context Protocol |
| **Package** | `@modelcontextprotocol/server-brave-search` |
| **Repository** | https://github.com/modelcontextprotocol/servers |
| **Transport** | STDIO |
| **Command** | `npx -y @modelcontextprotocol/server-brave-search` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `BRAVE_API_KEY` | password | Yes | API key from https://brave.com/search/api/ |

**Available Tools:**
- `brave_web_search` - Search the web
- `brave_local_search` - Search local content

**Getting Your API Key:**
1. Visit https://brave.com/search/api/
2. Sign up for an API account
3. Create a new API key
4. Copy and paste during installation

**Tags:** search, web, internet

---

#### Google Drive

Access and search files in Google Drive. Retrieve documents, specs, and data stored in the cloud.

| Property | Value |
|----------|-------|
| **ID** | `google-drive` |
| **Author** | Model Context Protocol |
| **Package** | `@modelcontextprotocol/server-gdrive` |
| **Repository** | https://github.com/modelcontextprotocol/servers |
| **Transport** | STDIO |
| **Command** | `npx -y @modelcontextprotocol/server-gdrive` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `credentials_path` | string | Yes | Path to Google OAuth credentials JSON |

**Available Tools:**
- `search_files` - Search for files in Drive
- `read_file` - Read file contents
- `list_files` - List files in a folder

**Setup Instructions:**
1. Create a project in Google Cloud Console
2. Enable the Google Drive API
3. Create OAuth 2.0 credentials
4. Download the credentials JSON file
5. Provide the path during installation

**Tags:** cloud, storage, google

---

### Cloud and Infrastructure

Servers for managing cloud resources and container infrastructure.

---

#### Docker

Full Docker control - list containers, view logs, start/stop containers, manage images and networks.

| Property | Value |
|----------|-------|
| **ID** | `docker` |
| **Author** | Community |
| **Package** | `mcp-server-docker` (Python) |
| **Repository** | https://github.com/ckreiling/mcp-server-docker |
| **Transport** | STDIO |
| **Command** | `uvx mcp-server-docker` |

**Configuration:** None required (uses local Docker socket)

**Available Tools:**
- `list_containers` - List all containers
- `inspect_container` - Get container details
- `container_logs` - View container logs
- `start_container` - Start a stopped container
- `stop_container` - Stop a running container
- `list_images` - List Docker images
- `pull_image` - Pull an image from registry

**Prerequisites:**
- Docker installed and running
- Python 3.8+ with `uvx` (pipx) installed
- User in `docker` group (or root access)

**Tags:** docker, containers, devops

---

#### Kubernetes

Query pods, deployments, services. Retrieve logs and check cluster health across namespaces.

| Property | Value |
|----------|-------|
| **ID** | `kubernetes` |
| **Author** | Community |
| **Package** | `mcp-k8s` |
| **Repository** | https://github.com/strowk/mcp-k8s-go |
| **Transport** | STDIO |
| **Command** | `npx -y mcp-k8s` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `kubeconfig` | string | No | Path to kubeconfig file (defaults to ~/.kube/config) |

**Available Tools:**
- `get_pods` - List pods in a namespace
- `get_deployments` - List deployments
- `get_services` - List services
- `get_logs` - Get pod logs
- `describe_pod` - Get pod details
- `get_namespaces` - List all namespaces

**Prerequisites:**
- kubectl configured with cluster access
- Valid kubeconfig file

**Tags:** kubernetes, k8s, containers, orchestration

---

#### Azure

Interact with Azure resources via natural language. Query subscriptions, manage resource groups, list/restart VMs.

| Property | Value |
|----------|-------|
| **ID** | `azure` |
| **Author** | Microsoft |
| **Package** | `@azure/mcp` |
| **Repository** | https://github.com/Azure/azure-mcp |
| **Transport** | STDIO |
| **Command** | `npx -y @azure/mcp` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `AZURE_SUBSCRIPTION_ID` | string | Yes | Azure Subscription ID |

**Available Tools:**
- `list_resource_groups` - List resource groups
- `list_vms` - List virtual machines
- `restart_vm` - Restart a VM
- `get_vm_status` - Get VM status
- `list_storage_accounts` - List storage accounts

**Prerequisites:**
- Azure CLI installed and logged in (`az login`)
- Valid Azure subscription

**Tags:** azure, cloud, microsoft, vms

---

#### AWS

AWS integration for S3, Lambda, EC2, CloudWatch. Inspect buckets, check logs, manage instances.

| Property | Value |
|----------|-------|
| **ID** | `aws` |
| **Author** | Community |
| **Package** | `mcp-server-aws` (Python) |
| **Repository** | https://github.com/aws-samples/mcp-server-aws |
| **Transport** | STDIO |
| **Command** | `uvx mcp-server-aws` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `AWS_REGION` | string | Yes | Default AWS region (e.g., us-east-1) |
| `AWS_PROFILE` | string | No | AWS credentials profile name |

**Available Tools:**
- `s3_list_buckets` - List S3 buckets
- `s3_get_object` - Get object from S3
- `ec2_describe_instances` - List EC2 instances
- `lambda_list_functions` - List Lambda functions
- `cloudwatch_get_logs` - Get CloudWatch logs

**Prerequisites:**
- AWS CLI configured with credentials
- Python 3.8+ with `uvx` (pipx) installed

**Tags:** aws, cloud, amazon, s3, lambda

---

### Databases

Servers for database access and management.

---

#### PostgreSQL

Full PostgreSQL access with schema inspection. Query data, generate reports, or let agents write safe SQL.

| Property | Value |
|----------|-------|
| **ID** | `postgresql` |
| **Author** | Model Context Protocol |
| **Package** | `@modelcontextprotocol/server-postgres` |
| **Repository** | https://github.com/modelcontextprotocol/servers |
| **Transport** | STDIO |
| **Command** | `npx -y @modelcontextprotocol/server-postgres` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `POSTGRES_CONNECTION_STRING` | password | Yes | PostgreSQL connection URL |

**Connection String Format:**
```
postgresql://user:password@host:5432/database
```

**Available Tools:**
- `query` - Execute SQL query
- `list_tables` - List all tables
- `describe_table` - Get table schema

**Security Notes:**
- Use a read-only user for safety
- Limit permissions to specific schemas
- Never expose connection strings in logs

**Tags:** sql, database, postgres

---

#### SQLite

Lightweight SQLite database access. Perfect for local databases, logs, or embedded data stores.

| Property | Value |
|----------|-------|
| **ID** | `sqlite` |
| **Author** | Model Context Protocol |
| **Package** | `mcp-server-sqlite` (Python) |
| **Repository** | https://github.com/modelcontextprotocol/servers |
| **Transport** | STDIO |
| **Command** | `uvx mcp-server-sqlite --db-path` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `db_path` | string | Yes | Path to SQLite database file |

**Available Tools:**
- `read_query` - Execute SELECT query
- `write_query` - Execute INSERT/UPDATE/DELETE
- `create_table` - Create a new table
- `list_tables` - List all tables
- `describe_table` - Get table schema

**Prerequisites:**
- Python 3.8+ with `uvx` (pipx) installed

**Tags:** sql, database, sqlite, local

---

### Developer Tools

Servers for development, debugging, and automation.

---

#### Sentry

Retrieve and analyze error tracking issues from Sentry. Debug production errors with AI assistance.

| Property | Value |
|----------|-------|
| **ID** | `sentry` |
| **Author** | Community |
| **Package** | `@sentry/mcp-server` |
| **Repository** | https://github.com/getsentry/sentry-mcp |
| **Transport** | STDIO |
| **Command** | `npx -y @sentry/mcp-server` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `SENTRY_AUTH_TOKEN` | password | Yes | Sentry API authentication token |
| `SENTRY_ORG` | string | Yes | Your Sentry organization slug |

**Available Tools:**
- `list_issues` - List project issues
- `get_issue` - Get issue details
- `list_events` - List issue events
- `resolve_issue` - Resolve an issue

**Getting Your Auth Token:**
1. Go to Sentry Settings > Developer Settings > Internal Integrations
2. Create a new internal integration
3. Grant permissions: `issue:read`, `issue:write`, `event:read`
4. Copy the token

**Tags:** errors, monitoring, debugging

---

#### Puppeteer

Browser automation with Puppeteer. Navigate pages, take screenshots, fill forms, and extract data.

| Property | Value |
|----------|-------|
| **ID** | `puppeteer` |
| **Author** | Model Context Protocol |
| **Package** | `@modelcontextprotocol/server-puppeteer` |
| **Repository** | https://github.com/modelcontextprotocol/servers |
| **Transport** | STDIO |
| **Command** | `npx -y @modelcontextprotocol/server-puppeteer` |

**Configuration:** None required

**Available Tools:**
- `puppeteer_navigate` - Navigate to a URL
- `puppeteer_screenshot` - Take a screenshot
- `puppeteer_click` - Click an element
- `puppeteer_fill` - Fill a form field
- `puppeteer_evaluate` - Execute JavaScript

**Prerequisites:**
- Chrome/Chromium installed (or will be downloaded)

**Use Cases:**
- Web scraping with JavaScript-rendered content
- Automated testing
- Screenshot generation
- Form automation

**Tags:** browser, automation, testing, scraping

---

#### Sequential Thinking

Enhanced reasoning through dynamic thought chains. Helps agents break down complex problems step-by-step.

| Property | Value |
|----------|-------|
| **ID** | `sequential-thinking` |
| **Author** | Model Context Protocol |
| **Package** | `@modelcontextprotocol/server-sequential-thinking` |
| **Repository** | https://github.com/modelcontextprotocol/servers |
| **Transport** | STDIO |
| **Command** | `npx -y @modelcontextprotocol/server-sequential-thinking` |

**Configuration:** None required

**Available Tools:**
- `sequential_thinking` - Process a problem step-by-step

**Use Cases:**
- Complex problem decomposition
- Multi-step reasoning
- Planning and analysis

**Tags:** reasoning, thinking, analysis

---

### Productivity and Knowledge

Servers for productivity tools and knowledge management.

---

#### Slack

Slack integration for ChatOps. Manage channels, send messages, search conversations, and automate workflows.

| Property | Value |
|----------|-------|
| **ID** | `slack` |
| **Author** | Model Context Protocol |
| **Package** | `@modelcontextprotocol/server-slack` |
| **Repository** | https://github.com/modelcontextprotocol/servers |
| **Transport** | STDIO |
| **Command** | `npx -y @modelcontextprotocol/server-slack` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `SLACK_BOT_TOKEN` | password | Yes | Slack Bot OAuth token (xoxb-...) |
| `SLACK_TEAM_ID` | string | Yes | Slack workspace team ID |

**Available Tools:**
- `list_channels` - List workspace channels
- `post_message` - Send a message
- `reply_to_thread` - Reply to a thread
- `add_reaction` - Add emoji reaction
- `get_channel_history` - Get channel messages
- `search_messages` - Search messages

**Creating a Slack App:**
1. Go to https://api.slack.com/apps
2. Create a new app
3. Add OAuth scopes: `channels:read`, `chat:write`, `reactions:write`, `search:read`
4. Install to workspace
5. Copy the Bot User OAuth Token

**Tags:** chat, messaging, chatops

---

#### Notion

Read and write to Notion pages and databases. Manage your knowledge base and documentation with AI.

| Property | Value |
|----------|-------|
| **ID** | `notion` |
| **Author** | Community |
| **Package** | `notion-mcp-server` |
| **Repository** | https://github.com/makenotion/notion-mcp-server |
| **Transport** | STDIO |
| **Command** | `npx -y notion-mcp-server` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `NOTION_API_KEY` | password | Yes | Notion integration secret key |

**Available Tools:**
- `search` - Search pages and databases
- `get_page` - Get page content
- `create_page` - Create a new page
- `update_page` - Update page content
- `query_database` - Query a database
- `create_database_item` - Add item to database

**Creating a Notion Integration:**
1. Go to https://www.notion.so/my-integrations
2. Create a new integration
3. Copy the Internal Integration Secret
4. Share pages/databases with your integration

**Tags:** notes, knowledge, documentation

---

#### Obsidian

Access your Obsidian vault. Search notes, read content, create new notes, and manage your second brain.

| Property | Value |
|----------|-------|
| **ID** | `obsidian` |
| **Author** | Community |
| **Package** | `mcp-obsidian` |
| **Repository** | https://github.com/smithery-ai/mcp-obsidian |
| **Transport** | STDIO |
| **Command** | `npx -y mcp-obsidian` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `vault_path` | string | Yes | Path to your Obsidian vault |

**Available Tools:**
- `search_notes` - Search notes by content
- `read_note` - Read note contents
- `create_note` - Create a new note
- `update_note` - Update note contents
- `list_notes` - List all notes
- `get_backlinks` - Get backlinks to a note

**Example Configuration:**
```json
{
  "vault_path": "/home/user/Documents/Obsidian/MyVault"
}
```

**Tags:** notes, knowledge, markdown, pkm

---

#### Google Maps

Location services with Google Maps. Geocoding, directions, place search, and distance calculations.

| Property | Value |
|----------|-------|
| **ID** | `google-maps` |
| **Author** | Model Context Protocol |
| **Package** | `@modelcontextprotocol/server-google-maps` |
| **Repository** | https://github.com/modelcontextprotocol/servers |
| **Transport** | STDIO |
| **Command** | `npx -y @modelcontextprotocol/server-google-maps` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `GOOGLE_MAPS_API_KEY` | password | Yes | Google Maps Platform API key |

**Available Tools:**
- `maps_geocode` - Convert address to coordinates
- `maps_reverse_geocode` - Convert coordinates to address
- `maps_search_places` - Search for places
- `maps_directions` - Get directions between locations
- `maps_distance_matrix` - Calculate distances

**Getting Your API Key:**
1. Go to Google Cloud Console
2. Enable Maps JavaScript API, Geocoding API, Places API, Directions API
3. Create an API key
4. Restrict the key to your IP/domain for security

**Tags:** maps, location, google

---

### Search and Web

Servers for web search and content generation.

---

#### Exa Search

Neural search engine API. More precise search results for technical queries and research.

| Property | Value |
|----------|-------|
| **ID** | `exa` |
| **Author** | Community |
| **Package** | `exa-mcp-server` |
| **Repository** | https://github.com/exa-labs/exa-mcp-server |
| **Transport** | STDIO |
| **Command** | `npx -y exa-mcp-server` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `EXA_API_KEY` | password | Yes | API key from exa.ai |

**Available Tools:**
- `web_search` - Search the web with neural precision
- `find_similar` - Find similar content to a URL
- `get_contents` - Get full page contents

**Getting Your API Key:**
1. Sign up at https://exa.ai
2. Navigate to API settings
3. Generate a new API key

**Tags:** search, web, research

---

#### EverArt

AI image generation using various models. Create images from text prompts.

| Property | Value |
|----------|-------|
| **ID** | `everart` |
| **Author** | Model Context Protocol |
| **Package** | `@modelcontextprotocol/server-everart` |
| **Repository** | https://github.com/modelcontextprotocol/servers |
| **Transport** | STDIO |
| **Command** | `npx -y @modelcontextprotocol/server-everart` |

**Configuration:**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `EVERART_API_KEY` | password | Yes | EverArt API key |

**Available Tools:**
- `generate_image` - Generate an image from a prompt
- `list_models` - List available image models

**Tags:** images, ai, generation

---

## Installation

### One-Click Installation

1. Navigate to **Admin Dashboard > Automation > MCP** tab
2. Browse or search the catalog
3. Click **Install** on the desired server
4. Fill in any required configuration (API keys, paths, etc.)
5. Click **Install** to confirm
6. The server will automatically start and discover tools

### Manual Installation

You can also install servers programmatically via the API:

```bash
# Install a server from catalog
curl -X POST http://localhost:5275/api/mcp/catalog/install/filesystem \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "directories": ["/home/user/projects"]
    },
    "isGlobal": true,
    "autoStart": true
  }'
```

### Verifying Installation

After installation, verify the server is running:

```bash
# Check server status
curl http://localhost:5275/api/mcp

# Check installed catalog servers
curl http://localhost:5275/api/mcp/catalog/installed
```

---

## Custom MCP Servers

You can add custom MCP servers that are not in the catalog.

### Adding via UI

1. Navigate to **Admin Dashboard > Automation > MCP** tab
2. Click **Add Server** button
3. Fill in the configuration:
   - **Name**: Display name for the server
   - **Transport**: STDIO, SSE, or WebSocket
   - **Command** (STDIO): The command to run
   - **Arguments**: Command-line arguments
   - **Environment Variables**: Environment variables to set
   - **URL** (SSE/WebSocket): Server endpoint URL
   - **Headers**: HTTP headers for authentication

### Adding via API

```bash
curl -X POST http://localhost:5275/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Custom Server",
    "transport": "STDIO",
    "command": "node",
    "args": ["/path/to/my-mcp-server.js"],
    "env": {
      "API_KEY": "my-secret-key"
    },
    "enabled": true,
    "isGlobal": true
  }'
```

### Custom Server Requirements

Your custom MCP server must:

1. Implement the MCP JSON-RPC protocol
2. Support `initialize` method
3. Support `tools/list` method
4. Support `tools/call` method
5. Communicate via STDIO (stdin/stdout) or HTTP (SSE/WebSocket)

**Example Protocol Messages:**

```json
// Initialize request
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "console-web", "version": "1.0.0"}}}

// Tools list request
{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}

// Tool call request
{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "my_tool", "arguments": {"key": "value"}}}
```

---

## API Reference

### Catalog Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mcp/catalog` | Get full catalog with categories |
| GET | `/api/mcp/catalog/categories` | Get categories with server counts |
| GET | `/api/mcp/catalog/category/:id` | Get servers in a category |
| GET | `/api/mcp/catalog/search?q=query` | Search catalog servers |
| GET | `/api/mcp/catalog/server/:id` | Get catalog server details |
| GET | `/api/mcp/catalog/installed` | Get installed catalog servers |
| POST | `/api/mcp/catalog/install/:id` | Install server from catalog |

### Server CRUD Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mcp` | List all installed servers |
| GET | `/api/mcp/:id` | Get server details |
| POST | `/api/mcp` | Create custom server |
| PUT | `/api/mcp/:id` | Update server |
| DELETE | `/api/mcp/:id` | Delete server |

### Server Lifecycle Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mcp/:id/start` | Start server |
| POST | `/api/mcp/:id/stop` | Stop server |
| POST | `/api/mcp/:id/restart` | Restart server |
| POST | `/api/mcp/:id/toggle` | Toggle enabled state |

### Tool Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mcp/tools/all` | Get all tools across servers |
| GET | `/api/mcp/:id/tools` | Get tools for a server |
| POST | `/api/mcp/:id/discover` | Refresh tool discovery |
| POST | `/api/mcp/:id/tools/:name/call` | Call a tool |

### Log Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mcp/logs` | Get tool call logs |
| DELETE | `/api/mcp/logs/cleanup?days=7` | Clean up old logs |

### Status Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mcp/status/manager` | Get MCP manager status |
| GET | `/api/mcp/meta/transports` | Get available transport types |

---

## Transport Types

MCP servers can communicate via three transport methods:

### STDIO (Standard I/O)

The most common transport. Spawns a local process and communicates via stdin/stdout.

**Configuration:**
- `command`: The executable to run (e.g., `npx`, `uvx`, `node`)
- `args`: Command-line arguments
- `env`: Environment variables

**Example:**
```json
{
  "transport": "STDIO",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
}
```

### SSE (Server-Sent Events)

Connects to an HTTP server using Server-Sent Events.

**Configuration:**
- `url`: The SSE endpoint URL
- `headers`: Optional HTTP headers

**Example:**
```json
{
  "transport": "SSE",
  "url": "https://mcp.example.com/sse",
  "headers": {
    "Authorization": "Bearer token"
  }
}
```

### WebSocket

Connects via WebSocket protocol.

**Configuration:**
- `url`: The WebSocket endpoint URL (ws:// or wss://)
- `headers`: Optional HTTP headers for handshake

**Example:**
```json
{
  "transport": "WEBSOCKET",
  "url": "wss://mcp.example.com/ws",
  "headers": {
    "Authorization": "Bearer token"
  }
}
```

---

## Troubleshooting

### Server Won't Start

1. **Check prerequisites**: Ensure required runtime (Node.js, Python, uvx) is installed
2. **Check permissions**: Verify the command can be executed
3. **Check environment variables**: Ensure all required env vars are set
4. **Check logs**: View server stderr output in the MCP dashboard

```bash
# Test command manually
npx -y @modelcontextprotocol/server-filesystem /home/user/projects
```

### Server Disconnects

1. **Check health status**: Servers are health-checked every 60 seconds
2. **Check process status**: The process may have crashed
3. **Restart the server**: Use the restart button or API

### Tool Discovery Fails

1. **Ensure server is running**: Check status is CONNECTED
2. **Check protocol version**: Server must support `tools/list`
3. **Manual refresh**: Click the refresh button to retry discovery

### API Keys Not Working

1. **Check key format**: Ensure the key is properly formatted
2. **Check permissions**: Verify the key has required scopes
3. **Check expiration**: Some keys have expiration dates
4. **Check rate limits**: You may have hit API rate limits

### Python-based Servers (uvx)

If `uvx` command is not found:

```bash
# Install pipx
python3 -m pip install --user pipx
python3 -m pipx ensurepath

# Verify uvx works
uvx --version
```

### Common Error Messages

| Error | Solution |
|-------|----------|
| `Server not found` | Server ID is invalid or server was deleted |
| `Request timeout` | Server is not responding - check if process is running |
| `Invalid transport type` | Use STDIO, SSE, or WEBSOCKET |
| `Command is required for STDIO` | Provide a command for STDIO transport |
| `URL is required for SSE/WebSocket` | Provide a URL for HTTP-based transports |
| `Server already installed` | Catalog server is already installed |

---

## Socket.IO Events

The MCP manager emits real-time events:

| Event | Payload | Description |
|-------|---------|-------------|
| `mcp-status-change` | `{ serverId, status, error? }` | Server status changed |
| `mcp-tools-updated` | `{ serverId, count }` | Tools were discovered/refreshed |

**Example Client:**
```javascript
socket.on('mcp-status-change', ({ serverId, status, error }) => {
  console.log(`Server ${serverId} is now ${status}`);
  if (error) {
    console.error(`Error: ${error}`);
  }
});
```

---

## Related Documentation

- [CLAUDE.md](/home/thornburywn/Projects/console-web/CLAUDE.md) - Project documentation
- [TECHNICAL_SPECIFICATIONS.md](/home/thornburywn/Projects/console-web/docs/TECHNICAL_SPECIFICATIONS.md) - Full technical specs
- [SOCKET-EVENTS.md](/home/thornburywn/Projects/console-web/docs/SOCKET-EVENTS.md) - Socket.IO event reference

---

**Created:** 2026-01-18
**Maintained By:** Console.web Team
