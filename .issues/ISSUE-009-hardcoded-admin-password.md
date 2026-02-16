# ISSUE-009: Hardcoded Admin Credentials in Seed Script

**Severity:** MEDIUM
**Category:** Security

## Description

In `/Users/u0102180/Code/personal-project/pos-system/backend/src/database/seed.ts` (line 33):

```typescript
const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
```

And this corresponds to the documented login credentials (admin/admin123). If the seed runs in production and the password is not changed, the system has a default credential vulnerability.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/database/seed.ts` -- line 33

## Risk

Default credentials in production deployment.

## Recommendation

Read the admin password from an environment variable:

```typescript
const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
if (!adminPassword) throw new Error('ADMIN_INITIAL_PASSWORD required for seeding');
```

## Estimated Effort

1 hour
