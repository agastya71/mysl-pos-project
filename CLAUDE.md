# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack Point of Sale (POS) system for non-profit organizations (thrift stores, donation centers). It manages sales transactions, inventory, vendor/donor relationships, purchase orders, accounts payable, and physical inventory reconciliation — all with **local-first architecture** (no cloud, except Square for payment processing).

## Worktree Workflow (mandatory)

**Never edit tracked files directly on `main`.** Every task requires a git worktree on a feature branch. Full workflow in `.claude/rules.md`, but the key steps are:

```bash
git worktree add ../pos-<branch-name> -b <branch-name>
cd ../pos-<branch-name>
git config --local user.name "agastya71"
git config --local user.email "agastya71@gmail.com"
# ... do all work here, then PR and merge ...
git worktree remove ../pos-<branch-name>   # after branch is merged
```

Branch naming: `feature/`, `fix/`, `refactor/`, `docs/`, `test/` prefixes.

## Commands

### Root (npm workspaces)
```bash
npm run dev           # Start all services via Docker Compose
npm run dev:backend   # Backend only
npm run dev:pos       # POS client only
npm run dev:admin     # Admin dashboard only
npm run build         # Build all workspaces
npm run lint          # Lint all workspaces
npm run format        # Run Prettier
npm run clean         # Remove builds and Docker volumes
```

### Backend (`cd backend`)
```bash
npm run dev           # Hot reload via ts-node-dev
npm run build         # Compile TypeScript → dist/
npm run migrate       # Run database migrations
npm run seed          # Seed initial data
npm run test          # Jest (all)
npm run test:watch    # Watch mode
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests only (requires Docker services running)
npm run test:coverage # Coverage report

# Run a single test file
npm test -- --testPathPattern="products.test"
# Run tests matching a name
npm test -- --testNamePattern="should create product"
```

Test files live under `backend/src/__tests__/`. Integration tests require PostgreSQL and Redis to be running (`docker-compose up` first).

### POS Client — Electron (`cd pos-client`)
```bash
npm run dev           # Webpack + Electron concurrently
npm run build         # Production build
npm run build:mac     # macOS installer
npm run build:win     # Windows installer
npm run build:linux   # Linux installer
npm run test          # Jest tests
```

### Admin Dashboard (`cd admin-dashboard`)
```bash
npm run dev           # Vite dev server on port 3002
npm run build         # TypeScript check + Vite build
npm run preview       # Preview production build
```

### Docker (development)
```bash
docker-compose up     # PostgreSQL, Redis, backend, admin dashboard
# Backend API:    http://localhost:3000
# Admin:          http://localhost:3002
# PostgreSQL:     localhost:5432
# Redis:          localhost:6379
```

## Architecture

Three-tier, local-server deployment. POS terminals (Electron) and the admin web dashboard connect to a Node.js/Express backend over the local network. Internet is only needed for Square payment processing.

```
pos-system/
├── backend/           # Express API (port 3000), Node 18+, TypeScript strict
├── pos-client/        # Electron 28 + React 18 desktop app (port 3001)
├── admin-dashboard/   # React 18 + Vite web app (port 3002)
├── schema/            # SQL: tables/, functions/, triggers/, views/
├── scripts/           # Migration, backup, deployment, utility scripts
├── docs/              # Architecture docs; docs/architecture/ for detailed specs
└── .claude/           # rules.md, context.md, prompts.md — read before major tasks
```

### Backend internals (`backend/src/`)
- `server.ts` / `app.ts` — Entry point and Express configuration
- `controllers/` — HTTP handlers (thin layer)
- `services/` — Business logic (20+ services)
- `routes/` — API routes (prefix `/api/v1/`)
- `middleware/` — Auth (JWT), validation, error handling, logging, rate limiting
- `validators/` — Zod schemas for all request bodies
- `models/` — TypeScript interfaces mapping to DB tables
- `config/` — `database.ts` (pg pool), `redis.ts`, `env.ts` (validation)
- `utils/` — Logger (Winston), encryption (AES-256-GCM), JWT helpers
- `database/` — Migrations and seeds

