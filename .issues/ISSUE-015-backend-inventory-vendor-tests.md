# ISSUE-015: Missing Backend Service Tests for Inventory and Vendor

**Severity:** MEDIUM
**Category:** Testing

## Description

While the backend has good test coverage for transactions, customers, employees, roles, categories, and purchase orders, two services have no tests:
- Inventory service (`/Users/u0102180/Code/personal-project/pos-system/backend/src/services/inventory.service.ts`) -- handles adjustments and 5 report types
- Vendor service/controller -- no test files found

The inventory reports contain complex SQL queries with CTEs that could easily have bugs.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/inventory.service.ts`
- `/Users/u0102180/Code/personal-project/pos-system/backend/src/__tests__/` -- no inventory or vendor test files

## Risk

Bugs in inventory adjustment logic could lead to incorrect stock levels. Report queries might return wrong data.

## Recommendation

Add unit tests for inventory.service.ts (particularly the adjustment logic and negative inventory prevention) and vendor service.

## Estimated Effort

4-6 hours
