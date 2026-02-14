# Integration Test Infrastructure Issues

**Date Identified:** 2026-02-13
**Status:** Technical Debt - Requires Rebuild
**Severity:** Medium (Core functionality verified via service layer tests)
**Estimated Fix Time:** 10-20 hours

---

## Executive Summary

All 59 integration tests (across 4 test suites) are failing with timeout errors. Investigation revealed that the issue is **architectural** - the integration test infrastructure has fundamental problems with server lifecycle management and request handling. The tests use proper mocking patterns but fail due to underlying test harness issues.

**Impact:**
- ❌ No integration tests passing (0/59)
- ✅ Service layer fully tested (31/31 passing, 86% coverage)
- ✅ Frontend fully tested (86/86 passing, 100%)
- ✅ **Core functionality works** - verified by passing service tests

---

## Test Failure Summary

### Affected Test Suites (All Failing)

| Test Suite | Tests | Status | Failure Type |
|------------|-------|--------|--------------|
| `category.api.test.ts` | 12 | ❌ 0/12 passing | Timeout (10s) |
| `customer.api.test.ts` | 11 | ❌ 0/11 passing | Timeout (10s) |
| `transaction.api.test.ts` | 11 | ❌ 0/11 passing | Timeout (111s) |
| `purchaseOrder.api.test.ts` | 25* | ❌ 21/25 failing | Timeout (291s) |

*4 tests manually skipped due to known timeouts

**Total:** 59 tests failing, 4 skipped, 0 passing

---

## Root Cause Analysis

### Primary Issue: TCPSERVERWRAP (Server Not Closing)

**Evidence:**
- `--detectOpenHandles` flag identifies `TCPSERVERWRAP` on every test
- Each test creates an Express app/server that never closes
- Tests timeout waiting for requests that never complete
- Server processes remain open after test completion

**Why It Happens:**
1. Tests create Express app in `beforeAll()`
2. Supertest makes HTTP requests to the app
3. Express server is created but never explicitly closed
4. Server keeps Node process alive, preventing test completion
5. Jest times out waiting for cleanup

### Secondary Issues

**1. Request Handling Problems**
- Supertest requests timeout waiting for responses
- Suggests routes aren't processing requests correctly
- Middleware may be blocking request flow
- Controllers may not be sending responses

**2. Mock Setup Issues**
- Database mocks (pool.connect, pool.query) are configured
- But services may not be using mocks correctly
- Possible connection to real database attempts
- Mock chains may be incomplete for complex operations

**3. Async Resource Cleanup**
- Tests don't properly clean up async operations
- Database connections, timers, or promises not resolved
- `jest.clearAllMocks()` not sufficient for cleanup

---

## Investigation Timeline

**Time Invested:** 4 hours
**Key Findings:**

1. ✅ **TypeScript Issues Fixed** (30 min)
   - Fixed vendor controller return statements
   - Compilation now succeeds with 0 errors

2. ✅ **Root Cause Identified** (2 hours)
   - Discovered tests were attempting real DB connections
   - Found TCPSERVERWRAP issue via --detectOpenHandles
   - Identified server lifecycle management problem

3. ❌ **Fix Attempts Failed** (1.5 hours)
   - Rewrote category test with proper mocking pattern
   - Added server.listen() and server.close() management
   - Tests still timeout even with fixes
   - Issue is deeper than individual test fixes

---

## Current Test Setup (Problematic Pattern)

### What Tests Currently Do

```typescript
describe('Category API Integration Tests', () => {
  let app: express.Application;
  let mockClient: any;
  let server: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/categories', categoryRoutes);

    // Issue: Server created but not properly managed
    server = app.listen(0);
  });

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock) = jest.fn().mockResolvedValue(mockClient);
  });

  afterAll((done) => {
    // Attempt to close, but doesn't prevent timeouts
    if (server) {
      server.close(done);
    }
  });

  it('should create category', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [mockData], rowCount: 1 });

    // Times out here - request never completes
    const response = await request(app)
      .post('/api/v1/categories')
      .send({ name: 'Test' })
      .expect(201);
  });
});
```

### Problems With This Pattern

1. **Server Management:** App/server lifecycle not properly handled by supertest
2. **Request Hanging:** HTTP requests timeout waiting for responses
3. **Resource Leaks:** Servers, connections, or timers stay open
4. **Mock Isolation:** Mocks may not be properly isolated between tests

---

## Comparison: What Works (Service Layer Tests)

Service layer tests (31/31 passing) use a different pattern:

```typescript
describe('CategoryService', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create category', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [mockData], rowCount: 1 });

    // Works - directly tests service without HTTP layer
    const result = await categoryService.createCategory(data);

    expect(result).toEqual(mockData);
  });
});
```

**Why This Works:**
- No HTTP server required
- Direct service calls
- Simpler mock setup
- Faster execution
- Proper cleanup

---

## Rebuild Plan

### Phase 1: Research & Design (2-3 hours)

**Tasks:**
1. Research best practices for Express/Supertest integration testing
2. Review successful patterns from other projects
3. Decide on test architecture:
   - Option A: Keep integration tests with proper supertest setup
   - Option B: Replace with E2E tests using test database
   - Option C: Expand service layer tests, reduce integration tests
4. Create proof-of-concept with 1 working integration test
5. Document the correct pattern

**Deliverable:** Test architecture decision document and working POC

