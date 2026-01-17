# Template System Integration Plan

## Overview

This document outlines the full integration of the standardized project template system into Console.web (console-web). The goal is to enable one-click project creation with enterprise-grade enforcement from day one.

---

## Phase 1: Migration Script

### Purpose
Add enforcement files to existing projects that lack them.

### Script: `scripts/migrate-project.js`

**Functionality:**
1. Scan target project for missing files
2. Copy missing files from `templates/base/`
3. Merge configurations (don't overwrite existing)
4. Initialize git hooks if not present
5. Report what was added/skipped

**Files to Check/Add:**
- `.github/workflows/ci.yml`
- `.github/workflows/security.yml`
- `.github/workflows/deploy.yml`
- `.husky/pre-commit`
- `.husky/pre-push`
- `.gitignore` (merge, don't replace)
- `.env.example` (if missing)
- `eslint.config.js` (if missing)
- `.prettierrc` (if missing)

**CLI Usage:**
```bash
node scripts/migrate-project.js /path/to/project [--dry-run] [--force]
```

**Options:**
- `--dry-run`: Show what would be added without making changes
- `--force`: Overwrite existing files (use with caution)
- `--skip-hooks`: Don't install husky hooks

---

## Phase 2: Backend API Routes

### New Routes in `server/routes/templates.js`

#### GET /api/templates
List available project templates.

**Response:**
```json
{
  "templates": [
    {
      "id": "web-app-fullstack",
      "name": "Full-Stack Web App",
      "description": "React + Fastify + Prisma",
      "icon": "layers",
      "stack": ["React", "TypeScript", "Fastify", "Prisma", "PostgreSQL"]
    },
    ...
  ]
}
```

#### GET /api/templates/:id
Get template details and required variables.

**Response:**
```json
{
  "id": "web-app-fullstack",
  "name": "Full-Stack Web App",
  "variables": [
    { "name": "PROJECT_NAME", "label": "Project Name", "type": "text", "required": true },
    { "name": "PROJECT_DESCRIPTION", "label": "Description", "type": "textarea", "required": true },
    { "name": "PORT", "label": "Frontend Port", "type": "number", "default": 5175 },
    { "name": "API_PORT", "label": "API Port", "type": "number", "default": 5176 }
  ],
  "files": ["CLAUDE.md", "package.json", "tsconfig.json", ...]
}
```

#### POST /api/templates/create
Create a new project from template.

**Request:**
```json
{
  "templateId": "web-app-fullstack",
  "variables": {
    "PROJECT_NAME": "my-new-app",
    "PROJECT_DESCRIPTION": "A new application",
    "PORT": 5180,
    "API_PORT": 5181
  },
  "options": {
    "initGit": true,
    "installDeps": true,
    "createGitHubRepo": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "project": {
    "name": "my-new-app",
    "path": "/home/thornburywn/Projects/my-new-app",
    "type": "web-app-fullstack"
  },
  "filesCreated": 25,
  "message": "Project created successfully"
}
```

#### POST /api/templates/migrate
Migrate an existing project to use enforcement files.

**Request:**
```json
{
  "projectPath": "/home/thornburywn/Projects/existing-project",
  "options": {
    "dryRun": false,
    "force": false,
    "skipHooks": false
  }
}
```

#### GET /api/templates/check/:project
Check which template files are missing from a project.

**Response:**
```json
{
  "project": "existing-project",
  "missing": [".github/workflows/ci.yml", ".husky/pre-commit"],
  "present": [".gitignore", "package.json"],
  "outdated": ["eslint.config.js"],
  "complianceScore": 65
}
```

---

## Phase 3: Template Service

### File: `server/services/templateService.js`

**Class: TemplateService**

```javascript
class TemplateService {
  constructor(templatesDir, projectsDir) { }

  // List available templates
  async listTemplates() { }

  // Get template details
  async getTemplate(templateId) { }

  // Create project from template
  async createProject(templateId, variables, options) { }

  // Migrate existing project
  async migrateProject(projectPath, options) { }

  // Check project compliance
  async checkCompliance(projectPath) { }

  // Replace variables in file content
  replaceVariables(content, variables) { }

  // Copy template files to destination
  async copyTemplateFiles(templateId, destPath, variables) { }

  // Merge configurations (gitignore, package.json)
  async mergeConfig(srcFile, destFile, type) { }

  // Initialize git repository
  async initGit(projectPath) { }

  // Install dependencies
  async installDependencies(projectPath) { }

  // Setup husky hooks
  async setupHusky(projectPath) { }
}
```

---

## Phase 4: Frontend Components

### New Components

#### 1. ProjectCreator.jsx
Main wizard for creating new projects.

**Features:**
- Step 1: Select project type (template cards)
- Step 2: Fill in project details (form)
- Step 3: Configure options (git, deps, GitHub)
- Step 4: Review and create
- Step 5: Success with next steps

**Location:** `src/components/ProjectCreator.jsx`

#### 2. TemplateCard.jsx
Display card for each template type.

**Props:**
- `template`: Template object
- `selected`: Boolean
- `onSelect`: Callback

**Location:** `src/components/TemplateCard.jsx`

#### 3. ProjectMigrator.jsx
UI for migrating existing projects.

**Features:**
- Select project from list
- Show compliance check results
- Select files to add
- Run migration
- Show results

**Location:** `src/components/ProjectMigrator.jsx`

#### 4. ComplianceChecker.jsx
Display compliance status for a project.

**Features:**
- Overall score (percentage)
- List of missing files
- List of outdated files
- One-click fix button

**Location:** `src/components/ComplianceChecker.jsx`

---

## Phase 5: Admin Dashboard Integration

### Updates to AdminDashboard.jsx

#### PROJECTS Tab Enhancement

Add new sub-tabs:
- **LIST**: Existing project list (current)
- **CREATE**: New project wizard
- **MIGRATE**: Migration tool

**New Buttons:**
- "New Project" button opens ProjectCreator modal
- "Check Compliance" button on each project row
- "Migrate" button for non-compliant projects

#### Project Row Enhancement

Add compliance indicator:
- Green check: Fully compliant
- Yellow warning: Partially compliant
- Red X: Missing enforcement

Click indicator to open ComplianceChecker modal.

---

## Phase 6: Template Registry

### File: `templates/registry.json`

Central registry of all templates with metadata.

```json
{
  "version": "1.0.0",
  "templates": [
    {
      "id": "web-app-fullstack",
      "name": "Full-Stack Web App",
      "description": "React frontend with Fastify backend and PostgreSQL database",
      "icon": "layers",
      "color": "#3B82F6",
      "stack": ["React 18", "TypeScript", "Fastify", "Prisma", "PostgreSQL", "Tailwind CSS"],
      "category": "web",
      "difficulty": "intermediate",
      "estimatedSetupTime": "5 minutes",
      "inheritsFrom": "base",
      "variables": [
        {
          "name": "PROJECT_NAME",
          "label": "Project Name",
          "type": "text",
          "required": true,
          "pattern": "^[a-z][a-z0-9-]*$",
          "patternMessage": "Lowercase letters, numbers, and hyphens only"
        },
        {
          "name": "PROJECT_DESCRIPTION",
          "label": "Description",
          "type": "textarea",
          "required": true,
          "maxLength": 500
        },
        {
          "name": "PORT",
          "label": "Frontend Port",
          "type": "number",
          "required": true,
          "default": 5175,
          "min": 1024,
          "max": 65535
        },
        {
          "name": "API_PORT",
          "label": "API Port",
          "type": "number",
          "required": true,
          "default": 5176,
          "min": 1024,
          "max": 65535
        }
      ],
      "postCreateCommands": [
        "bun install",
        "bunx prisma generate"
      ],
      "documentation": "https://docs.example.com/templates/web-app-fullstack"
    },
    {
      "id": "web-app-frontend",
      "name": "Frontend Only",
      "description": "React frontend application without backend",
      "icon": "monitor",
      "color": "#10B981",
      "stack": ["React 18", "TypeScript", "Vite", "Tailwind CSS"],
      "category": "web",
      "difficulty": "beginner",
      "estimatedSetupTime": "2 minutes",
      "inheritsFrom": "base",
      "variables": [
        {
          "name": "PROJECT_NAME",
          "label": "Project Name",
          "type": "text",
          "required": true
        },
        {
          "name": "PROJECT_DESCRIPTION",
          "label": "Description",
          "type": "textarea",
          "required": true
        },
        {
          "name": "PORT",
          "label": "Dev Server Port",
          "type": "number",
          "default": 5173
        },
        {
          "name": "VITE_API_URL",
          "label": "API URL",
          "type": "text",
          "default": "http://localhost:3000"
        }
      ],
      "postCreateCommands": ["bun install"]
    },
    {
      "id": "desktop-tauri",
      "name": "Desktop App (Tauri)",
      "description": "Cross-platform desktop application with Tauri and React",
      "icon": "monitor",
      "color": "#8B5CF6",
      "stack": ["Tauri 2", "React 18", "TypeScript", "Rust", "Tailwind CSS"],
      "category": "desktop",
      "difficulty": "advanced",
      "estimatedSetupTime": "10 minutes",
      "inheritsFrom": "base",
      "requirements": ["rust", "cargo"],
      "variables": [
        {
          "name": "PROJECT_NAME",
          "label": "Project Name",
          "type": "text",
          "required": true
        },
        {
          "name": "PROJECT_DESCRIPTION",
          "label": "Description",
          "type": "textarea",
          "required": true
        },
        {
          "name": "BUNDLE_IDENTIFIER",
          "label": "Bundle Identifier",
          "type": "text",
          "default": "com.example.{{PROJECT_NAME}}"
        }
      ],
      "postCreateCommands": ["bun install", "cd src-tauri && cargo build"]
    },
    {
      "id": "infrastructure",
      "name": "Infrastructure Stack",
      "description": "Docker Compose infrastructure with services",
      "icon": "server",
      "color": "#F59E0B",
      "stack": ["Docker", "Docker Compose", "Cloudflare Tunnel"],
      "category": "infrastructure",
      "difficulty": "intermediate",
      "estimatedSetupTime": "5 minutes",
      "inheritsFrom": "base",
      "variables": [
        {
          "name": "PROJECT_NAME",
          "label": "Stack Name",
          "type": "text",
          "required": true
        },
        {
          "name": "PROJECT_DESCRIPTION",
          "label": "Description",
          "type": "textarea",
          "required": true
        },
        {
          "name": "DOMAIN",
          "label": "Primary Domain",
          "type": "text",
          "default": "app.example.com"
        }
      ],
      "postCreateCommands": []
    },
    {
      "id": "cli-tool",
      "name": "CLI Tool",
      "description": "Command-line utility with Bun/Node.js",
      "icon": "terminal",
      "color": "#EC4899",
      "stack": ["Bun", "TypeScript", "Commander.js"],
      "category": "cli",
      "difficulty": "beginner",
      "estimatedSetupTime": "3 minutes",
      "inheritsFrom": "base",
      "variables": [
        {
          "name": "PROJECT_NAME",
          "label": "CLI Name",
          "type": "text",
          "required": true
        },
        {
          "name": "PROJECT_DESCRIPTION",
          "label": "Description",
          "type": "textarea",
          "required": true
        },
        {
          "name": "BIN_NAME",
          "label": "Binary Name",
          "type": "text",
          "default": "{{PROJECT_NAME}}"
        }
      ],
      "postCreateCommands": ["bun install", "bun link"]
    },
    {
      "id": "mobile-flutter",
      "name": "Mobile App (Flutter)",
      "description": "Cross-platform mobile app with Flutter",
      "icon": "smartphone",
      "color": "#06B6D4",
      "stack": ["Flutter", "Dart", "Riverpod"],
      "category": "mobile",
      "difficulty": "intermediate",
      "estimatedSetupTime": "5 minutes",
      "inheritsFrom": null,
      "requirements": ["flutter", "dart"],
      "variables": [
        {
          "name": "PROJECT_NAME",
          "label": "App Name",
          "type": "text",
          "required": true
        },
        {
          "name": "PROJECT_DESCRIPTION",
          "label": "Description",
          "type": "textarea",
          "required": true
        },
        {
          "name": "BUNDLE_ID",
          "label": "Bundle ID (iOS)",
          "type": "text",
          "default": "com.example.{{PROJECT_NAME}}"
        },
        {
          "name": "PACKAGE_NAME",
          "label": "Package Name (Android)",
          "type": "text",
          "default": "com.example.{{PROJECT_NAME}}"
        }
      ],
      "postCreateCommands": ["flutter pub get"]
    }
  ]
}
```

---

## Phase 7: Port Allocation

### Integration with ~/PORTS.md

When creating a new project:
1. Read `~/PORTS.md` to find allocated ports
2. Suggest next available port range
3. Auto-allocate ports if user doesn't specify
4. Update `~/PORTS.md` with new allocation

### Port Allocation Service

```javascript
class PortAllocationService {
  constructor(portsFilePath) { }

  // Get all allocated ports
  async getAllocatedPorts() { }

  // Find next available port
  async getNextAvailablePort(startFrom = 5175) { }

  // Allocate port for project
  async allocatePort(projectName, port, service = 'dev') { }

  // Release port
  async releasePort(projectName) { }

  // Check if port is available
  async isPortAvailable(port) { }
}
```

---

## Phase 8: GitHub Integration

### Optional GitHub Repo Creation

When creating a project, optionally:
1. Create GitHub repository
2. Set up repository settings (branch protection, etc.)
3. Push initial commit
4. Configure GitHub Actions secrets

### GitHub Service Extension

Add to existing `server/routes/git.js`:

```javascript
// POST /api/git/create-repo
async function createRepository(name, description, isPrivate) { }

// POST /api/git/setup-actions-secrets
async function setupActionsSecrets(repo, secrets) { }
```

---

## Phase 9: Compliance Dashboard

### New Dashboard Widget: ProjectCompliance.jsx

**Features:**
- Overall compliance score across all projects
- List of non-compliant projects
- Quick-fix buttons
- Trend over time

**Location:** AdminDashboard OVERVIEW tab

---

## Implementation Order

1. **Day 1**: Migration script + Template service
2. **Day 2**: API routes + Registry
3. **Day 3**: Frontend components (ProjectCreator, TemplateCard)
4. **Day 4**: Admin dashboard integration
5. **Day 5**: Compliance checker + GitHub integration
6. **Day 6**: Testing + Documentation

---

## File Changes Summary

### New Files
```
server/
├── routes/templates.js          # API routes
├── services/templateService.js  # Core service
├── services/portAllocation.js   # Port management

src/components/
├── ProjectCreator.jsx           # Creation wizard
├── TemplateCard.jsx             # Template display
├── ProjectMigrator.jsx          # Migration UI
├── ComplianceChecker.jsx        # Compliance UI

scripts/
├── migrate-project.js           # CLI migration tool

templates/
├── registry.json                # Template registry
```

### Modified Files
```
server/index.js                  # Register new routes
src/components/AdminDashboard.jsx # Add new tabs/features
src/App.jsx                      # Add routes if needed
```

---

## Success Criteria

1. ✅ Create new project in < 60 seconds
2. ✅ All projects have CI/CD from day one
3. ✅ 100% of new projects pass security scan
4. ✅ Migration script works on all existing projects
5. ✅ Compliance score visible for all projects
6. ✅ One-click fix for non-compliant projects

---

## Testing Plan

1. **Unit Tests**: TemplateService methods
2. **Integration Tests**: API routes
3. **E2E Tests**: Full project creation flow
4. **Migration Tests**: Test on each existing project type
5. **Compliance Tests**: Verify scoring accuracy

---

*Document Version: 1.0.0*
*Created: 2026-01-13*
*Author: AI Assistant*
