# CLAUDE.md

**Project:** {{PROJECT_NAME}}
**Version:** 0.1.0
**Type:** infrastructure

---

## Project Overview

{{PROJECT_DESCRIPTION}}

## Tech Stack

| Layer | Technology |
|-------|------------|
| Containers | Docker, Docker Compose |
| Orchestration | Docker Compose |
| Proxy | Traefik or nginx |
| Edge/CDN | Cloudflare Tunnel |
| Auth | Authentik (if needed) |
| Monitoring | Prometheus, Grafana (optional) |

## Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f [service]

# Rebuild specific service
docker compose up -d --build [service]

# Scale service
docker compose up -d --scale [service]=3

# Health check
docker compose ps

# Clean up
docker compose down -v --remove-orphans
docker system prune -af
```

## Project Structure

```
{{PROJECT_NAME}}/
├── docker-compose.yml      # Main composition
├── docker-compose.dev.yml  # Development overrides
├── docker-compose.prod.yml # Production overrides
├── .env.example            # Environment template
├── services/
│   ├── app/
│   │   └── Dockerfile
│   ├── db/
│   │   └── init.sql
│   └── proxy/
│       └── nginx.conf
├── scripts/
│   ├── backup.sh           # Backup script
│   ├── restore.sh          # Restore script
│   └── health-check.sh     # Health check
├── config/                  # Service configs
└── data/                    # Persistent data (gitignored)
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DOMAIN` | Primary domain | Yes |
| `POSTGRES_PASSWORD` | Database password | Yes |
| `CF_TUNNEL_TOKEN` | Cloudflare tunnel token | Yes |

## Service Definitions

```yaml
# docker-compose.yml example structure
services:
  app:
    build: ./services/app
    environment:
      - DATABASE_URL=postgresql://...
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5
```

## Project-Specific Rules

### Security
- Never commit `.env` files (use `.env.example`)
- Use secrets management for sensitive values
- Restrict container capabilities
- Run containers as non-root when possible
- Use specific image tags, not `latest`

### Networking
- Use internal Docker networks for service communication
- Only expose necessary ports
- Use Cloudflare Tunnel for external access

### Data Persistence
- Define named volumes for persistent data
- Document backup procedures
- Test restore procedures regularly

### Health Checks
- Define health checks for all services
- Use `depends_on` with `condition: service_healthy`
- Implement graceful shutdown handling

---

**Parent Config:** See `~/CLAUDE.md` for global standards.
