# ISSUE-005: Dynamic Column Names from Object Keys in SQL Update Queries

**Severity:** HIGH
**Category:** Security

## Description

In `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/product.service.ts` (lines 181-183):

```typescript
Object.entries(data).forEach(([key, value]) => {
  if (value !== undefined) {
    updates.push(`${key} = $${paramIndex}`);
```

The `key` variable is interpolated directly into the SQL UPDATE statement. While Zod schema validation in the controller strips unknown keys, the service layer does not validate that `key` is a legitimate column name. If the Zod schema is modified to add a `.passthrough()`, or if the service is called from a different context, arbitrary column names (or SQL fragments) could be injected.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/product.service.ts` -- lines 176-187

## Risk

SQL injection via column name manipulation if Zod validation changes.

## Recommendation

Use an explicit whitelist of allowed column names:

```typescript
const ALLOWED_COLUMNS = ['sku', 'barcode', 'name', 'description', ...];
Object.entries(data).forEach(([key, value]) => {
  if (value !== undefined && ALLOWED_COLUMNS.includes(key)) {
    updates.push(`"${key}" = $${paramIndex}`);
```

## Estimated Effort

2 hours
