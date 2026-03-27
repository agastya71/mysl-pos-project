#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ── Colors (disabled when not writing to a terminal) ──────────────────────────
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' NC=''
fi

log()   { echo -e "${GREEN}[dev]${NC} $1"; }
warn()  { echo -e "${YELLOW}[dev]${NC} $1"; }
error() { echo -e "${RED}[dev]${NC} $1" >&2; exit 1; }

# ── Prerequisites ─────────────────────────────────────────────────────────────
if ! docker info > /dev/null 2>&1; then
    error "Docker is not running. Start Docker Desktop and try again."
fi

if [ ! -f "node_modules/.bin/concurrently" ]; then
    error "node_modules not found. Run 'npm install' from the project root first."
fi

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
