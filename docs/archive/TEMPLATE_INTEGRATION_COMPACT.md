# Template Integration - Compact Reference

## Quick Summary

Integrate project template system into Console.web with:
- Migration script for existing projects
- API routes for template operations
- UI wizard for project creation
- Compliance checking dashboard

---

## New Files to Create

| File | Purpose |
|------|---------|
| `scripts/migrate-project.js` | CLI to add enforcement to existing projects |
| `server/routes/templates.js` | API: list, create, migrate, check compliance |
| `server/services/templateService.js` | Core template operations |
| `templates/registry.json` | Template metadata registry |
| `src/components/ProjectCreator.jsx` | Creation wizard modal |
| `src/components/TemplateCard.jsx` | Template selection card |
| `src/components/ComplianceChecker.jsx` | Project compliance UI |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/templates` | GET | List all templates |
| `/api/templates/:id` | GET | Get template details |
| `/api/templates/create` | POST | Create new project |
| `/api/templates/migrate` | POST | Migrate existing project |
| `/api/templates/check/:project` | GET | Check compliance |

## Template Registry Structure

```json
{
  "id": "web-app-fullstack",
  "name": "Full-Stack Web App",
  "stack": ["React", "Fastify", "Prisma"],
  "variables": [
    { "name": "PROJECT_NAME", "type": "text", "required": true },
    { "name": "PORT", "type": "number", "default": 5175 }
  ],
  "postCreateCommands": ["bun install"]
}
```

## Migration Script Usage

```bash
# Check what would be added
node scripts/migrate-project.js ~/Projects/my-app --dry-run

# Run migration
node scripts/migrate-project.js ~/Projects/my-app

# Force overwrite
node scripts/migrate-project.js ~/Projects/my-app --force
```

## UI Flow

1. User clicks "New Project" in PROJECTS tab
2. ProjectCreator wizard opens
3. Step 1: Select template type
4. Step 2: Fill variables (name, port, etc.)
5. Step 3: Options (git, deps, GitHub)
6. Step 4: Create → files copied, deps installed
7. Project appears in list with green compliance badge

## Compliance Scoring

| Item | Weight |
|------|--------|
| CI workflow present | 20% |
| Security workflow present | 20% |
| Pre-commit hooks | 15% |
| TypeScript strict | 15% |
| ESLint config | 10% |
| Prettier config | 10% |
| CLAUDE.md present | 10% |

**Score Display:**
- 90-100%: Green badge
- 70-89%: Yellow badge
- <70%: Red badge

## Implementation Priority

1. `templateService.js` - Core logic
2. `templates.js` routes - API endpoints
3. `migrate-project.js` - CLI tool
4. `ProjectCreator.jsx` - UI wizard
5. Dashboard integration - PROJECTS tab updates

---

*Compact version of TEMPLATE_INTEGRATION_PLAN.md*
