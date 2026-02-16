# ISSUE-016: Inconsistent Error Handling Patterns Across Controllers

**Severity:** LOW
**Category:** Code Quality

## Description

Some controllers throw `AppError` directly (relying on Express error middleware to catch async errors), while others use try-catch with `next(error)`:

- **Throw pattern (no try-catch):** `TransactionController` in `/Users/u0102180/Code/personal-project/pos-system/backend/src/controllers/transaction.controller.ts` -- throws AppError directly
- **Next pattern (try-catch):** `CustomerController` in `/Users/u0102180/Code/personal-project/pos-system/backend/src/controllers/customer.controller.ts` -- wraps in try-catch and calls `next(error)`

The throw pattern requires Express 5 or a wrapper to catch async errors. If Express < 5 is used (and Express 4 is current), unhandled promise rejections from thrown errors will crash the process rather than triggering the error middleware.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/controllers/transaction.controller.ts` -- throw pattern
- `/Users/u0102180/Code/personal-project/pos-system/backend/src/controllers/customer.controller.ts` -- try-catch/next pattern
- `/Users/u0102180/Code/personal-project/pos-system/backend/src/controllers/category.controller.ts`
- `/Users/u0102180/Code/personal-project/pos-system/backend/src/controllers/inventory.controller.ts`

## Risk

Inconsistent error handling could cause unhandled promise rejections in Express 4, crashing the server on errors in the transaction controller.

## Recommendation

Either (a) wrap all route handlers with an async error catcher, or (b) standardize on try-catch/next(error) in all controllers. Express 5 supports async error handling natively; if upgrading, the throw pattern is acceptable.

## Estimated Effort

3 hours
