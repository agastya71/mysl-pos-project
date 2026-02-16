# ISSUE-010: Race Conditions in PO Status Transitions

**Severity:** MEDIUM
**Category:** Architecture / Data Integrity

## Description

Several PO functions in `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/purchaseOrder.service.ts` perform read-then-write patterns without wrapping them in database transactions:

- `deletePO()` (line 567-589): checks status, then deletes -- no BEGIN/COMMIT
- `submitPO()` (line 599-641): checks status, validates items, then updates -- no BEGIN/COMMIT
- `approvePO()` (line 643-687): checks status, then updates -- no BEGIN/COMMIT
- `closePO()` (line 831-862): checks status, then updates -- no BEGIN/COMMIT

In contrast, `createPO()`, `updatePO()`, and `receiveItems()` properly use BEGIN/COMMIT/ROLLBACK.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/purchaseOrder.service.ts` -- functions `deletePO`, `submitPO`, `approvePO`, `closePO`

## Risk

Concurrent requests could both pass the status check, leading to invalid state transitions (e.g., deleting a non-draft PO if the status changes between the SELECT and DELETE).

## Recommendation

Wrap all status-transition functions in explicit transactions with `SELECT ... FOR UPDATE` to lock the row during the check-then-update sequence.

## Estimated Effort

3 hours
