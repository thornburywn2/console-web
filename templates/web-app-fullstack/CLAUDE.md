# CLAUDE.md

**Project:** {{PROJECT_NAME}}
**Version:** 0.1.0
**Port:** {{PORT}} (frontend), {{API_PORT}} (backend)
**Type:** {{PROJECT_TYPE}}

---

## Project Overview

{{PROJECT_DESCRIPTION}}

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Language | TypeScript (strict) |
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui |
| Backend | Fastify |
| Database | PostgreSQL + Prisma |
| API | REST (+ tRPC optional) |
| Testing | Vitest, Supertest, Playwright |
| Deployment | Docker + Cloudflare Tunnel |

## Development Commands

```bash
bun install          # Install dependencies
bun run dev          # Start frontend dev server
bun run dev:server   # Start backend dev server
bun run dev:all      # Start both frontend and backend
bun run build        # Production build
bun run test         # Run unit tests
bun run test:cov     # Run tests with coverage
bun run test:e2e     # Run E2E tests (Playwright)
bun run lint         # Lint code
bun run typecheck    # Type check
bun run db:push      # Push schema to database
bun run db:migrate   # Run migrations
bun run db:studio    # Open Prisma Studio
bun run db:seed      # Seed database
```

## Project Structure

```
{{PROJECT_NAME}}/
├── src/                    # Frontend source
│   ├── components/         # React components
│   │   └── ui/            # shadcn/ui components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API client services
│   ├── types/             # TypeScript types
│   ├── utils/             # Utility functions
│   ├── lib/               # Third-party integrations
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── server/                 # Backend source
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── middleware/        # Fastify middleware
│   ├── utils/             # Server utilities
│   ├── types/             # Server types
│   └── index.ts           # Server entry point
├── prisma/                 # Database
│   ├── schema.prisma      # Database schema
│   ├── migrations/        # Migration files
│   └── seed.ts            # Seed data
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # API integration tests
│   └── e2e/               # Playwright E2E tests
├── .github/workflows/      # CI/CD
├── CLAUDE.md              # This file
└── ...
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PORT` | Frontend port | No (default: {{PORT}}) |
| `API_PORT` | Backend port | No (default: {{API_PORT}}) |
| `JWT_SECRET` | JWT signing secret | Yes |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | Yes |

## API Endpoints

### Health
- `GET /health` - Health check

### Authentication (if implemented)
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout user

### Resources
- `GET /api/{{RESOURCE}}` - List all
- `GET /api/{{RESOURCE}}/:id` - Get by ID
- `POST /api/{{RESOURCE}}` - Create
- `PUT /api/{{RESOURCE}}/:id` - Update
- `DELETE /api/{{RESOURCE}}/:id` - Delete

## Database Models

```prisma
// Example model - customize for your project
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}
```

## Project-Specific Rules

### Frontend
- Use shadcn/ui components from `src/components/ui/`
- Custom components go in `src/components/`
- API calls go through services in `src/services/`
- Use React Query for server state management

### Backend
- All routes must validate input with Zod schemas
- Use Prisma for all database operations
- Return consistent error format: `{ error: string, code: string }`
- Log errors with context using Fastify logger

### Testing
- Unit tests for services and utilities
- Integration tests for API endpoints (Supertest)
- E2E tests for critical user flows (Playwright)

---

**Parent Config:** See `~/CLAUDE.md` for global standards.
