# ISSUE-012: Database Connection Pool Error Causes Process Exit

**Severity:** MEDIUM
**Category:** Architecture / Reliability

## Description

In `/Users/u0102180/Code/personal-project/pos-system/backend/src/config/database.ts` (lines 22-24):

```typescript
pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
  process.exit(-1);
});
```

Any unexpected error on the database pool (including transient network issues) immediately terminates the process without graceful shutdown. This prevents in-flight requests from completing and could corrupt partial transactions.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/config/database.ts` -- lines 22-24

## Risk

Abrupt process termination on transient database errors, potential data corruption for in-flight transactions.

## Recommendation

Implement graceful shutdown: stop accepting new requests, wait for in-flight requests to complete, then exit. Or better, attempt reconnection before exiting.

## Estimated Effort

2 hours
