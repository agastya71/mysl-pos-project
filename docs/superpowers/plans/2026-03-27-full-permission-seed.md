# Full Permission Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline `payments`-only permission seeding in `seed.ts` with a data-driven `ROLE_PERMISSIONS` matrix that seeds all 44 permissions across Cashier / Manager / Admin roles.

**Architecture:** Export a `ROLE_PERMISSIONS` constant and two helper functions (`seedPermissions`, `seedRolePermissions`) from `seed.ts`. The existing `seedDatabase()` calls them. Integration tests call them directly (bypassing the terminal early-exit guard) to verify the full matrix.

**Tech Stack:** Node.js 18, TypeScript strict, PostgreSQL 15 (pg), Jest integration tests.

---

## Context: existing seed.ts structure

`backend/src/database/seed.ts` currently:
- Has an early-exit guard at line 14–19: if terminals already exist, the whole seed is skipped.
- Seeds roles at line 101–118 using `INSERT ... ON CONFLICT (role_name) DO UPDATE ... RETURNING id`, collecting IDs into `roleIds`.
- Seeds only `payments:*` permissions at line 120–159, hardcoded as arrays.

The plan replaces lines 120–159 with calls to two new exported functions.

## File Map

| File | Change |
|---|---|
| `backend/src/database/seed.ts` | Export `ROLE_PERMISSIONS`, `seedPermissions()`, `seedRolePermissions()`; replace inline payments block |
| `backend/src/__tests__/integration/permissions.seed.test.ts` | New — matrix correctness tests |

---

## Permission counts (for test assertions)

- **Cashier:** 10 permissions (own array only)
- **Manager:** 28 cumulative (10 cashier + 18 manager-additional)
- **Admin:** 44 cumulative (all three arrays combined — equals total unique count)

---

## Task 1: Write failing integration test

