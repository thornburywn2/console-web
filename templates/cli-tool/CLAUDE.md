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
| Runtime | Bun or Node.js |
| Language | TypeScript (strict) |
| CLI Framework | Commander.js or yargs |
| Validation | Zod |
| Testing | Vitest |

## Development Commands

```bash
bun install          # Install dependencies
bun run dev          # Run in development mode
bun run build        # Build for production
bun run test         # Run tests
bun run test:cov     # Run tests with coverage
bun run lint         # Lint code
bun run typecheck    # Type check
bun link             # Link for local testing
```

## Project Structure

```
{{PROJECT_NAME}}/
├── src/
│   ├── index.ts           # Entry point
│   ├── cli.ts             # CLI setup (Commander/yargs)
│   ├── commands/          # Command handlers
│   │   ├── init.ts
│   │   └── run.ts
│   ├── lib/               # Core logic
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript types
├── tests/
│   └── commands/          # Command tests
├── bin/
│   └── {{PROJECT_NAME}}   # Executable entry
└── ...
```

## CLI Structure

```typescript
// src/cli.ts
import { Command } from 'commander';
import { z } from 'zod';

const program = new Command();

program
  .name('{{PROJECT_NAME}}')
  .description('{{PROJECT_DESCRIPTION}}')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new project')
  .option('-n, --name <name>', 'Project name')
  .action(async (options) => {
    // Validate options
    const schema = z.object({
      name: z.string().min(1).max(100),
    });
    const validated = schema.parse(options);
    // Execute command
  });

program.parse();
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `{{PROJECT_NAME_UPPER}}_CONFIG` | Config file path | No |
| `{{PROJECT_NAME_UPPER}}_DEBUG` | Enable debug mode | No |

## Project-Specific Rules

### Input Validation
- Validate all CLI arguments with Zod
- Provide helpful error messages
- Support `--help` for all commands

### Output
- Use consistent output formatting
- Support `--json` flag for machine-readable output
- Use colors sparingly (respect NO_COLOR env var)

### Error Handling
- Exit with appropriate exit codes (0 = success, 1 = error)
- Show user-friendly error messages
- Log debug info when `--verbose` is set

### Configuration
- Support config file (JSON/YAML)
- Allow env var overrides
- Document all options

---

**Parent Config:** See `~/CLAUDE.md` for global standards.
