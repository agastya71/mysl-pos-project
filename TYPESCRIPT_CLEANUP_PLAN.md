# TypeScript & Test Cleanup Plan (Option 2 - Full Fix)

**Status**: Deferred - To be completed after Phase 3C
**Estimated Time**: 3-4 hours
**Priority**: Medium (blocks production builds, but dev works fine)

---

## Problem Statement

The backend codebase has accumulated TypeScript compilation errors over multiple phases. While `npm run dev` works (uses `--transpile-only`), strict TypeScript compilation (`npm run build` and Jest) fails.

**Impact**:
- ❌ `npm run build` fails (production builds broken)
- ❌ Integration tests timeout (can't compile)
- ✅ `npm run dev` works (development unaffected)
- ✅ Unit tests pass (41 tests)

---

## TypeScript Errors to Fix

### 1. **auth.service.ts** - JWT Signing Type Issues

**Error**:
```
error TS2769: No overload matches this call.
  Type 'string' is not assignable to type 'number | StringValue | undefined'.
```

**Location**: Lines 110 and 114
```typescript
const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
  expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
});

const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
  expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
});
```

**Root Cause**: The `expiresIn` option expects specific types, but environment variables are strings.

**Fix**:
```typescript
const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
  expiresIn: (process.env.JWT_ACCESS_EXPIRATION || '15m') as string,
});

const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
  expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as string,
});
```

**Alternative Fix** (better):
```typescript
import { SignOptions } from 'jsonwebtoken';

const accessOptions: SignOptions = {
  expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
};

const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, accessOptions);
```

---

### 2. **auth.service.ts** - Unused Import

**Error**:
```
error TS6133: 'User' is declared but its value is never read.
```

**Location**: Line 6
```typescript
import { AuthTokens, JwtPayload, User, LoginResponse } from '../types/api.types';
```

**Fix**: Remove `User` from imports
```typescript
import { AuthTokens, JwtPayload, LoginResponse } from '../types/api.types';
```

---

### 3. **inventory.service.ts** - Missing PaginatedResponse Type

**Error**:
```
error TS2305: Module '"../types/api.types"' has no exported member 'PaginatedResponse'.
```

**Location**: Line 15
```typescript
import { PaginatedResponse } from '../types/api.types';
```

**Root Cause**: `PaginatedResponse` type was used but never defined in api.types.ts

**Fix Option A**: Add the type to `api.types.ts`
```typescript
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Fix Option B**: Remove unused import if not actually used
- Check if `PaginatedResponse` is used in inventory.service.ts
- If not used, remove the import

---

### 4. **inventory.service.ts** - Unused Import

**Error**:
```
error TS6133: 'AdjustmentType' is declared but its value is never read.
```

**Location**: Line 12
```typescript
import { AdjustmentType, InventoryAdjustment, ... } from '../types/inventory.types';
```

**Fix**: Check if used, if not remove from imports

---

### 5. **inventory.controller.ts** - Missing PaginatedResponse

**Error**:
```
error TS2305: Module '"../types/api.types"' has no exported member 'PaginatedResponse'.
```

**Location**: Line 10

**Fix**: Same as #3 - add PaginatedResponse type to api.types.ts

---

### 6. **category.controller.ts** - Unused Imports

**Error**:
```
error TS6133: 'CreateCategoryRequest' is declared but its value is never read.
error TS6133: 'UpdateCategoryRequest' is declared but its value is never read.
```

**Location**: Line 11

**Fix**: These types are likely used in Zod validation. Either:
- Use them explicitly in type annotations
- Or remove if truly unused

---

### 7. **category.controller.ts** - Type Mismatch

**Error**:
```
error TS2345: Argument of type '{ name?: string | undefined; ... parent_category_id?: string | null | undefined; ... }'
is not assignable to parameter of type 'UpdateCategoryRequest'.
Type 'null' is not assignable to type 'string | undefined'.
```

**Location**: Line 111

**Root Cause**: `parent_category_id` allows `null` in the data but `UpdateCategoryRequest` only allows `string | undefined`

**Fix**: Update `UpdateCategoryRequest` type definition
```typescript
export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  parent_category_id?: string | null;  // Add null
  display_order?: number;
  is_active?: boolean;
}
```

---

### 8. **health.controller.ts** - Unused Parameter

**Error**:
```
error TS6133: 'req' is declared but its value is never read.
```

**Location**: Line 7

**Fix**: ✅ Already fixed - prefix with underscore
```typescript
async check(_req: Request, res: Response<ApiResponse<HealthCheckResponse>>) {
```

---

### 9. **product.controller.ts** - Unused Parameter

**Error**:
```
error TS6133: 'req' is declared but its value is never read.
```

**Location**: Line 150

**Fix**: Prefix with underscore
```typescript
async someMethod(_req: Request, res: Response) {
```

---

## Integration Test Fixes

### 1. **category.api.test.ts** - Import Error

**Error**:
```
error TS1192: Module has no default export.
```

**Fix**: ✅ Already fixed
```typescript
// Before:
import app from '../../app';

// After:
import { createApp } from '../../app';
const app = createApp();
```

---

### 2. **transaction.api.test.ts & customer.api.test.ts** - Test Timeouts

**Issue**: Tests timeout after 10 seconds

**Root Cause**: Missing mock responses for database calls in specific tests

**Tests Affected**:
- `should return 400 if void reason missing` (line 249)
- `should return 400 if transaction already voided` (line 258)

**Fix**: Add mock database responses before making API calls

**Example**:
```typescript
it('should return 400 if void reason missing', async () => {
  // Add this:
  mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

  const response = await request(app)
    .put('/api/v1/transactions/txn-123/void')
    .send({})
    .expect(400);

  expect(response.body.success).toBe(false);
});
```

---

### 3. **All Integration Tests** - Cleanup

**Fix**: ✅ Already added
```typescript
afterAll(() => {
  jest.restoreAllMocks();
});
```

---

## Implementation Checklist

### Phase 1: TypeScript Type Fixes (1-2 hours)

- [ ] **api.types.ts**: Add `PaginatedResponse<T>` interface
- [ ] **auth.service.ts**:
  - [ ] Fix JWT signing type issues (lines 110, 114)
  - [ ] Remove unused `User` import
- [ ] **inventory.service.ts**:
  - [ ] Remove `PaginatedResponse` import (if unused)
  - [ ] Remove `AdjustmentType` import (if unused)
- [ ] **inventory.controller.ts**: Update imports after api.types fix
- [ ] **category.controller.ts**:
  - [ ] Fix `UpdateCategoryRequest` to allow `null` for parent_category_id
  - [ ] Use or remove unused type imports
- [ ] **product.controller.ts**: Prefix unused `req` with underscore

### Phase 2: Integration Test Fixes (1-2 hours)

- [ ] **transaction.api.test.ts**:
  - [ ] Fix void tests - add mock responses
  - [ ] Review all tests for missing mocks
- [ ] **customer.api.test.ts**:
  - [ ] Review all tests for missing mocks
- [ ] **category.api.test.ts**: ✅ Already fixed

### Phase 3: Verification (30 min)

- [ ] Run `npm run build` - should succeed with no errors
- [ ] Run `npm test` - all tests should pass
- [ ] Run `npm run dev` - ensure still works
- [ ] Run `npm test:coverage` - check coverage levels

---

## Testing Strategy

**Before starting fixes**:
```bash
# Baseline
npm run build 2>&1 | tee build-errors-before.txt
npm test 2>&1 | tee test-results-before.txt
```

**After each fix**:
```bash
# Incremental validation
npm run build
npm test
```

**Final validation**:
```bash
# All checks
npm run build
npm test
npm run test:coverage
npm run dev  # Verify dev still works
```

---

## Success Criteria

✅ Phase complete when:
1. `npm run build` succeeds with 0 errors
2. All unit tests pass (41 tests)
3. All integration tests pass (25 tests)
4. `npm run dev` still works
5. Test coverage ≥ 85%

---

## Files to Modify

**Backend Type Definitions**:
- `backend/src/types/api.types.ts`
- `backend/src/types/category.types.ts`

**Backend Services**:
- `backend/src/services/auth.service.ts`
- `backend/src/services/inventory.service.ts`

**Backend Controllers**:
- `backend/src/controllers/category.controller.ts`
- `backend/src/controllers/inventory.controller.ts`
- `backend/src/controllers/product.controller.ts`
- `backend/src/controllers/health.controller.ts` ✅ Done

**Backend Tests**:
- `backend/src/__tests__/integration/transaction.api.test.ts` ✅ Partial
- `backend/src/__tests__/integration/customer.api.test.ts` ✅ Partial
- `backend/src/__tests__/integration/category.api.test.ts` ✅ Done

---

## Notes

- This cleanup is **not blocking** for Phase 3C implementation
- Development environment (`npm run dev`) works fine
- Unit tests pass - we can proceed with Phase 3C using unit tests
- This is a **separate task** to be tackled after Phase 3C is complete
- Estimated 3-4 hours for complete fix
- Can be broken into smaller PRs if needed

---

## Related Issues

- Integration tests have been failing since Phase 2 or earlier
- TypeScript strict mode has been effectively disabled via `--transpile-only`
- Production builds (`npm run build`) have been broken for multiple commits

---

**Created**: 2026-02-08
**Status**: Deferred until after Phase 3C
**Assigned**: Future cleanup task
