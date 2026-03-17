# Agent Prompts and Guidelines

## Core Mission

Building a **POS system for non-profit organizations** (thrift stores, donation centers). Priorities in order: security, correctness, code quality, architecture adherence.

## Pre-Task Checklist

Before coding, confirm:
1. Read relevant docs (`docs/ARCHITECTURE.md`, `docs/architecture/API_ENDPOINTS.md`, `docs/architecture/DATA_MODEL.md`)
2. Checked for existing similar functionality to reuse
3. Identified files to modify (controllers, services, models, tests)
4. Considered security implications (input validation, parameterized queries, error handling)

## Task-Specific Steps

### New API Endpoint
1. Define TypeScript types/interfaces
2. Write failing tests (TDD)
3. Create Zod validator schema
4. Implement service layer logic
5. Create controller method
6. Add route definition
7. Make tests pass
8. Update `docs/architecture/API_ENDPOINTS.md`

### New Database Table
1. Write failing tests (TDD)
2. Create SQL file in `schema/tables/` (UUID PK, snake_case, FK constraints, indexes, `created_at`/`updated_at`)
3. Create TypeScript interface in `models/`
4. Write migration script in `backend/src/database/`
5. Update `docs/architecture/DATA_MODEL_TABLES.md`

### New React Component
1. Write failing tests with React Testing Library (TDD)
2. Define TypeScript props interface
3. Create functional component
4. Extract complex logic into custom hooks
5. Make tests pass

### Payment Feature
1. Confirm card data will NOT be stored
2. Write failing tests against Square sandbox (TDD)
3. Use Square SDK exclusively for card processing
4. Store only payment reference IDs
5. Implement idempotency to prevent duplicate charges
6. Make tests pass

### Business Logic / Service
1. Write failing unit tests for all rules and edge cases (TDD)
2. Implement service class
3. Wrap multi-table operations in a database transaction
4. Add audit logging for sensitive operations
5. Make tests pass
