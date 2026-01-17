# Claude Code Manager - Docker Image
# Includes: Node.js, tmux, git, and claude-code CLI
# Security: Multi-stage build with explicit security updates

# =============================================================================
# Stage 1: Builder - compile native dependencies
# =============================================================================
FROM node:20-bookworm-slim AS builder

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=development

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including dev for building)
RUN npm ci && npm cache clean --force

# Copy source and build
COPY . .
RUN npm run build

# =============================================================================
# Stage 2: Production - minimal runtime image
# =============================================================================
FROM node:20-bookworm-slim

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    TERM=xterm-256color \
    COLORTERM=truecolor \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    NODE_ENV=production \
    PROJECTS_DIR=/projects

# Install system dependencies with security updates
# CVE-2023-45853: zlib Integer Overflow - fixed by upgrade
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    tmux \
    git \
    curl \
    ca-certificates \
    locales \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Generate locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen

# Install claude-code globally
RUN npm install -g @anthropic-ai/claude-code

# Create app directory
WORKDIR /app

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy server files (not already built)
COPY server ./server
COPY prisma ./prisma

# Create projects directory
RUN mkdir -p /projects

# Create non-root user for running the app
RUN useradd -m -s /bin/bash appuser && \
    chown -R appuser:appuser /app /projects

# Switch to non-root user
USER appuser

# Expose the port
EXPOSE 5275

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5275/api/health || exit 1

# Start the server
CMD ["node", "server/index.js"]
