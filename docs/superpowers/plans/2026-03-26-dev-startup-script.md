# Dev Startup Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `scripts/dev.sh`, a single command that starts postgres, redis, the backend API, admin dashboard, and Electron POS client — handling first-time env/migration/seed setup automatically.

**Architecture:** A bash script that uses `docker-compose` for infra (postgres + redis), polls their health checks, runs idempotent migrations every start, seeds once via a `.dev-initialized` flag file, then hands off to `concurrently` for the three long-running app processes.

**Tech Stack:** bash, docker-compose, `node_modules/.bin/concurrently` (already installed via pos-client, hoisted to root), `openssl` (macOS built-in), `perl` (macOS built-in, used for portable in-place sed).

---

## File Map

| File | Change |
|------|--------|
| `scripts/dev.sh` | Create — full startup script |
| `.gitignore` | Modify — add `.dev-initialized` |

---

### Task 1: Script skeleton, color helpers, and .gitignore entry

**Files:**
- Create: `scripts/dev.sh`
- Modify: `.gitignore`

- [ ] **Step 1: Add `.dev-initialized` to `.gitignore`**

Open `.gitignore` in the project root. Add this line (create the file if it doesn't exist):

```
.dev-initialized
```

- [ ] **Step 2: Create `scripts/dev.sh` with skeleton and helpers**

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { echo -e "${GREEN}[dev]${NC} $1"; }
warn()  { echo -e "${YELLOW}[dev]${NC} $1"; }
error() { echo -e "${RED}[dev]${NC} $1" >&2; exit 1; }
```

- [ ] **Step 3: Make the script executable**

```bash
chmod +x scripts/dev.sh
```

- [ ] **Step 4: Verify syntax is valid**

```bash
bash -n scripts/dev.sh
```

Expected: no output (exit 0).

- [ ] **Step 5: Commit**

```bash
git add scripts/dev.sh .gitignore
git commit -m "feat(dev): add startup script skeleton and gitignore entry"
```

---

### Task 2: Prerequisites check and env setup

**Files:**
- Modify: `scripts/dev.sh`

- [ ] **Step 1: Append prerequisites check to `scripts/dev.sh`**

Add after the helpers block:

```bash
# ── Prerequisites ─────────────────────────────────────────────────────────────
if ! docker info > /dev/null 2>&1; then
    error "Docker is not running. Start Docker Desktop and try again."
fi

if [ ! -f "node_modules/.bin/concurrently" ]; then
    error "node_modules not found. Run 'npm install' from the project root first."
fi
```

- [ ] **Step 2: Verify prerequisites check works — Docker case**

Stop Docker Desktop, then run:

```bash
./scripts/dev.sh
```

Expected output:
```
[dev] Docker is not running. Start Docker Desktop and try again.
```
Script exits non-zero. Start Docker again before continuing.

- [ ] **Step 3: Append env setup to `scripts/dev.sh`**

Add after the prerequisites block:

```bash
# ── Env setup ─────────────────────────────────────────────────────────────────
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env

    JWT_ACCESS=$(openssl rand -hex 32)
    JWT_REFRESH=$(openssl rand -hex 32)

    # perl -i is portable across macOS and Linux (unlike sed -i)
    perl -i -pe "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=${JWT_ACCESS}|" backend/.env
    perl -i -pe "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH}|" backend/.env

    log "Created backend/.env with generated dev secrets."
    warn "Review backend/.env before running in production."
fi
```

- [ ] **Step 4: Verify env setup**

```bash
# Remove any existing .env so the script creates a fresh one
rm -f backend/.env
./scripts/dev.sh
```

Expected:
```
[dev] Created backend/.env with generated dev secrets.
[dev] Review backend/.env before running in production.
```

Then confirm the secrets were written:

```bash
grep "JWT_ACCESS_SECRET" backend/.env
grep "JWT_REFRESH_SECRET" backend/.env
```

Expected: two lines with 64-character hex values (not the placeholder text `your_access_secret_here`).

- [ ] **Step 5: Commit**

```bash
git add scripts/dev.sh
git commit -m "feat(dev): add prerequisites check and env setup to startup script"
```

---

### Task 3: Infra startup and health polling

**Files:**
- Modify: `scripts/dev.sh`

- [ ] **Step 1: Append infra startup and health polling to `scripts/dev.sh`**

Add after the env setup block:

```bash
# ── Infra ─────────────────────────────────────────────────────────────────────
log "Starting infrastructure (postgres + redis)..."
docker-compose up -d postgres redis

wait_healthy() {
    local name=$1
    local container=$2
    local timeout=60
    local elapsed=0

    log "Waiting for ${name} to be healthy..."
    until [ "$(docker inspect --format='{{.State.Health.Status}}' "${container}" 2>/dev/null)" = "healthy" ]; do
        if [ "${elapsed}" -ge "${timeout}" ]; then
            error "${name} did not become healthy within ${timeout}s. Check: docker logs ${container}"
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
    log "${name} is healthy."
}

wait_healthy "PostgreSQL" "pos-postgres"
wait_healthy "Redis"      "pos-redis"
```

- [ ] **Step 2: Verify infra starts and health polling works**

```bash
# Ensure containers are stopped first
docker-compose stop postgres redis 2>/dev/null || true
docker-compose rm -f postgres redis 2>/dev/null || true

./scripts/dev.sh
```

Expected (abridged):
```
[dev] Starting infrastructure (postgres + redis)...
[dev] Waiting for PostgreSQL to be healthy...
[dev] PostgreSQL is healthy.
[dev] Waiting for Redis to be healthy...
[dev] Redis is healthy.
```

Script will then fail at migrations (not yet implemented) — that's expected.

- [ ] **Step 3: Commit**

```bash
git add scripts/dev.sh
git commit -m "feat(dev): add infra startup and health polling to startup script"
```

---

### Task 4: Migrations and seed

**Files:**
- Modify: `scripts/dev.sh`

- [ ] **Step 1: Append migrations and seed to `scripts/dev.sh`**

Add after the infra block:

```bash
# ── Migrations ────────────────────────────────────────────────────────────────
log "Running migrations..."
npm run migrate --workspace=backend

# ── Seed (first run only) ─────────────────────────────────────────────────────
if [ ! -f ".dev-initialized" ]; then
    # Ensure .dev-initialized is gitignored (idempotent append)
    if ! grep -qxF ".dev-initialized" .gitignore 2>/dev/null; then
        echo ".dev-initialized" >> .gitignore
    fi

    log "Seeding database (first run)..."
    npm run seed --workspace=backend
    touch .dev-initialized
    log "Database seeded. Delete .dev-initialized to re-seed on next start."
else
    log "Database already seeded — skipping. (Delete .dev-initialized to re-seed.)"
fi
```

- [ ] **Step 2: Verify first-run seeding**

```bash
rm -f .dev-initialized
./scripts/dev.sh
```

Expected (after health logs):
```
[dev] Running migrations...
[dev] Seeding database (first run)...
[dev] Database seeded. Delete .dev-initialized to re-seed on next start.
```

Confirm flag was created:

```bash
ls -la .dev-initialized
```

- [ ] **Step 3: Verify second-run skips seed**

Run the script again without deleting `.dev-initialized`:

```bash
./scripts/dev.sh
```

Expected:
```
[dev] Database already seeded — skipping. (Delete .dev-initialized to re-seed.)
```

- [ ] **Step 4: Commit**

```bash
git add scripts/dev.sh
git commit -m "feat(dev): add migrations and first-run seed to startup script"
```

---

### Task 5: Process launch

**Files:**
- Modify: `scripts/dev.sh`

- [ ] **Step 1: Append URL summary and concurrently launch to `scripts/dev.sh`**

Add after the seed block:

```bash
# ── Launch ────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Backend API   → http://localhost:3000"
echo "  Admin         → http://localhost:3002"
echo "  POS Client    → Electron window"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exec node_modules/.bin/concurrently \
    --kill-others-on-fail \
    --names "backend,admin,pos-client" \
    --prefix-colors "cyan,magenta,yellow" \
    "npm run dev --workspace=backend" \
    "npm run dev --workspace=admin-dashboard" \
    "npm run dev --workspace=pos-client"
```

- [ ] **Step 2: Do a full end-to-end run**

```bash
./scripts/dev.sh
```

Expected sequence:
1. Prerequisites pass silently
2. Infra starts and becomes healthy
3. Migrations run
4. Seed skipped (already done) or runs on first time
5. URL summary printed
6. Three labeled processes start — `[backend]` in cyan, `[admin]` in magenta, `[pos-client]` in yellow
7. Electron window opens

Verify each surface:
- `curl -s http://localhost:3000/api/v1/health` — backend responds
- Open `http://localhost:3002` in browser — admin dashboard loads
- Electron window visible on screen

- [ ] **Step 3: Verify Ctrl+C kills all processes**

Press Ctrl+C. Expected: all three labeled processes exit within a second. No orphaned `ts-node-dev`, `vite`, or `electron` processes remain:

```bash
pgrep -fl "ts-node-dev|vite|electron" | grep -v grep
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add scripts/dev.sh
git commit -m "feat(dev): add process launch to startup script — completes dev.sh"
```

---

## Usage

```bash
# From project root
./scripts/dev.sh

# Re-seed the database on next start
rm .dev-initialized && ./scripts/dev.sh

# Stop infra when done for the day
docker-compose stop postgres redis
```