**Files:**
- Create: `backend/src/__tests__/integration/permissions.seed.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { ROLE_PERMISSIONS, seedPermissions, seedRolePermissions } from '../../database/seed';

describe('Permission seed matrix', () => {
  let client: PoolClient;

  beforeAll(async () => {
    client = await pool.connect();
    await client.query('BEGIN');

    // Ensure the three roles exist (idempotent — seed may not have run)
    for (const [roleName, description] of [
      ['Admin', 'Full system access'],
      ['Manager', 'Store operations and approvals'],
      ['Cashier', 'Sales transactions only'],
    ] as [string, string][]) {
      await client.query(
        `INSERT INTO roles (role_name, description, is_active)
         VALUES ($1, $2, true)
         ON CONFLICT (role_name) DO NOTHING`,
        [roleName, description],
      );
    }

    // Clear and re-seed so the test is isolated
    await client.query('DELETE FROM role_permissions');
    await client.query('DELETE FROM permissions');

    const permissionIds = await seedPermissions(client);
    await seedRolePermissions(client, permissionIds);
    await client.query('COMMIT');
  }, 30000);

  afterAll(async () => {
    client.release();
    await pool.end();
  });

  it('seeds all unique permissions from the matrix', async () => {
    const allPerms = [...new Set(Object.values(ROLE_PERMISSIONS).flat())];
    const result = await pool.query<{ permission_name: string }>(
      `SELECT permission_name FROM permissions WHERE permission_name = ANY($1)`,
      [allPerms],
    );
    expect(result.rows.map(r => r.permission_name).sort()).toEqual(allPerms.sort());
  });

  it('seeds no extra permissions beyond the matrix', async () => {
    const totalExpected = new Set(Object.values(ROLE_PERMISSIONS).flat()).size;
    const result = await pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM permissions`);
    expect(parseInt(result.rows[0].count, 10)).toBe(totalExpected);
  });

  it('assigns cashier exactly its permissions', async () => {
    const expected = ROLE_PERMISSIONS.cashier.length;
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       WHERE r.role_name = 'Cashier'`,
    );
    expect(parseInt(result.rows[0].count, 10)).toBe(expected);
  });

  it('assigns manager cumulative permissions (cashier + manager-additional)', async () => {
    const expected = ROLE_PERMISSIONS.cashier.length + ROLE_PERMISSIONS.manager.length;
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       WHERE r.role_name = 'Manager'`,
    );
    expect(parseInt(result.rows[0].count, 10)).toBe(expected);
  });

  it('assigns admin all permissions (full set)', async () => {
    const expected = new Set(Object.values(ROLE_PERMISSIONS).flat()).size;
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       WHERE r.role_name = 'Admin'`,
    );
    expect(parseInt(result.rows[0].count, 10)).toBe(expected);
  });

  it('cashier has products:read permission', async () => {
    const result = await pool.query(
      `SELECT 1 FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE r.role_name = 'Cashier' AND p.permission_name = 'products:read'`,
    );
    expect(result.rowCount).toBe(1);
  });

  it('cashier does NOT have products:create permission', async () => {
    const result = await pool.query(
      `SELECT 1 FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE r.role_name = 'Cashier' AND p.permission_name = 'products:create'`,
    );
    expect(result.rowCount).toBe(0);
  });

  it('admin has purchase_orders:approve permission', async () => {
    const result = await pool.query(
      `SELECT 1 FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE r.role_name = 'Admin' AND p.permission_name = 'purchase_orders:approve'`,
    );
    expect(result.rowCount).toBe(1);
  });

  it('manager does NOT have purchase_orders:approve permission', async () => {
    const result = await pool.query(
      `SELECT 1 FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE r.role_name = 'Manager' AND p.permission_name = 'purchase_orders:approve'`,
    );
    expect(result.rowCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails with import error**

```bash
cd backend && npm run test:integration -- --testPathPattern="permissions.seed"
```

Expected: FAIL — `SyntaxError` or `TypeError: ROLE_PERMISSIONS is not exported` (the exports don't exist yet in seed.ts).

---

## Task 2: Implement ROLE_PERMISSIONS + seedPermissions + seedRolePermissions in seed.ts

**Files:**
- Modify: `backend/src/database/seed.ts`

- [ ] **Step 1: Add import for PoolClient at the top of seed.ts**

Change:
```typescript
import { pool } from '../config/database';
import logger from '../utils/logger';
import * as bcrypt from 'bcrypt';
```

To:
```typescript
import { PoolClient } from 'pg';
import { pool } from '../config/database';
import logger from '../utils/logger';
import * as bcrypt from 'bcrypt';
```

- [ ] **Step 2: Add the ROLE_PERMISSIONS constant after the imports**

Insert after `const SALT_ROUNDS = 10;`:

```typescript
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  cashier: [
    'products:read',
    'categories:read',
    'transactions:create', 'transactions:read',
    'customers:create', 'customers:read',
    'payments:create', 'payments:read',
    'gift_cards:create', 'gift_cards:read',
  ],
  manager: [
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
    'products:create', 'products:update', 'products:delete',
    'categories:create', 'categories:update', 'categories:delete',
    'vendors:create', 'vendors:update', 'vendors:delete',
    'employees:create', 'employees:update', 'employees:delete',
    'purchase_orders:approve', 'purchase_orders:delete',
    'roles:create', 'roles:update',
  ],
};
```

- [ ] **Step 3: Add the seedPermissions function after the ROLE_PERMISSIONS constant**

```typescript
export async function seedPermissions(client: PoolClient): Promise<Record<string, number>> {
  const allPermissions = new Set<string>(Object.values(ROLE_PERMISSIONS).flat());
  const permissionIds: Record<string, number> = {};
  for (const permName of allPermissions) {
    const [resource, action] = permName.split(':');
    const result = await client.query<{ id: number }>(
      `INSERT INTO permissions (permission_name, resource, action, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (permission_name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      [permName, resource, action, `${action} ${resource}`],
    );
    permissionIds[permName] = result.rows[0].id;
  }
  return permissionIds;
}
```

- [ ] **Step 4: Add the seedRolePermissions function after seedPermissions**

```typescript
export async function seedRolePermissions(
  client: PoolClient,
  permissionIds: Record<string, number>,
): Promise<void> {
  const rolesResult = await client.query<{ id: number; role_name: string }>(
    `SELECT id, role_name FROM roles WHERE role_name IN ('Admin', 'Manager', 'Cashier')`,
  );
  const roleIds: Record<string, number> = {};
  for (const row of rolesResult.rows) {
    roleIds[row.role_name] = row.id;
  }

  const cumulative: Record<string, string[]> = {
    Cashier: ROLE_PERMISSIONS.cashier,
    Manager: [...ROLE_PERMISSIONS.cashier, ...ROLE_PERMISSIONS.manager],
    Admin: [...ROLE_PERMISSIONS.cashier, ...ROLE_PERMISSIONS.manager, ...ROLE_PERMISSIONS.admin],
  };

  for (const [roleName, perms] of Object.entries(cumulative)) {
    const roleId = roleIds[roleName];
    if (!roleId) continue;
    for (const permName of perms) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [roleId, permissionIds[permName]],
      );
    }
  }
}
```

- [ ] **Step 5: Replace the inline payments block in seedDatabase() with calls to the new functions**

Find and remove lines 120–159 (the `paymentsPermissions` array, `permissionIds` map, and `rolePermissionMappings` array), replacing them with:

```typescript
    // Seed all permissions from the role-permission matrix
    const permissionIds = await seedPermissions(client);
    logger.info('Seeded all permissions');

    // Assign cumulative permissions to each role
    await seedRolePermissions(client, permissionIds);
    logger.info('Assigned permissions to roles');
```

The full updated `seedDatabase` body around that section (from the `// Create default roles` comment through the `// Create admin employee record` section) should now look like:

```typescript
    // Create default roles
    const roles = [
      { role_name: 'Admin', description: 'Full system access' },
      { role_name: 'Manager', description: 'Store operations and approvals' },
      { role_name: 'Cashier', description: 'Sales transactions only' },
    ];

    const roleIds: Record<string, number> = {};
    for (const role of roles) {
      const roleResult = await client.query<{ id: number }>(
        `INSERT INTO roles (role_name, description, is_active)
         VALUES ($1, $2, true)
         ON CONFLICT (role_name) DO UPDATE SET description = EXCLUDED.description
         RETURNING id`,
        [role.role_name, role.description],
      );
      roleIds[role.role_name] = roleResult.rows[0].id;
    }
    logger.info('Created default roles');

    // Seed all permissions from the role-permission matrix
    const permissionIds = await seedPermissions(client);
    logger.info('Seeded all permissions');

    // Assign cumulative permissions to each role
    await seedRolePermissions(client, permissionIds);
    logger.info('Assigned permissions to roles');

    // Create admin employee record (links auth user to RBAC role)
    if (userId) {
      await client.query(
        `INSERT INTO employees (
          user_id, first_name, last_name, email,
          hire_date, role_id, is_active
        )
        VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, true)
        ON CONFLICT (email) DO NOTHING`,
        [userId, 'System', 'Administrator', 'admin@pos-system.local', roleIds['Admin']],
      );
      logger.info('Created admin employee record');
    }
```

Note: The `roleIds` variable built in the roles loop is still used by the admin employee INSERT — do not remove it.

- [ ] **Step 6: Run the integration tests to verify they pass**

```bash
cd backend && npm run test:integration -- --testPathPattern="permissions.seed"
```

Expected: PASS — 9 tests, 0 failures.

- [ ] **Step 7: Run full integration test suite to verify no regressions**

```bash
cd backend && npm run test:integration
```

Expected: All previously-passing tests still pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/database/seed.ts \
        backend/src/__tests__/integration/permissions.seed.test.ts
git commit -m "feat(auth): seed full role-permission matrix for all 12 resources"
```

---

## Self-Review Checklist

- [x] Spec requirement "data-driven ROLE_PERMISSIONS constant" → Task 2 Step 2
- [x] Spec requirement "seedPermissions exported" → Task 2 Step 3
- [x] Spec requirement "seedRolePermissions exported" → Task 2 Step 4
- [x] Spec requirement "idempotent via ON CONFLICT DO NOTHING" → both functions
- [x] Spec requirement "transaction safety" → existing seedDatabase() BEGIN/COMMIT wraps the calls; test uses BEGIN/COMMIT in beforeAll
- [x] Spec requirement "integration test verifying matrix" → Task 1
- [x] Test verifies exact cashier/manager/admin counts using the same constant → Tasks 1 Step 1
- [x] No extra permissions beyond matrix → "seeds no extra permissions" test
- [x] `roleIds` variable (used for admin employee INSERT) preserved in seedDatabase()
- [x] No TBDs or placeholders anywhere
