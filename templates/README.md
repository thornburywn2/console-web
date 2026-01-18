# Project Templates

This directory contains standardized project templates for creating new projects through Console.web.

## Available Templates

| Template | Type | Description |
|----------|------|-------------|
| `base/` | - | Common files inherited by all templates |
| `web-app-fullstack/` | `web-app-fullstack` | React + Fastify + Prisma full-stack application |
| `web-app-frontend/` | `web-app-frontend` | React + Vite frontend-only application |
| `desktop-tauri/` | `desktop` | Tauri desktop application (React + Rust) |
| `infrastructure/` | `infrastructure` | Docker Compose infrastructure stack |
| `cli-tool/` | `cli` | Node.js/Bun CLI tool |
| `mobile-flutter/` | `mobile` | Flutter mobile application |

## Template Variables

Templates use placeholders that get replaced when creating a new project:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{PROJECT_NAME}}` | Project name (kebab-case) | `my-awesome-app` |
| `{{PROJECT_DESCRIPTION}}` | Project description | `A web application for...` |
| `{{PORT}}` | Primary port number | `5175` |
| `{{API_PORT}}` | API port (full-stack only) | `5176` |
| `{{GITHUB_USER}}` | GitHub username | `thornburywn` |
| `{{PROJECT_DOMAIN}}` | Production domain | `app.example.com` |
| `{{PROJECT_TYPE}}` | Template type | `web-app-fullstack` |
| `{{TECH_STACK}}` | Tech stack table rows | Generated |

## Usage

When creating a new project through Console.web:

1. Select project type
2. Fill in project details (name, description, port)
3. Template files are copied to `~/Projects/{project-name}/`
4. Variables are replaced with actual values
5. Git repository is initialized
6. Dependencies are installed

## Template Structure

Each template inherits from `base/` and adds type-specific files:

```
base/                        # Common to ALL projects
├── CLAUDE.md               # Project instructions template
├── README.md               # Project README template
├── .gitignore              # Standard ignores
├── .env.example            # Environment template
├── Dockerfile              # Container definition
├── docker-compose.yml      # Docker Compose
├── .prettierrc             # Prettier config
├── eslint.config.js        # ESLint config
├── .husky/                 # Git hooks
│   ├── pre-commit
│   └── pre-push
└── .github/workflows/      # CI/CD workflows
    ├── ci.yml
    ├── security.yml
    └── deploy.yml

web-app-fullstack/          # Full-stack specific
├── CLAUDE.md               # Overrides base CLAUDE.md
├── package.json            # Full-stack dependencies
├── tsconfig.json           # TypeScript config
├── vitest.config.ts        # Test config
└── prisma/
    └── schema.prisma       # Database schema
```

---

## Included Patterns

All templates follow enterprise-grade patterns proven in Console.web v1.0.24+.

### Error Handling

**Backend**: `sendSafeError()` pattern for sanitized error responses
```javascript
// Returns sanitized message + reference ID
// Logs full error details internally
sendSafeError(res, error, 'Operation failed');
```

**Frontend**: Centralized API service with `ApiError` class
```javascript
// User-friendly error messages via getUserMessage()
catch (error) {
  if (error instanceof ApiError) {
    showToast(error.getUserMessage());
  }
}
```

### Input Validation

All API endpoints validate input with Zod schemas:
```javascript
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});
router.post('/', validateBody(schema), handler);
```

### Testing Structure

```
tests/
├── unit/           # Unit tests (Vitest)
├── integration/    # API tests (Supertest)
└── e2e/            # E2E tests (Playwright)
```

**Coverage Requirements**: 80% statements, 70% branches

### Observability (Optional)

Enable via environment variables:
- `OTEL_EXPORTER_OTLP_ENDPOINT` - Distributed tracing (Jaeger)
- `SENTRY_DSN` - Error tracking (Sentry)
- `LOG_FILE` - JSON file logging

### Security Headers

Helmet middleware configured for:
- HSTS with 1-year max-age
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Content Security Policy (application-specific)

---

## Customization

To modify templates:

1. Edit files in the appropriate template directory
2. Update `README.md` if adding new templates
3. Update `registry.json` for UI metadata
4. Test by creating a new project through Console.web

## Standards

All templates follow the global standards defined in `~/CLAUDE.md`:

- TypeScript strict mode
- 80%+ test coverage target
- Security-first approach (input validation, no secrets in code)
- Pre-commit hooks (lint, format, typecheck)
- GitHub Actions CI/CD
- Docker deployment ready

## Adding New Templates

1. Create new directory: `templates/{template-name}/`
2. Add `CLAUDE.md` with type-specific instructions
3. Add type-specific configuration files
4. Update this README
5. Add entry to `registry.json`
6. Register template in Console.web UI

## Registry

The `registry.json` file contains metadata for all templates:

```json
{
  "templates": [
    {
      "id": "web-app-fullstack",
      "name": "Full-Stack Web App",
      "description": "React + Fastify + PostgreSQL",
      "stack": ["React 18", "TypeScript", "Fastify", "Prisma"],
      "category": "web",
      "difficulty": "intermediate",
      "variables": [...],
      "postCreateCommands": ["bun install", "bunx prisma generate"]
    }
  ],
  "complianceWeights": {
    "ci_workflow": 20,
    "security_workflow": 20,
    "pre_commit_hooks": 15,
    "typescript_strict": 15,
    "eslint_config": 10,
    "prettier_config": 10,
    "claude_md": 10
  }
}
```

## Compliance Scoring

Projects are scored against these criteria:

| Criteria | Weight | Description |
|----------|--------|-------------|
| CI Workflow | 20% | GitHub Actions CI present |
| Security Workflow | 20% | Security scanning enabled |
| Pre-commit Hooks | 15% | Husky + lint-staged configured |
| TypeScript Strict | 15% | `"strict": true` in tsconfig |
| ESLint Config | 10% | ESLint configuration present |
| Prettier Config | 10% | Prettier configuration present |
| CLAUDE.md | 10% | Project instructions present |

**Thresholds**: Good (90%+), Warning (70-89%), Critical (<70%)
