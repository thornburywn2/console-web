# CLAUDE.md

**Project:** {{PROJECT_NAME}}
**Version:** 0.1.0
**Port:** {{PORT}}
**Type:** {{PROJECT_TYPE}}

---

## Project Overview

{{PROJECT_DESCRIPTION}}

## Tech Stack

| Layer | Technology |
|-------|------------|
{{TECH_STACK}}

## Development Commands

```bash
bun install          # Install dependencies
bun run dev          # Start development server
bun run build        # Production build
bun run test         # Run tests
bun run test:cov     # Run tests with coverage
bun run lint         # Lint code
bun run typecheck    # Type check
```

## Project Structure

```
{{PROJECT_NAME}}/
├── src/               # Source code
├── tests/             # Test files
├── .github/           # GitHub Actions workflows
├── CLAUDE.md          # This file
├── README.md          # Human documentation
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript config
├── .env.example       # Environment template
├── Dockerfile         # Container definition
└── docker-compose.yml # Local development
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PORT` | Server port | No (default: {{PORT}}) |

---

## Error Handling Patterns

### Backend (API Routes)

Use `sendSafeError()` for all error responses:

```javascript
import { sendSafeError } from '../utils/errors.js';

try {
  // ... operation
} catch (error) {
  sendSafeError(res, error, 'Failed to process request');
}
```

This ensures:
- Sanitized error messages to clients
- Full error details logged internally
- Reference IDs for support correlation

### Frontend (API Calls)

Use the centralized API service with `ApiError`:

```javascript
import { api, ApiError } from '@/services/api';

try {
  const data = await api.get('/endpoint');
} catch (error) {
  if (error instanceof ApiError) {
    // User-friendly message
    showToast(error.getUserMessage());
  }
}
```

---

## Testing Requirements

### Coverage Targets

| Metric | Minimum | Target |
|--------|---------|--------|
| Statements | 80% | 90% |
| Branches | 70% | 85% |
| Functions | 80% | 90% |

### Test Structure

```
tests/
├── unit/           # Unit tests for services/utils
├── integration/    # API endpoint tests
└── e2e/            # End-to-end tests (Playwright)
```

### Running Tests

```bash
bun run test              # Unit tests
bun run test:cov          # With coverage
bun run test:e2e          # E2E tests
```

---

## Observability (Optional)

### Enable Distributed Tracing

Set environment variable to enable OpenTelemetry:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Enable Error Tracking

Set Sentry DSN for error tracking:

```bash
SENTRY_DSN=https://...@sentry.io/...
```

### Enable File Logging

Set log file path for JSON logging:

```bash
LOG_FILE=/var/log/{{PROJECT_NAME}}/app.log
```

---

## Security Standards

### Input Validation (Required)

All endpoints must validate input with Zod:

```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

// Use validateBody middleware
router.post('/', validateBody(schema), handler);
```

### Secrets Management

- Never commit secrets to git
- Use `.env` files (excluded via `.gitignore`)
- Store secrets in environment variables only
- Use `.env.example` for documentation

### Security Headers

Helmet middleware enabled by default:
- HSTS, X-Frame-Options, X-Content-Type-Options
- CSP configured for application needs

---

## Code Quality Standards

### TypeScript

- Strict mode enabled
- No `any` without justification
- Interfaces for all data structures

### Linting & Formatting

- ESLint for code quality
- Prettier for formatting
- Pre-commit hooks enforce standards

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `user-service.ts` |
| Components | PascalCase | `UserCard.tsx` |
| Functions | camelCase | `getUserById` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES` |

---

## CI/CD Workflows

### Included Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR | Lint, typecheck, test |
| `security.yml` | Push/PR | Trivy, Gitleaks, Semgrep |
| `deploy.yml` | Push to main | Build and deploy |

### Quality Gates

PRs blocked if:
- Tests fail
- Coverage below threshold
- Lint errors
- TypeScript errors
- Security vulnerabilities (critical/high)

---

## Project-Specific Rules

<!-- Add any project-specific rules that override or extend global standards -->

---

**Parent Config:** See `~/CLAUDE.md` for global standards.
