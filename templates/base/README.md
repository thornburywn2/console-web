# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

## Quick Start

```bash
# Clone the repository
git clone https://github.com/{{GITHUB_USER}}/{{PROJECT_NAME}}.git
cd {{PROJECT_NAME}}

# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
bun run dev
```

## Development

```bash
bun run dev          # Start development server
bun run build        # Production build
bun run test         # Run tests
bun run test:cov     # Run tests with coverage
bun run lint         # Lint code
bun run lint:fix     # Fix linting issues
bun run typecheck    # Type check
```

## Deployment

### Docker

```bash
# Build image
docker build -t {{PROJECT_NAME}} .

# Run container
docker run -p {{PORT}}:{{PORT}} --env-file .env {{PROJECT_NAME}}
```

### Docker Compose

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## Project Structure

```
{{PROJECT_NAME}}/
├── src/               # Source code
├── tests/             # Test files
├── .github/           # GitHub Actions workflows
├── CLAUDE.md          # AI agent instructions
├── README.md          # This file
└── ...
```

## Contributing

1. Create a feature branch (`git checkout -b feat/amazing-feature`)
2. Commit your changes (`git commit -m 'feat: add amazing feature'`)
3. Push to the branch (`git push origin feat/amazing-feature`)
4. Open a Pull Request

## License

MIT
