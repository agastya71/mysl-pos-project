# ISSUE-017: No Input Validation for Route Parameters

**Severity:** LOW
**Category:** Code Quality / Security

## Description

While `TransactionController` validates UUID format for `:id` parameters (lines 400-402), most other controllers pass route parameters directly to the service layer without validation:

- `CustomerController.getCustomerById()` at line 391: `const { id } = req.params;` -- no UUID validation
- `EmployeeController` -- similar pattern
- `CategoryController` -- similar pattern
- `InventoryController` -- similar pattern

Invalid UUIDs sent to PostgreSQL will cause a database error (cast error), which is caught by the error middleware but results in a generic 500 error rather than a clean 400 validation error.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/controllers/customer.controller.ts` -- line 391
- Multiple other controllers

## Risk

Poor error messages for invalid IDs; potential for unexpected database errors.

## Recommendation

Add a shared UUID validation middleware or validate UUIDs in each controller before calling the service layer.

## Estimated Effort

2 hours
