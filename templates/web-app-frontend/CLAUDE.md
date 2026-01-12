# CLAUDE.md

**Project:** {{PROJECT_NAME}}
**Version:** 0.1.0
**Port:** {{PORT}}
**Type:** web-app-frontend

---

## Project Overview

{{PROJECT_DESCRIPTION}}

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Language | TypeScript (strict) |
| Framework | React 18, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | Zustand or React Query |
| Testing | Vitest, Playwright |
| Deployment | Docker + Cloudflare Tunnel |

## Development Commands

```bash
bun install          # Install dependencies
bun run dev          # Start development server
bun run build        # Production build
bun run preview      # Preview production build
bun run test         # Run unit tests
bun run test:cov     # Run tests with coverage
bun run test:e2e     # Run E2E tests (Playwright)
bun run lint         # Lint code
bun run typecheck    # Type check
```

## Project Structure

```
{{PROJECT_NAME}}/
├── src/
│   ├── components/         # React components
│   │   └── ui/            # shadcn/ui components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # External API clients
│   ├── stores/            # Zustand stores (if used)
│   ├── types/             # TypeScript types
│   ├── utils/             # Utility functions
│   ├── lib/               # Third-party integrations
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── public/                 # Static assets
├── tests/
│   ├── unit/              # Unit tests
│   └── e2e/               # Playwright E2E tests
├── .github/workflows/      # CI/CD
└── ...
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_APP_NAME` | Application name | No |

## External API Integration

```typescript
// src/services/api.ts
import { z } from 'zod';

const API_URL = import.meta.env.VITE_API_URL;

// Always validate API responses
const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
});

export async function getUser(id: string) {
  const response = await fetch(`${API_URL}/users/${id}`);
  const data = await response.json();
  return UserSchema.parse(data);
}
```

## Project-Specific Rules

### Components
- Use shadcn/ui components from `src/components/ui/`
- Custom components go in `src/components/`
- Keep components small and focused (< 200 lines)

### State Management
- Use React Query for server state
- Use Zustand for client state (if needed)
- Avoid prop drilling - use context or state management

### API Calls
- All API calls go through services in `src/services/`
- Validate all API responses with Zod schemas
- Handle loading and error states

---

**Parent Config:** See `~/CLAUDE.md` for global standards.
