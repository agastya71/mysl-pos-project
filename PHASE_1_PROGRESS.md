# Phase 1: Critical Security Fixes - Progress Tracker

**Branch:** feature/phase-1-security-fixes
**Worktree:** /Users/u0102180/Code/personal-project/pos-system-worktrees/feature-phase-1-security-fixes
**Total Estimated Time:** 15-19 hours (2-3 days)

---

## Implementation Checklist

### 1️⃣ ISSUE-003: Hardcoded JWT Secrets (1 hour) - [#26](https://github.com/agastya71/mysl-pos-project/issues/26)

**Status:** ⬜ Not Started

- [ ] Create `backend/src/config/env.ts` with requireEnv/optionalEnv functions
- [ ] Update `backend/src/middleware/auth.middleware.ts` (line 6) - remove fallback
- [ ] Update `backend/src/services/auth.service.ts` (lines 36-37) - remove fallbacks
- [ ] Update `backend/.env` with proper JWT secrets
- [ ] Update `backend/.env.example` with comments
- [ ] Update `backend/src/__tests__/setup.ts` (JWT_ACCESS_SECRET)
- [ ] Run tests: `cd backend && npm test`
- [ ] Manual test: Remove JWT_ACCESS_SECRET and verify startup fails

**Files Modified:**
- [ ] backend/src/config/env.ts (NEW)
- [ ] backend/src/middleware/auth.middleware.ts
- [ ] backend/src/services/auth.service.ts
- [ ] backend/.env
- [ ] backend/.env.example
- [ ] backend/src/__tests__/setup.ts

---

### 2️⃣ ISSUE-009: Hardcoded Admin Password (1 hour) - [#32](https://github.com/agastya71/mysl-pos-project/issues/32)

**Status:** ⬜ Not Started

- [ ] Update `backend/src/database/seed.ts` (line 33) - read from env
- [ ] Add password length validation (min 8 characters)
- [ ] Update `backend/.env` with ADMIN_INITIAL_PASSWORD
- [ ] Update `backend/.env.example`
- [ ] Manual test: Run seed with/without password
- [ ] Verify warning when password missing

**Files Modified:**
- [ ] backend/src/database/seed.ts
- [ ] backend/.env
- [ ] backend/.env.example

---

### 3️⃣ ISSUE-006: CORS All Origins (1 hour) - [#29](https://github.com/agastya71/mysl-pos-project/issues/29)

**Status:** ⬜ Not Started

- [ ] Update `backend/src/app.ts` (line 13) - configure CORS properly
- [ ] Add origin validation callback
- [ ] Set `credentials: true`
- [ ] Update `backend/.env` with ALLOWED_ORIGINS
- [ ] Update `backend/.env.example`
- [ ] Manual test: Verify localhost:3001 works
- [ ] Manual test: Verify other origins blocked

**Files Modified:**
- [ ] backend/src/app.ts
- [ ] backend/.env
- [ ] backend/.env.example

---

### 4️⃣ ISSUE-007: No Rate Limiting (2 hours) - [#30](https://github.com/agastya71/mysl-pos-project/issues/30)

**Status:** ⬜ Not Started

- [ ] Install: `npm install express-rate-limit`
- [ ] Create `backend/src/middleware/rateLimit.middleware.ts`
- [ ] Implement apiLimiter (100 req/15min)
- [ ] Implement loginLimiter (5 req/15min)
- [ ] Implement refreshLimiter (30 req/15min)
- [ ] Update `backend/src/app.ts` - add limiters
- [ ] Update `backend/.env.example` with rate limit configs
- [ ] Run tests: `cd backend && npm test`
- [ ] Manual test: Hit login 6 times, verify 429 on 6th

**Files Modified:**
- [ ] backend/package.json (add dependency)
- [ ] backend/src/middleware/rateLimit.middleware.ts (NEW)
- [ ] backend/src/app.ts
- [ ] backend/.env.example

---

### 5️⃣ ISSUE-001: RBAC Not Enforced (4-6 hours) - [#24](https://github.com/agastya71/mysl-pos-project/issues/24)

**Status:** ⬜ Not Started

**Backend:**
- [ ] Add `requirePermission` middleware to `auth.middleware.ts`
- [ ] Update product.routes.ts - add permissions
- [ ] Update transaction.routes.ts - add permissions
- [ ] Update customer.routes.ts - add auth + permissions
- [ ] Update category.routes.ts - add permissions
- [ ] Update inventory.routes.ts - add permissions
- [ ] Update vendor.routes.ts - add permissions
- [ ] Update purchaseOrder.routes.ts - add permissions
- [ ] Update employee.routes.ts - add permissions
- [ ] Update role.routes.ts - add permissions
- [ ] Run tests: `cd backend && npm test`
- [ ] Create unit tests for requirePermission middleware

**Testing:**
- [ ] Login as admin - verify all operations work
- [ ] Login as cashier - verify limited access
- [ ] Verify 403 errors for unauthorized operations

**Files Modified:**
- [ ] backend/src/middleware/auth.middleware.ts
- [ ] backend/src/routes/product.routes.ts
- [ ] backend/src/routes/transaction.routes.ts
- [ ] backend/src/routes/customer.routes.ts
- [ ] backend/src/routes/category.routes.ts
- [ ] backend/src/routes/inventory.routes.ts
- [ ] backend/src/routes/vendor.routes.ts
- [ ] backend/src/routes/purchaseOrder.routes.ts
- [ ] backend/src/routes/employee.routes.ts
- [ ] backend/src/routes/role.routes.ts

