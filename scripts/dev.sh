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
