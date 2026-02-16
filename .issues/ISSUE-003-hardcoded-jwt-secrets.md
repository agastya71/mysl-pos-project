# ISSUE-003: Hardcoded Fallback JWT Secrets in Source Code

**Severity:** HIGH
**Category:** Security

## Description

In `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/auth.service.ts` (lines 36-37):

```typescript
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
```

And in `/Users/u0102180/Code/personal-project/pos-system/backend/src/middleware/auth.middleware.ts` (line 6):

```typescript
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
```

If environment variables are not set (misconfiguration, container restart, etc.), the application silently falls back to well-known, predictable secrets. An attacker who knows these defaults can forge valid JWT tokens for any user.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/auth.service.ts` -- lines 36-37
- `/Users/u0102180/Code/personal-project/pos-system/backend/src/middleware/auth.middleware.ts` -- line 6

## Risk

Complete authentication bypass if env vars are missing. An attacker can forge tokens with `jwt.sign({userId: 'any-uuid', role: 'admin'}, 'dev_access_secret')`.

## Recommendation

Remove the fallback values and throw an error on startup if JWT secrets are not configured:

```typescript
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
if (!JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET environment variable is required');
```

## Estimated Effort

1 hour