### Frontend shared pattern (both `pos-client/src/` and `admin-dashboard/src/`)
- `components/` — Reusable React components
- `pages/` — Route-level page components
- `services/` — API client (Axios), hardware (POS only), offline/sync (POS only)
- `store/` — Redux Toolkit slices
- `hooks/` — Custom React hooks
- `types/` — Shared TypeScript types

### Database (PostgreSQL 15+)
30 tables in 7 domains. All PKs are UUIDs. All tables have `created_at`/`updated_at`; important records have `deleted_at` (soft delete).

| Domain | Tables |
|--------|--------|
| Core catalog | `categories`, `products`, `vendors`, `price_history` |
| Users & terminals | `users`, `terminals`, `customers`, `sessions` |
| Sales | `transactions`, `transaction_items`, `payments`, `payment_details`, `refunds` |
| Procurement | `purchase_orders`, `purchase_order_items`, `inventory_receiving`, `receiving_items`, `donations`, `import_batches`, `import_items` |
| Accounts payable | `accounts_payable`, `vendor_payments`, `payment_allocations` |
| Inventory mgmt | `inventory_adjustments`, `inventory_count_sessions`, `inventory_counts`, `inventory_reconciliations`, `inventory_snapshots` |
| Audit | `audit_log` (7-year retention), `system_settings` |

## Key Patterns and Conventions

### Code style
- TypeScript strict mode everywhere; never use `any` without explicit justification
- 2-space indent, single quotes, semicolons, 100-char line width (Prettier enforces)
- Files: React components → `PascalCase.tsx`; services → `name.service.ts`; types → `name.types.ts`; tests → `name.test.ts`
- Imports ordered: external libs → types → components → services/hooks → utils → styles

### API response shape (always consistent)
```typescript
// Success
{ "success": true, "data": {...}, "meta": { "page": 1, "limit": 20, "total": 100 } }
// Error
{ "success": false, "error": { "message": "...", "code": "SCREAMING_SNAKE", "details": {} } }
```

### Database transactions
Wrap every multi-table write in `BEGIN`/`COMMIT`/`ROLLBACK` using a pooled client (see pattern in `.claude/rules.md`).

### Test-Driven Development (mandatory)
Follow Red-Green-Refactor on every change — write a failing test first, then implement the minimum code to pass it, then refactor. No implementation code should exist without a prior failing test. The PR checklist in `.claude/rules.md` enforces this.

### Security requirements
- Validate **all** API inputs with Zod at the controller boundary
- Parameterized queries only — never string-concatenated SQL
- Card data is **never stored**; all card processing delegated to Square (PCI DSS)
- Sensitive fields (`tax_id`, `account_number`) encrypted at rest with AES-256-GCM
- Passwords hashed with bcrypt, minimum 10 rounds
- Rate limiting on every API endpoint
- Never log passwords, tokens, or card data

### RBAC
Three roles: `cashier` (transactions only), `manager` (operations + approvals), `admin` (full access including user management). Check roles in middleware before reaching controllers.

## Environment Variables

Copy `backend/.env.example` → `backend/.env` and `pos-client/.env.example` / `admin-dashboard/.env.example` for frontend vars. Full variable reference is in `.claude/context.md`.

## Reference Documentation

Detailed specs live in `docs/architecture/`:
- `API_ENDPOINTS.md` — Full REST API spec
- `DATA_MODEL_TABLES.md` — All 30 table definitions
- `SECURITY_DEPLOYMENT.md` — Security hardening and deployment
- `BULK_IMPORT.md` — CSV/Excel/JSON/XML import system
- `UI_UX_DESIGN.md` — UI specifications

`.claude/rules.md` has authoritative coding standards with examples.
`.claude/context.md` has business process flows (sales, receiving, donations, inventory counts, AP).

## Commit Message Scopes

Common scopes for conventional commits in this repo: `products`, `categories`, `vendors`, `transactions`, `payments`, `inventory`, `auth`, `ap` (accounts payable), `po` (purchase orders), `receiving`, `donations`, `import`, `users`, `terminals`, `reports`.
