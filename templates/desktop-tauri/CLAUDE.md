# CLAUDE.md

**Project:** {{PROJECT_NAME}}
**Version:** 0.1.0
**Port:** 1420 (Tauri dev)
**Type:** desktop

---

## Project Overview

{{PROJECT_DESCRIPTION}}

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Tauri 2 |
| Frontend | React 18, Vite, TypeScript |
| Backend | Rust |
| Styling | Tailwind CSS, shadcn/ui |
| Database | SQLite (bundled) |
| Testing | Vitest (frontend), Cargo test (Rust) |

## Development Commands

```bash
# Frontend
bun install          # Install JS dependencies
bun run dev          # Start Vite dev server only

# Desktop App
bun run tauri dev    # Start full Tauri dev environment
bun run tauri build  # Build production desktop app

# Rust Backend
cd src-tauri && cargo build    # Build Rust backend
cd src-tauri && cargo test     # Run Rust tests
cd src-tauri && cargo clippy   # Lint Rust code

# Testing
bun run test         # Run frontend tests
bun run test:cov     # Run tests with coverage
```

## Project Structure

```
{{PROJECT_NAME}}/
├── src/                    # Frontend source (React)
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── App.tsx
├── src-tauri/              # Tauri/Rust backend
│   ├── src/
│   │   ├── main.rs        # Entry point
│   │   ├── lib.rs         # Library root
│   │   └── commands/      # Tauri commands
│   ├── Cargo.toml         # Rust dependencies
│   ├── tauri.conf.json    # Tauri configuration
│   └── capabilities/      # Tauri permissions
├── tests/                  # Frontend tests
└── ...
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TAURI_SIGNING_PRIVATE_KEY` | App signing key | For release |
| `TAURI_SIGNING_PUBLIC_KEY` | App signing public key | For release |

## Tauri Commands

```rust
// src-tauri/src/commands/example.rs
use tauri::command;

#[command]
pub async fn greet(name: String) -> Result<String, String> {
    // Validate input
    if name.is_empty() {
        return Err("Name cannot be empty".to_string());
    }
    Ok(format!("Hello, {}!", name))
}
```

```typescript
// Frontend usage
import { invoke } from '@tauri-apps/api/core';

const greeting = await invoke<string>('greet', { name: 'World' });
```

## Project-Specific Rules

### Rust Backend
- Use `Result<T, E>` for all fallible operations
- Never use `.unwrap()` in production code - use `?` or proper error handling
- Validate all inputs from frontend
- Use `#[command]` macro for Tauri commands

### Frontend
- Use `@tauri-apps/api` for all Tauri interactions
- Handle errors from invoke calls gracefully
- Use TypeScript strict mode

### Security
- Define minimal permissions in `capabilities/`
- Scope file system access to specific directories
- Validate all IPC messages

---

**Parent Config:** See `~/CLAUDE.md` for global standards.
