# ISSUE-001: Authorization Not Enforced -- RBAC System Built But Never Used

**Severity:** CRITICAL
**Category:** Security

## Description

Phase 4A built a complete RBAC system with 4 roles, 35 permissions, and a `checkPermission()` function. However, none of this is actually enforced anywhere in the application. The `authorizeRoles` middleware defined in `/Users/u0102180/Code/personal-project/pos-system/backend/src/middleware/auth.middleware.ts` (line 28) is exported but never imported or used in any route file. The `checkPermission()` function in `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/role.service.ts` (line 401) is defined but never called from any middleware or controller.

This means every authenticated user -- regardless of role (cashier, supervisor, manager, admin) -- can perform every action in the system: void transactions, delete customers, manage employees, modify roles and permissions, create purchase orders, and adjust inventory.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/middleware/auth.middleware.ts` -- `authorizeRoles` defined at line 28 but never imported anywhere
- `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/role.service.ts` -- `checkPermission` at line 401 never called
- All route files in `/Users/u0102180/Code/personal-project/pos-system/backend/src/routes/` -- only use `authenticateToken`, never `authorizeRoles`

## Risk

Any authenticated user can perform admin-level operations. A cashier could void transactions, modify roles, create/delete employees, or change product prices. This effectively makes the entire RBAC system decorative.

## Recommendation

Create a `requirePermission(resource, action)` middleware that calls `checkPermission()` and apply it to every route. At minimum, apply `authorizeRoles` to sensitive endpoints (employee management, role management, inventory adjustments, void transactions). Example:

```typescript
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), controller.delete);
```

## Estimated Effort

4-6 hours
