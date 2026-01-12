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

## Project-Specific Rules

<!-- Add any project-specific rules that override or extend global standards -->

---

**Parent Config:** See `~/CLAUDE.md` for global standards.
