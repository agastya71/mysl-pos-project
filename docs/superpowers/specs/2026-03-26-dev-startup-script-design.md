# Dev Startup Script Design

**Date:** 2026-03-26
**Status:** Approved

## Goal

A single command (`scripts/dev.sh`) that starts all processes needed to preview the full app — infra, backend, admin dashboard, and the Electron POS client — with first-time setup handled automatically.

## Scope

- `scripts/dev.sh` — new shell script
- `.gitignore` — add `.dev-initialized`
- No changes to `package.json`, `docker-compose.yml`, or any source files

## Flow

```
1. Check prerequisites
2. Environment setup (first-time)
3. Start infra (Docker)
4. Wait for infra health
5. Run migrations (always)
6. Seed data (first-time only)
7. Print URL summary
8. Launch all processes via concurrently
```

## Section 1: Prerequisites

The script exits early with a clear message if:
- Docker is not running (`docker info` fails)
- `node_modules/.bin/concurrently` does not exist (run `npm install` first)

## Section 2: Environment Setup

- If `backend/.env` does not exist:
  - Copy `backend/.env.example` → `backend/.env`
  - Auto-generate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` using `openssl rand -hex 32`, replacing the placeholder values in `backend/.env` in-place
  - Print a notice: `Created backend/.env with generated dev secrets`
- No `.env` needed for `pos-client` or `admin-dashboard`

## Section 3: Infra Startup

```bash
docker-compose up -d postgres redis
```

Poll until both containers report healthy using `docker inspect --format='{{.State.Health.Status}}'`. Timeout after 60 seconds with an error message if either fails to become healthy.

## Section 4: Migrations

```bash
npm run migrate --workspace=backend
```

Always run — migrations are idempotent. Runs after infra is confirmed healthy. If migrations fail, the script exits with an error before reaching the seed or process-launch steps.

## Section 5: Seed (First-time Only)

- If `.dev-initialized` does not exist:
  - Run `npm run seed --workspace=backend`
  - On success, create `.dev-initialized`
  - Print: `Database seeded. Delete .dev-initialized to re-seed.`
- If `.dev-initialized` exists: skip silently

`.dev-initialized` is added to `.gitignore` by the script on first run.

## Section 6: Process Management

All three app processes are launched via `concurrently` with `--kill-others-on-fail`:

| Label | Command | Port |
|-------|---------|------|
| `[backend]` | `npm run dev --workspace=backend` | 3000 |
| `[admin]` | `npm run dev --workspace=admin-dashboard` | 3002 |
| `[pos-client]` | `npm run dev --workspace=pos-client` | 3001 + Electron |

Each label gets a distinct color. Ctrl+C sends SIGINT to `concurrently`, which propagates to all child processes cleanly.

Before handing off to `concurrently`, print:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Backend API   → http://localhost:3000
  Admin         → http://localhost:3002
  POS Client    → Electron window
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Docker Containers on Exit

Containers are left running after Ctrl+C. This means subsequent `./scripts/dev.sh` runs skip the infra startup wait, making restarts fast. User can stop containers manually with `docker-compose stop postgres redis` or `npm run clean`.

## Files Changed

| File | Change |
|------|--------|
| `scripts/dev.sh` | New file |
| `.gitignore` | Add `.dev-initialized` |