---

### 6️⃣ ISSUE-002: JWT in localStorage (6-8 hours) - [#25](https://github.com/agastya71/mysl-pos-project/issues/25)

**Status:** ⬜ Not Started

**Backend:**
- [ ] Install: `npm install cookie-parser @types/cookie-parser`
- [ ] Update `backend/src/app.ts` - add cookie-parser
- [ ] Update `backend/src/controllers/auth.controller.ts` - login (set cookie)
- [ ] Update `backend/src/controllers/auth.controller.ts` - refresh (read/set cookie)
- [ ] Update `backend/src/controllers/auth.controller.ts` - logout (clear cookie)
- [ ] Run tests: `cd backend && npm test`
- [ ] Update backend integration tests

**Frontend:**
- [ ] Update `pos-client/src/store/slices/auth.slice.ts` - in-memory token
- [ ] Add getAccessToken/setAccessToken functions
- [ ] Update login thunk - use setAccessToken
- [ ] Update logout thunk - clear in-memory token
- [ ] Add refreshSession thunk
- [ ] Update `pos-client/src/services/api/api.client.ts` - withCredentials
- [ ] Update request interceptor - use getAccessToken
- [ ] Update response interceptor - token refresh
- [ ] Update `pos-client/src/services/api/auth.api.ts` - adjust signatures
- [ ] Update `pos-client/src/App.tsx` - add refreshSession on mount
- [ ] Run tests: `cd pos-client && npm test`

**Testing (CRITICAL):**
- [ ] Login - verify cookie exists (HttpOnly)
- [ ] Check localStorage - NO tokens, only user
- [ ] Check Chrome DevTools - verify cookie attributes
- [ ] Wait for token expiry - verify auto-refresh
- [ ] Refresh page - verify session persists
- [ ] Logout - verify cookie cleared
- [ ] Run full E2E test flow

**Files Modified:**
- Backend:
  - [ ] backend/package.json
  - [ ] backend/src/app.ts
  - [ ] backend/src/controllers/auth.controller.ts
  - [ ] backend/src/__tests__/integration/auth.api.test.ts

- Frontend:
  - [ ] pos-client/src/store/slices/auth.slice.ts
  - [ ] pos-client/src/services/api/api.client.ts
  - [ ] pos-client/src/services/api/auth.api.ts
  - [ ] pos-client/src/App.tsx
  - [ ] pos-client/src/__tests__/unit/slices/auth.slice.test.ts

---

## Progress Summary

| Issue | Status | Time Spent | Estimated | Remaining |
|-------|--------|------------|-----------|-----------|
| ISSUE-003 | ⬜ | 0h | 1h | 1h |
| ISSUE-009 | ⬜ | 0h | 1h | 1h |
| ISSUE-006 | ⬜ | 0h | 1h | 1h |
| ISSUE-007 | ⬜ | 0h | 2h | 2h |
| ISSUE-001 | ⬜ | 0h | 4-6h | 4-6h |
| ISSUE-002 | ⬜ | 0h | 6-8h | 6-8h |
| **TOTAL** | **0%** | **0h** | **15-19h** | **15-19h** |

---

## Quick Commands

### Run Tests
```bash
# Backend
cd /Users/u0102180/Code/personal-project/pos-system-worktrees/feature-phase-1-security-fixes/backend
npm test

# Frontend
cd /Users/u0102180/Code/personal-project/pos-system-worktrees/feature-phase-1-security-fixes/pos-client
npm test
```

### Start Dev Servers
```bash
# Backend
cd /Users/u0102180/Code/personal-project/pos-system-worktrees/feature-phase-1-security-fixes/backend
npm run dev

# Frontend (separate terminal)
cd /Users/u0102180/Code/personal-project/pos-system-worktrees/feature-phase-1-security-fixes/pos-client
npm run dev:webpack
```

### Commit Progress
```bash
cd /Users/u0102180/Code/personal-project/pos-system-worktrees/feature-phase-1-security-fixes
git add .
git commit -m "fix: implement ISSUE-XXX - description"
```

### When Complete
```bash
# Push branch
git push -u origin feature/phase-1-security-fixes

# Create PR
gh pr create --title "Phase 1: Critical Security Fixes (6 issues)" \
  --body "Implements all 6 Phase 1 critical security fixes. See PHASE_1_IMPLEMENTATION_PLANS.md for details." \
  --milestone "Phase 1: Critical Security Fixes"

# After PR merged, clean up
cd /Users/u0102180/Code/personal-project/pos-system
git worktree remove /Users/u0102180/Code/personal-project/pos-system-worktrees/feature-phase-1-security-fixes
git branch -d feature/phase-1-security-fixes
```

---

## Notes

- **Implementation Order Matters:** Issues 1-4 can be done in any order, but ISSUE-006 (CORS) must be done before ISSUE-002 (JWT cookies)
- **Testing is Critical:** Especially for ISSUE-002 - manual E2E testing is mandatory
- **Rollback Plans:** Each issue has a rollback plan in PHASE_1_IMPLEMENTATION_PLANS.md
- **Breaking Changes:** ISSUE-001 (RBAC) and ISSUE-002 (JWT cookies) have breaking changes documented

---

**Reference Documents:**
- Implementation Details: `PHASE_1_IMPLEMENTATION_PLANS.md`
- Remediation Strategy: `REMEDIATION_PLAN.md`
- Issue Files: `.issues/ISSUE-001-*.md` through `.issues/ISSUE-009-*.md`
