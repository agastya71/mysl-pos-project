# ISSUE-019: No Database Connection Pooling Configuration for Production

**Severity:** LOW
**Category:** Configuration / Performance

## Description

In `/Users/u0102180/Code/personal-project/pos-system/backend/src/config/database.ts` (lines 4-13):

```typescript
const config: PoolConfig = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

These hardcoded values are used for both development and production. There is no SSL configuration for production database connections, and the pool size might need adjustment based on deployment environment.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/config/database.ts`

## Risk

Suboptimal performance in production; no SSL for database connections.

## Recommendation

Make pool configuration environment-aware:

```typescript
const config: PoolConfig = {
  max: parseInt(process.env.DATABASE_POOL_MAX || '20'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};
```

## Estimated Effort

1 hour
