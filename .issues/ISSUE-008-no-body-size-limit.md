# ISSUE-008: No Request Body Size Limit

**Severity:** MEDIUM
**Category:** Security / Performance

## Description

In `/Users/u0102180/Code/personal-project/pos-system/backend/src/app.ts` (line 14):

```typescript
app.use(express.json());
```

No `limit` option is configured. Express defaults to 100KB, but this should be explicitly set to prevent potential denial-of-service via oversized payloads. The nginx config does set `client_max_body_size 10M` at line 30 of `/Users/u0102180/Code/personal-project/pos-system/nginx/nginx.conf`, but this only applies in production behind nginx.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/app.ts` -- line 14

## Risk

Memory exhaustion if large payloads are sent directly to the Express app.

## Recommendation

```typescript
app.use(express.json({ limit: '1mb' }));
```

## Estimated Effort

15 minutes
