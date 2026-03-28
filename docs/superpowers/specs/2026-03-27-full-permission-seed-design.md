# Full Permission Seed — Design Spec

**Date:** 2026-03-27
**Status:** Approved

---

## Goal

Seed the complete role-permission matrix so that all `requirePermission` guards (already wired on all 12 route files) return `200` instead of `403` for appropriately-credentialed users.

## Background

PR #57 seeded only `payments:*` permissions. All other routes (`products`, `categories`, `transactions`, `customers`, `inventory`, `vendors`, `purchase_orders`, `employees`, `roles`, `permissions`, `gift_cards`) currently reject every request with 403 because their permissions are absent from the DB.

Item 3 (wiring `requirePermission` to routes) is already complete — all 12 route files have guards.

---

## Approach: Data-Driven Matrix in seed.ts

Define a `ROLE_PERMISSIONS` TypeScript constant in `backend/src/database/seed.ts` that maps each role name to its list of `resource:action` strings. The seed functions iterate the constant to build all INSERTs — no hardcoded rows, no duplicate logic.

> **Note:** This matrix represents the initial access model. It is expected to evolve once the system is in active use. The constant is the single place to edit when roles need adjustment.

---

## Role-Permission Matrix

### Cashier (front-line POS operations)

| Resource | Actions |
|---|---|
| products | read |
| categories | read |
| transactions | create, read |
| customers | create, read |
| payments | create, read |
| gift_cards | create, read |

### Manager (inherits Cashier + operations/oversight)

| Resource | Actions |
|---|---|
| transactions | update (void/refund) |
| customers | update, delete |
| payments | update |
| gift_cards | update, delete |
| inventory | adjust, read, reports |
| vendors | read |
| purchase_orders | create, read, update, receive, cancel |
| employees | read |
| roles | read |
| permissions | read |

### Admin (inherits Manager + full access)

| Resource | Actions |
|---|---|
| products | create, update, delete |
| categories | create, update, delete |
| vendors | create, update, delete |
| employees | create, update, delete |
| purchase_orders | approve, delete |
| roles | create, update |

Admin has every permission that Cashier and Manager have, plus the above.

---

## Implementation

### Constant shape

```typescript
const ROLE_PERMISSIONS: Record<string, string[]> = {
  cashier: [
    'products:read',
    'categories:read',
    'transactions:create', 'transactions:read',
    'customers:create', 'customers:read',
    'payments:create', 'payments:read',
    'gift_cards:create', 'gift_cards:read',
  ],
  manager: [
    // inherits cashier +
    'transactions:update',
    'customers:update', 'customers:delete',
    'payments:update',
    'gift_cards:update', 'gift_cards:delete',
    'inventory:adjust', 'inventory:read', 'inventory:reports',
    'vendors:read',
    'purchase_orders:create', 'purchase_orders:read',
    'purchase_orders:update', 'purchase_orders:receive', 'purchase_orders:cancel',
    'employees:read',
    'roles:read',
    'permissions:read',
  ],
  admin: [
    // inherits manager +
    'products:create', 'products:update', 'products:delete',
    'categories:create', 'categories:update', 'categories:delete',
    'vendors:create', 'vendors:update', 'vendors:delete',
    'employees:create', 'employees:update', 'employees:delete',
    'purchase_orders:approve', 'purchase_orders:delete',
    'roles:create', 'roles:update',
  ],
};
```

Each role's array contains only the *additional* permissions beyond what lower roles have. The seed function combines them correctly when assigning to Admin and Manager.

### Seed execution order

1. Roles (already seeded by PR #57 — idempotent)
2. Employees (already seeded by PR #57 — idempotent)
3. Permissions — derive unique set from all values in `ROLE_PERMISSIONS`, INSERT with `ON CONFLICT DO NOTHING`
4. Role-permissions — for each role, assign its own permissions + all permissions from roles below it, INSERT with `ON CONFLICT DO NOTHING`

### Transaction safety

All permission and role_permission INSERTs run inside a single `BEGIN`/`COMMIT` block. Any failure rolls back cleanly.

### Idempotency

All INSERTs use `ON CONFLICT DO NOTHING`. Running `npm run seed` multiple times is safe. The existing `payments:*` permissions seeded by PR #57 will be silently skipped.

---

## Testing

Integration test: `backend/src/__tests__/integration/permissions.seed.test.ts`

Verifications:
- All permissions in the matrix exist in the `permissions` table
- Cashier role has exactly the right permissions
- Manager role has its own permissions + cashier's (cumulative)
- Admin role has all permissions (full set)
- No extra permissions beyond the matrix (prevents silent over-seeding)

---

## Files Changed

| File | Change |
|---|---|
| `backend/src/database/seed.ts` | Add `ROLE_PERMISSIONS` constant, `seedPermissions()`, `seedRolePermissions()` |
| `backend/src/__tests__/integration/permissions.seed.test.ts` | New — matrix correctness tests |
