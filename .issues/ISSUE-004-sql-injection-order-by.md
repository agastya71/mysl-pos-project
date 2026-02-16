# ISSUE-004: SQL Injection Risk in Dynamic ORDER BY Clauses

**Severity:** HIGH
**Category:** Security

## Description

In `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/transaction.service.ts` (lines 468-469, 528):

```typescript
const sortBy = query.sort_by || 'transaction_date';
const sortOrder = query.sort_order || 'desc';
// ...
ORDER BY t.${sortBy} ${sortOrder}
```

In `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/product.service.ts` (lines 70-71, 111):

```typescript
const sortBy = query.sort_by || 'created_at';
const sortOrder = query.sort_order || 'desc';
// ...
ORDER BY ${sortBy} ${sortOrder}
```

While Zod validation in the controllers restricts `sort_by` and `sort_order` to enum values, this is defense-in-depth failure. The service layer trusts its inputs completely and interpolates them directly into SQL strings. If a new caller is added, or if validation is accidentally removed, this becomes a direct SQL injection.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/transaction.service.ts` -- lines 468-469, 528
- `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/product.service.ts` -- lines 70-71, 111

## Risk

If Zod validation is bypassed or misconfigured, attacker can inject arbitrary SQL via sort parameters.

## Recommendation

Add a whitelist validation in the service layer itself:

```typescript
const ALLOWED_SORT_COLUMNS = ['transaction_date', 'total_amount', 'transaction_number'] as const;
const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'transaction_date';
const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
```

## Estimated Effort

2 hours