### Phase 2: Fix Test Infrastructure (3-5 hours)

**Tasks:**
1. Create a base test utility module for common setup
2. Implement proper server lifecycle management:
   ```typescript
   // Proposed pattern (to be validated)
   import { createTestApp } from './utils/test-app';

   describe('Category API', () => {
     let app: express.Application;

     beforeAll(() => {
       app = createTestApp(); // Properly configured test app
     });

     afterAll(async () => {
       await cleanupTestResources(); // Proper cleanup
     });

     it('should work', async () => {
       // Supertest handles server lifecycle per-request
       await request(app).post('/api/v1/categories').send(data);
     });
   });
   ```
3. Fix middleware and route registration for tests
4. Ensure mocks are properly integrated with request flow
5. Add proper async cleanup mechanisms

**Deliverable:** Working test infrastructure utilities

### Phase 3: Rewrite Test Suites (4-6 hours)

**Tasks:**
1. Rewrite category.api.test.ts (12 tests) - 1 hour
2. Rewrite customer.api.test.ts (11 tests) - 1 hour
3. Rewrite transaction.api.test.ts (11 tests) - 1.5 hours
4. Rewrite purchaseOrder.api.test.ts (25 tests) - 2 hours
5. Verify all tests pass
6. Run with --detectOpenHandles to confirm no leaks

**Deliverable:** 59 passing integration tests

### Phase 4: Documentation & CI Integration (1-2 hours)

**Tasks:**
1. Document the correct integration test pattern
2. Create test templates for future endpoints
3. Update TESTING.md with integration test guidelines
4. Ensure tests run properly in CI/CD
5. Add pre-commit hook for test verification

**Deliverable:** Complete integration test documentation

---

## Alternative Approaches

### Option 1: Expand Service Layer Tests (Recommended Short-Term)

**Pros:**
- Service tests already work (31/31 passing)
- Faster execution than integration tests
- Easier to maintain
- Better isolation

**Cons:**
- Doesn't test HTTP layer
- Doesn't catch route configuration issues
- Doesn't test middleware

**Approach:**
1. Add more service layer test coverage for edge cases
2. Add unit tests for controllers (separate from HTTP)
3. Add unit tests for middleware
4. Use integration tests only for critical happy paths

**Estimated Time:** 2-3 hours
**Impact:** 90%+ coverage with faster, more reliable tests

### Option 2: E2E Tests with Test Database

**Pros:**
- Tests complete request flow
- No mocking required
- Tests against real database behavior
- Catches more integration issues

**Cons:**
- Slower execution
- Requires test database setup
- More complex setup/teardown
- Harder to isolate failures

**Approach:**
1. Set up test database (separate from dev/prod)
2. Use database transactions for test isolation
3. Seed test data before each test
4. Rollback transactions after tests
5. Use real HTTP requests (no mocks)

**Estimated Time:** 6-8 hours
**Impact:** True end-to-end confidence

### Option 3: Hybrid Approach (Recommended Long-Term)

**Combine:**
- **Service layer tests:** For business logic (fast, isolated)
- **Controller unit tests:** For request/response handling
- **Middleware unit tests:** For auth, validation, error handling
- **Minimal integration tests:** For critical happy paths only
- **E2E smoke tests:** For key user journeys

**Estimated Time:** 8-12 hours
**Impact:** Best balance of speed, coverage, and confidence

---

## Immediate Next Steps (Priority Order)

### High Priority (Do First)
1. ✅ **Document current state** (this document)
2. ✅ **Create rebuild plan** (this document)
3. ⏳ **Expand service layer test coverage** (2-3 hours)
   - Add edge case tests
   - Ensure 90%+ coverage on all services
   - Test error paths thoroughly

### Medium Priority (Next Sprint)
4. ⏳ **Add controller unit tests** (3-4 hours)
   - Test controllers without HTTP layer
   - Mock service layer
   - Test request validation and error handling

5. ⏳ **Add middleware unit tests** (2-3 hours)
   - Test authentication middleware
   - Test error handling middleware
   - Test request validation

### Low Priority (Future Sprint)
6. ⏳ **Rebuild integration test infrastructure** (10-20 hours)
   - Follow Phase 1-4 plan above
   - Or implement Option 1, 2, or 3

---

## Success Criteria

**When integration tests are fixed, we should have:**

1. ✅ All tests complete in < 30 seconds total
2. ✅ No timeout errors
3. ✅ No TCPSERVERWRAP warnings with --detectOpenHandles
4. ✅ Tests can run in parallel
5. ✅ Clean setup/teardown with no resource leaks
6. ✅ 85%+ test coverage maintained
7. ✅ Tests run successfully in CI/CD
8. ✅ Clear documentation for writing new tests

---

## References

**Related Files:**
- `backend/src/__tests__/integration/` - All integration test files
- `backend/src/__tests__/unit/services/` - Working service tests (reference)
- `TESTING.md` - Testing guide (needs update)
- `TYPESCRIPT_CLEANUP_PLAN.md` - Previous cleanup work

**Useful Resources:**
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Jest Async Testing](https://jestjs.io/docs/asynchronous)
- [Testing Express Apps](https://expressjs.com/en/guide/testing.html)

---

**Last Updated:** 2026-02-13
**Next Review:** When integration test rebuild is scheduled
**Owner:** Development Team
