# ISSUE-006: CORS Configured to Accept All Origins

**Severity:** HIGH
**Category:** Security

## Description

In `/Users/u0102180/Code/personal-project/pos-system/backend/src/app.ts` (line 13):

```typescript
app.use(cors());
```

This enables CORS for all origins with default settings. Any website on the internet can make authenticated API requests to this backend if a user has a valid token in their browser.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/app.ts` -- line 13

## Risk

Cross-origin attacks where malicious websites make API calls using the authenticated user's browser session.

## Recommendation

Configure CORS with specific allowed origins:

```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true,
}));
```

## Estimated Effort

1 hour
