# ISSUE-002: JWT Tokens Stored in localStorage -- XSS Vulnerability

**Severity:** CRITICAL
**Category:** Security

## Description

In `/Users/u0102180/Code/personal-project/pos-system/pos-client/src/store/slices/auth.slice.ts` (lines 138-140), both access and refresh tokens are stored in `localStorage`:

```typescript
localStorage.setItem('accessToken', response.tokens.accessToken);
localStorage.setItem('refreshToken', response.tokens.refreshToken);
localStorage.setItem('user', JSON.stringify(response.user));
```

The API client in `/Users/u0102180/Code/personal-project/pos-system/pos-client/src/services/api/api.client.ts` (line 60) reads tokens from localStorage for every request. Any XSS vulnerability (including from third-party scripts) would allow an attacker to steal both tokens, gaining complete and persistent access to the account.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/pos-client/src/store/slices/auth.slice.ts` -- lines 68-69, 138-140, 183, 194-196
- `/Users/u0102180/Code/personal-project/pos-system/pos-client/src/services/api/api.client.ts` -- lines 60, 78, 85-86, 92-93

## Risk

Complete account takeover if any XSS vector exists. The refresh token (7-day lifespan) provides persistent access even after the access token expires.

## Recommendation

Move refresh tokens to httpOnly, Secure, SameSite cookies set by the server. Keep only the short-lived access token in memory (Redux state, not localStorage). Implement a `/api/v1/auth/refresh` endpoint that reads the refresh token from the cookie.

## Estimated Effort

6-8 hours
