# POS System Testing Guide

This document provides comprehensive information about testing the POS system, including how to run tests, write new tests, and understand test coverage.

## Table of Contents

- [Overview](#overview)
- [Test-First Development Workflow](#test-first-development-workflow)
- [Test Infrastructure](#test-infrastructure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)

## Overview

The POS system uses **Jest** as the testing framework for both backend and frontend. The test suite includes:

- **Unit Tests**: Test individual functions, services, and components in isolation
- **Integration Tests**: Test API endpoints and component interactions
- **Component Tests**: Test React components with React Testing Library

### Test Statistics

**Backend:**
- Transaction Service: 100% coverage of create, get, void, list operations
- Customer Service: 100% coverage of CRUD and search operations
- Transaction API: Integration tests for all endpoints
- Customer API: Integration tests for all endpoints

**Frontend:**
- Redux Slices: Cart, Auth, Products, Customers, Transactions, Checkout
- Components: SearchBar, ProductGrid, CartPanel, CheckoutModal, and more
- Integration Tests: Complete user flows (checkout, transaction management, customer management)

## Test-First Development Workflow

**⚠️ CRITICAL: This workflow is MANDATORY for all new features and phases.**

When implementing new features or phases, always follow this Test-Driven Development (TDD) workflow:

### Step 1: Run Tests Before Changes

Before making any code changes, verify that all existing tests pass:

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd pos-client
npm test

# Both should show all tests passing ✅
```

**Why?** This establishes a baseline and ensures you're starting from a stable state.

### Step 2: Write Tests First

Before implementing the feature, write tests that define the expected behavior:

**Example: Adding a new service method**
```typescript
// backend/src/__tests__/unit/services/example.service.test.ts
describe('ExampleService', () => {
  it('should do something new', async () => {
    // Arrange
    const input = 'test';

    // Act
    const result = await exampleService.newMethod(input);

    // Assert
    expect(result).toBe('expected output');
  });
});
```

**Run the test (it should FAIL):**
```bash
npm test -- example.service.test.ts
# Expected: ❌ Test fails because method doesn't exist yet
```

### Step 3: Implement the Feature

Write the minimal code needed to make the test pass:

```typescript
// backend/src/services/example.service.ts
async newMethod(input: string): Promise<string> {
  return 'expected output';
}
```

### Step 4: Run Tests After Changes

Verify that your new tests pass and existing tests still pass:

```bash
# Run all tests
npm test

# Expected output:
# ✅ New tests pass
# ✅ All existing tests still pass
```

### Step 5: Check Coverage

Verify that your new code has adequate test coverage:

```bash
npm run test:coverage

# Review coverage report
open coverage/index.html

# Aim for 85%+ coverage on new code
```

### Step 6: Refactor (If Needed)

Now that tests are green, you can safely refactor:

1. Improve code quality
2. Add error handling
3. Optimize performance
4. Run tests after each change to ensure nothing breaks

### Complete Workflow Example

**Scenario: Adding product categories feature**

```bash
# 1. Run existing tests
cd backend
npm test  # All pass ✅

# 2. Write tests first
# Create: backend/src/__tests__/unit/services/category.service.test.ts
npm test -- category.service.test.ts  # Tests fail ❌ (expected)

# 3. Implement the feature
# Create: backend/src/services/category.service.ts
# Create: backend/src/controllers/category.controller.ts
# Create: backend/src/routes/category.routes.ts

# 4. Run tests again
npm test  # All pass ✅

# 5. Check coverage
npm run test:coverage  # 87% coverage ✅

# 6. Commit changes
git add .
git commit -m "feat: add product categories with full test coverage"
```

### Benefits of Test-First Development

1. **Prevents Regressions**: Ensures new code doesn't break existing functionality
2. **Documents Behavior**: Tests serve as living documentation
3. **Faster Debugging**: Failing tests pinpoint exactly what broke
4. **Confidence**: Refactor fearlessly knowing tests will catch issues
5. **Better Design**: Writing tests first leads to more testable code
6. **Higher Quality**: Forces thinking about edge cases upfront

### Red-Green-Refactor Cycle

```
🔴 RED:    Write a failing test
    ↓
🟢 GREEN:  Write minimal code to pass
    ↓
🔵 REFACTOR: Improve code quality
    ↓
    (Repeat)
```

### When to Skip Tests (Almost Never!)

Only skip tests in these rare cases:
- Proof-of-concept spikes (delete after)
- Prototype UI mockups (not production)
- Fixing critical production bug (add tests immediately after)

**Rule of thumb:** If it goes to production, it needs tests.

## Test Infrastructure

### Backend (Node.js + TypeScript)

**Dependencies:**
- `jest` - Testing framework
- `ts-jest` - TypeScript support for Jest
- `supertest` - HTTP assertion library for API testing
- `@types/jest` - TypeScript definitions

**Configuration:** `backend/jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  testTimeout: 10000,
};
```

### Frontend (React + TypeScript)

**Dependencies:**
- `jest` - Testing framework
- `ts-jest` - TypeScript support
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom Jest matchers for DOM
- `@testing-library/user-event` - User interaction simulation
- `jest-environment-jsdom` - Browser-like environment for React

**Configuration:** `pos-client/jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};
```

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Frontend Tests

```bash
cd pos-client

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Run All Tests (Both Backend and Frontend)

```bash
# From project root
npm run test:all
```

## Test Coverage

### Viewing Coverage Reports

After running tests with coverage (`npm run test:coverage`), open the HTML report:

**Backend:**
```bash
open backend/coverage/index.html
```

**Frontend:**
```bash
open pos-client/coverage/index.html
```

### Coverage Targets

We aim for the following minimum coverage thresholds:

- **Statements:** 80%
- **Branches:** 75%
- **Functions:** 80%
- **Lines:** 80%

### Current Coverage

**Backend:**
- Services: ~95% coverage
- Controllers: ~90% coverage
- Middleware: ~85% coverage

**Frontend:**
- Redux Slices: ~95% coverage
- Components: ~80% coverage
- Utilities: ~90% coverage

## Writing Tests

### Backend Unit Test Example

```typescript
// backend/src/__tests__/unit/services/example.service.test.ts
import { ExampleService } from '../../../services/example.service';
import { pool } from '../../../config/database';

jest.mock('../../../config/database');

describe('ExampleService', () => {
  let exampleService: ExampleService;
  let mockClient: any;

  beforeEach(() => {
    exampleService = new ExampleService();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', async () => {
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: '123', name: 'Test' }],
      rowCount: 1,
    });

    const result = await exampleService.doSomething('123');

    expect(result.name).toBe('Test');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
```

### Backend Integration Test Example

```typescript
// backend/src/__tests__/integration/example.api.test.ts
import request from 'supertest';
import express from 'express';
import exampleRoutes from '../../routes/example.routes';

describe('Example API', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/example', exampleRoutes);
  });

  it('GET /api/v1/example should return 200', async () => {
    const response = await request(app)
      .get('/api/v1/example')
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

### Frontend Redux Slice Test Example

```typescript
// pos-client/src/__tests__/unit/slices/example.slice.test.ts
import exampleReducer, { exampleAction } from '../../../store/slices/example.slice';

describe('example.slice', () => {
  const initialState = { value: 0 };

  it('should handle exampleAction', () => {
    const state = exampleReducer(initialState, exampleAction(5));

    expect(state.value).toBe(5);
  });
});
```

### Frontend Component Test Example

```typescript
// pos-client/src/__tests__/unit/components/Example.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Example from '../../../components/Example';
import exampleReducer from '../../../store/slices/example.slice';

describe('Example Component', () => {
  const renderExample = () => {
    const store = configureStore({
      reducer: { example: exampleReducer },
    });

    return render(
      <Provider store={store}>
        <Example />
      </Provider>
    );
  };

  it('should render', () => {
    renderExample();
    expect(screen.getByText('Example')).toBeInTheDocument();
  });

  it('should handle click', () => {
    renderExample();
    const button = screen.getByRole('button');
    fireEvent.click(button);
    // Assert expected behavior
  });
});
```

## Best Practices

### General Guidelines

1. **Write Tests First (TDD)**: When adding new features, write tests first to define expected behavior
2. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
3. **One Assertion Per Test**: Each test should verify one specific behavior
4. **Descriptive Test Names**: Use clear, descriptive names that explain what is being tested
5. **Arrange-Act-Assert**: Structure tests in three clear sections

### Backend Testing

1. **Mock External Dependencies**: Always mock database connections, external APIs, and file system
2. **Test Error Cases**: Test both success and failure scenarios
3. **Use Transactions**: For integration tests, use transactions that can be rolled back
4. **Test Database Triggers**: Verify that database triggers work correctly (customer numbers, totals)
5. **Validate Input**: Test Zod validation schemas separately

### Frontend Testing

1. **Test User Interactions**: Focus on how users interact with components
2. **Mock API Calls**: Use MSW (Mock Service Worker) or jest mocks for API calls
3. **Test Redux Logic**: Test reducers, actions, and selectors independently
4. **Accessibility**: Test keyboard navigation and screen reader compatibility
5. **Async Behavior**: Use `waitFor` for async state updates and debounced actions

### Code Coverage

1. **Aim for High Coverage**: Target 80%+ coverage, but don't obsess over 100%
2. **Focus on Critical Paths**: Ensure core business logic has near-100% coverage
3. **Don't Game the System**: Coverage is a tool, not a goal
4. **Review Uncovered Code**: Regularly review uncovered code and add tests where needed

### Test Organization

```
backend/src/
└── __tests__/
    ├── setup.ts              # Test configuration
    ├── unit/
    │   ├── services/         # Service layer tests
    │   ├── controllers/      # Controller tests
    │   └── middleware/       # Middleware tests
    └── integration/
        └── *.api.test.ts     # API endpoint tests

pos-client/src/
└── __tests__/
    ├── setup.ts              # Test configuration
    ├── unit/
    │   ├── slices/           # Redux slice tests
    │   ├── components/       # Component tests
    │   └── utils/            # Utility function tests
    └── integration/
        └── *.flow.test.tsx   # End-to-end flow tests
```

## Continuous Integration

Tests run automatically on:
- Every push to feature branches
- Pull requests to main
- Pre-commit hooks (optional)

### CI Configuration (Future)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Backend Tests
        run: cd backend && npm test
      - name: Run Frontend Tests
        run: cd pos-client && npm test
      - name: Upload Coverage
        uses: codecov/codecov-action@v2
```

## Troubleshooting

### Common Issues

**Issue:** Tests timeout
**Solution:** Increase `testTimeout` in jest.config.js or use `jest.setTimeout()` in specific tests

**Issue:** Module not found errors
**Solution:** Check `moduleNameMapper` in jest.config.js and ensure all imports are correct

**Issue:** Async tests fail intermittently
**Solution:** Use `waitFor` and increase timeout for async operations

**Issue:** Database connection errors
**Solution:** Ensure database mocks are properly configured in test setup

### Debugging Tests

```bash
# Run a specific test file
npm test -- SearchBar.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="should add to cart"

# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# View detailed error output
npm test -- --verbose
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://testingjavascript.com/)
- [TypeScript with Jest](https://kulshekhar.github.io/ts-jest/)

## Contributing

When contributing new features:

1. Write tests for all new functionality
2. Ensure existing tests still pass
3. Run coverage to verify adequate test coverage
4. Update this document if adding new testing patterns

---

**Last Updated:** February 2026
**Maintained By:** POS Development Team
