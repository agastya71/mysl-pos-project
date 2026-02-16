# ISSUE-007: No Rate Limiting at Application Level

**Severity:** HIGH
**Category:** Security

## Description

The backend Express application in `/Users/u0102180/Code/personal-project/pos-system/backend/src/app.ts` has no rate limiting middleware. While the nginx configuration at `/Users/u0102180/Code/personal-project/pos-system/nginx/nginx.conf` includes rate limiting, this only applies in the production Docker deployment. During development, direct API access, or if nginx is bypassed, there is no protection against brute force attacks on the login endpoint or API abuse.

The auth controller even acknowledges this in a comment at line 162: `Rate limiting should be implemented at API gateway level`.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/app.ts` -- no rate limiting imports or middleware
- `/Users/u0102180/Code/personal-project/pos-system/backend/package.json` -- `express-rate-limit` not in dependencies

## Risk

Brute force password attacks, denial of service, API abuse in any deployment without nginx.

## Recommendation

Add `express-rate-limit` middleware:

```typescript
import rateLimit from 'express-rate-limit';
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
app.use('/api/v1/auth/login', loginLimiter);
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/v1/', apiLimiter);
```

## Estimated Effort

2 hours
