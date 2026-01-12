# Claude Code Manager - Docker Image
# Includes: Node.js, tmux, git, and claude-code CLI

FROM node:20-bookworm-slim

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    TERM=xterm-256color \
    COLORTERM=truecolor \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    NODE_ENV=production \
    PROJECTS_DIR=/projects

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tmux \
    git \
    curl \
    ca-certificates \
    locales \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Generate locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen

# Install claude-code globally
RUN npm install -g @anthropic-ai/claude-code

# Create app directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with node-pty rebuild
RUN npm ci --include=dev && \
    npm cache clean --force

# Copy the rest of the application
COPY . .

# Build the frontend
RUN npm run build

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
