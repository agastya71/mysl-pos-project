# Agent Prompts and Guidelines

This document provides prompts and guidelines to keep the coding agent focused and aligned with project objectives.

## Core Mission

You are building a **Point of Sale (POS) system for non-profit organizations**. Your primary objectives are:

1. **Security First:** Never compromise on security - validate inputs, prevent SQL injection, protect sensitive data
2. **Code Quality:** Write clean, maintainable, well-tested TypeScript code
3. **Follow Architecture:** Adhere to the three-tier architecture and established patterns
4. **Non-Profit Focus:** Keep features relevant to thrift stores and donation centers
5. **Local-First:** System runs on local servers with minimal internet dependency

## Before Starting Any Task

### Pre-Task Checklist
Ask yourself these questions before coding:

1. **Have I read the relevant documentation?**
   - Check `docs/ARCHITECTURE.md` for system design
   - Review `docs/architecture/DATA_MODEL.md` for database schema
   - Consult `docs/architecture/API_ENDPOINTS.md` for API patterns
   - Read `.claude/rules.md` for coding standards
   - Review `.claude/context.md` for project context

2. **Do I understand the requirement?**
   - What problem am I solving?
   - What is the expected outcome?
   - Are there any edge cases?
   - What are the acceptance criteria?

3. **Have I checked for existing code?**
   - Is there similar functionality already implemented?
   - Can I reuse existing components/services?
   - What patterns are already established?

4. **What files will I need to modify?**
   - Backend: Which controllers, services, models?
   - Frontend: Which components, pages, services?
   - Database: Do I need schema changes?
   - Tests: What tests need to be added/updated?

5. **What are the security implications?**
   - Am I validating all inputs?
   - Am I using parameterized queries?
   - Am I handling errors properly?
   - Am I logging sensitive data?

## Task-Specific Prompts

### When Creating a New API Endpoint

**Prompt:**
```
I am creating a new API endpoint: [METHOD] /api/v1/[resource]/[action]

Pre-implementation checklist:
1. ✓ Reviewed similar endpoints in the codebase
2. ✓ Checked API_ENDPOINTS.md for naming conventions
3. ✓ Planned request/response format
4. ✓ Identified required validation rules
5. ✓ Determined authentication/authorization requirements
6. ✓ Planned error scenarios and responses

Implementation plan:
1. Define TypeScript types/interfaces
2. Create validator schema (Zod/Joi)
3. Implement service layer logic
4. Create controller method
5. Add route definition
6. Write unit tests
7. Write integration tests
8. Update API documentation
```

**Remember:**
- Use proper HTTP method (GET, POST, PUT, DELETE)
- Return consistent response format (success/error structure)
- Validate ALL inputs
- Use appropriate status codes (200, 201, 400, 401, 404, 500)
- Add authentication middleware
- Check user permissions (RBAC)
- Handle errors gracefully
- Log important events

### When Creating a Database Table

**Prompt:**
```
I am creating a new database table: [table_name]

Pre-implementation checklist:
1. ✓ Reviewed existing schema in schema/tables/
2. ✓ Checked DATA_MODEL.md for naming conventions
3. ✓ Identified relationships with existing tables
4. ✓ Planned indexes for performance
5. ✓ Considered data retention and archival

Schema design:
- Table name: [snake_case]
- Primary key: UUID (gen_random_uuid())
- Foreign keys: [list with ON DELETE/UPDATE rules]
- Indexes: [list of indexed columns]
- Constraints: [NOT NULL, CHECK, UNIQUE constraints]
- Timestamps: created_at, updated_at (always include)
- Soft delete: deleted_at (if applicable)

Next steps:
1. Create SQL file in schema/tables/
2. Create TypeScript type/interface
3. Create database model (TypeORM/Prisma)
4. Create migration script
5. Update DATA_MODEL.md documentation
```

**Remember:**
- Use snake_case for table and column names
- Always use UUID for primary keys
- Define foreign key constraints
- Add indexes for foreign keys and frequently queried columns
- Include created_at and updated_at timestamps
- Use appropriate data types (DECIMAL for money, TIMESTAMP for dates)
- Add CHECK constraints for validation

### When Creating a React Component

**Prompt:**
```
I am creating a new React component: [ComponentName]

Pre-implementation checklist:
1. ✓ Reviewed similar components in the codebase
2. ✓ Identified required props and state
3. ✓ Determined if component should be presentational or container
4. ✓ Checked if I can reuse existing components
5. ✓ Reviewed UI_UX_DESIGN.md for design patterns

Component structure:
- Type: Presentational / Container
- Props: [list TypeScript interface]
- State: [list local state needs]
- Hooks: [list custom hooks to use]
- Styling: CSS Modules / Styled Components

Implementation plan:
1. Create TypeScript interface for props
2. Create functional component with proper typing
3. Implement component logic
4. Add proper error boundaries
5. Optimize with React.memo if needed
6. Write unit tests (React Testing Library)
7. Update Storybook (if applicable)
```

**Remember:**
- Use TypeScript with explicit prop types
- Use functional components with hooks
- Keep components small and focused (Single Responsibility)
- Extract complex logic into custom hooks
- Use proper dependency arrays in useEffect
- Avoid inline function definitions in JSX (use useCallback)
- Add loading and error states
- Make components accessible (ARIA attributes)

### When Implementing Business Logic

**Prompt:**
```
I am implementing business logic for: [feature_name]

Pre-implementation checklist:
1. ✓ Reviewed business requirements
2. ✓ Identified edge cases
3. ✓ Checked for existing similar logic
4. ✓ Planned transaction boundaries
5. ✓ Identified audit logging needs

Business rules:
- [List all business rules]
- [List validation rules]
- [List calculation formulas]

Error scenarios:
- [List possible error conditions]
- [List error messages]
- [List recovery strategies]

Implementation plan:
1. Create service class/module
2. Implement core business logic
3. Add input validation
4. Add error handling
5. Add transaction management
6. Add audit logging
7. Write comprehensive unit tests
8. Write integration tests
```

**Remember:**
- Validate all inputs at the service boundary
- Use database transactions for multi-step operations
- Handle all error scenarios explicitly
- Log important business events
- Don't mix business logic with HTTP logic
- Make functions pure when possible
- Keep functions small and testable
- Document complex business rules

### When Working with Payments

**Prompt:**
```
I am implementing payment functionality: [feature_name]

CRITICAL SECURITY CHECKS:
1. ✓ Verified I'm NOT storing card numbers in database
2. ✓ Confirmed I'm using Square SDK for card processing
3. ✓ Checked that sensitive data is not logged
4. ✓ Verified proper error handling for payment failures
5. ✓ Planned for idempotency (prevent duplicate charges)

PCI Compliance requirements:
- Card data NEVER stored in database
- Use Square tokenization
- Log only payment references (not card details)
- Use HTTPS for all communication
- Implement proper access controls

Implementation plan:
1. Use Square SDK for payment processing
2. Handle payment success/failure states
3. Store only payment reference IDs
4. Implement retry logic for failures
5. Add reconciliation tracking
6. Write tests with Square sandbox
```

**Remember:**
- NEVER log or store card numbers, CVV, or PINs
- Always use payment processor SDKs (Square)
- Handle payment failures gracefully
- Implement idempotency to prevent duplicate charges
- Add proper timeout handling
- Test thoroughly in sandbox mode
- Follow PCI DSS guidelines

### When Adding Tests

**Prompt:**
```
I am writing tests for: [feature/module_name]

Test coverage plan:
1. Unit tests:
   - [List functions/methods to test]
   - [List edge cases]
   - [List error scenarios]

2. Integration tests:
   - [List API endpoints to test]
   - [List database operations to test]

3. E2E tests (if applicable):
   - [List user workflows to test]

Test structure:
- Arrange: Set up test data and mocks
- Act: Execute the function/operation
- Assert: Verify expected outcomes

Mocking strategy:
- Mock external dependencies (database, APIs)
- Use test database for integration tests
- Use Square sandbox for payment tests
```

**Remember:**
- Write tests BEFORE or WHILE writing code (TDD)
- Test happy path AND error scenarios
- Use descriptive test names: "should return error when price is negative"
- Mock external dependencies in unit tests
- Use test database for integration tests
- Aim for 80%+ code coverage
- Don't test implementation details, test behavior
- Clean up test data after tests

## Common Anti-Patterns to Avoid

### ❌ NEVER DO THIS:

1. **Don't hardcode configuration**
   ```typescript
   // ❌ BAD
   const apiUrl = 'http://localhost:3000';

   // ✅ GOOD
   const apiUrl = process.env.API_URL;
   ```

2. **Don't use string concatenation in SQL**
   ```typescript
   // ❌ BAD
   db.query(`SELECT * FROM users WHERE id = ${userId}`);

   // ✅ GOOD
   db.query('SELECT * FROM users WHERE id = $1', [userId]);
   ```

3. **Don't ignore errors**
   ```typescript
   // ❌ BAD
   try {
       await saveData(data);
   } catch (error) {
       console.log('Error');
   }

   // ✅ GOOD
   try {
       await saveData(data);
   } catch (error) {
       logger.error('Failed to save data', { error, data });
       throw new DataSaveError('Could not save data', { cause: error });
   }
   ```

4. **Don't use `any` type**
   ```typescript
   // ❌ BAD
   function process(data: any) { }

   // ✅ GOOD
   function process(data: ProductData) { }
   ```

5. **Don't mutate state directly**
   ```typescript
   // ❌ BAD (React)
   state.items.push(newItem);

   // ✅ GOOD
   setState({ items: [...state.items, newItem] });
   ```

## Progress Check Prompts

### After Completing a Feature

**Self-Review Checklist:**
```
Feature: [feature_name]

Code Quality:
- [ ] Follows TypeScript strict mode
- [ ] Uses consistent naming conventions
- [ ] Functions are small and focused
- [ ] No code duplication
- [ ] Proper error handling implemented
- [ ] Proper logging added

Security:
- [ ] All inputs validated
- [ ] No SQL injection vulnerabilities
- [ ] Sensitive data not logged
- [ ] Authentication/authorization checked
- [ ] Proper access controls implemented

Testing:
- [ ] Unit tests written and passing
- [ ] Integration tests written (if applicable)
- [ ] Test coverage > 80%
- [ ] Edge cases tested
- [ ] Error scenarios tested

Documentation:
- [ ] Code comments added for complex logic
- [ ] API documentation updated
- [ ] README updated (if applicable)
- [ ] Type definitions documented

Performance:
- [ ] No obvious performance issues
- [ ] Database queries optimized
- [ ] Appropriate indexes exist
- [ ] No memory leaks

Ready for code review: Yes / No
```

### Daily Stand-Up Prompt

**Daily Check-In:**
```
Date: [date]

Yesterday:
- Completed: [list completed tasks]
- Challenges: [list challenges faced]

Today:
- Planning to work on: [list tasks]
- Need help with: [list blockers]

Notes:
- [Any important observations or learnings]
```

## When Stuck or Uncertain

### Problem-Solving Steps

1. **Clarify the Problem**
   - What exactly am I trying to achieve?
   - What is the expected behavior?
   - What is the current behavior?

2. **Check Documentation**
   - Is this covered in the architecture docs?
   - Is there an example in the codebase?
   - What do the API docs say?

3. **Review Similar Code**
   - How is this handled elsewhere in the codebase?
   - What patterns are already established?
   - Can I adapt existing code?

4. **Break It Down**
   - Can I split this into smaller tasks?
   - What is the simplest version that could work?
   - What can I test independently?

5. **Test Incrementally**
   - Write a failing test first
   - Implement minimum code to pass test
   - Refactor and improve
   - Repeat

6. **Ask for Help**
   - Document what I've tried
   - Prepare specific questions
   - Share relevant code/errors
   - Request code review

## Prioritization Guide

### Feature Priority Order

1. **Security Critical** - Authentication, authorization, payment security
2. **Core Functionality** - Must-have features for basic operation
3. **Data Integrity** - Validation, transactions, audit logging
4. **User Experience** - UI/UX improvements, performance
5. **Nice-to-Have** - Optional features, enhancements

### When to Refactor

**Refactor if:**
- Code is duplicated 3+ times
- Function is > 50 lines
- Component is > 200 lines
- Difficult to understand or test
- Performance is measurably poor

**Don't refactor if:**
- Code works and is clear
- No immediate benefit
- Close to deadline
- Would break existing tests
- Would require extensive changes

## Quality Gates

### Before Committing Code

```
Pre-commit Checklist:
- [ ] Code compiles without errors
- [ ] All tests pass (npm test)
- [ ] ESLint has no errors
- [ ] No console.log or debugger statements
- [ ] No commented-out code
- [ ] Sensitive data removed
- [ ] Commit message follows convention
- [ ] Changes are focused and atomic
```

### Before Creating PR

```
Pre-PR Checklist:
- [ ] All tests pass
- [ ] Test coverage maintained/improved
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Follows coding standards
- [ ] Security review completed
- [ ] Performance impact assessed
- [ ] Breaking changes documented
```

### Before Deploying

```
Pre-deployment Checklist:
- [ ] All PR reviews approved
- [ ] Integration tests pass
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Stakeholders notified
```

## Mindset Reminders

### Think Like a Non-Profit

**Remember the users:**
- Often volunteers with limited tech experience
- Working with donated goods (variable quality)
- Need to track donors for tax receipts
- Budget-conscious (avoid unnecessary costs)
- Need reliable local operation (limited internet)

### Think Like a Security Engineer

**Always ask:**
- Can this input be malicious?
- What if someone tries to bypass this?
- What sensitive data am I handling?
- What could go wrong in production?
- How will I know if something fails?

### Think Like a Maintainer

**Always consider:**
- Will I understand this code in 6 months?
- Can someone else easily modify this?
- Is this the simplest solution?
- Is this properly tested?
- Is this well-documented?

## Emergency Procedures

### If You Break Something

1. **Don't Panic**
   - Take a deep breath
   - Assess the impact

2. **Contain the Damage**
   - Stop the deployment if in progress
   - Rollback if already deployed
   - Notify the team immediately

3. **Document the Issue**
   - What broke?
   - What was changed?
   - What is the impact?
   - How to reproduce?

4. **Fix Properly**
   - Understand root cause
   - Write a test that fails
   - Fix the issue
   - Verify the test passes
   - Verify everything else still works

5. **Learn and Improve**
   - Document the incident
   - Update tests to catch this in future
   - Update documentation
   - Share learnings with team

## Final Reminders

### Always Remember

✅ **Security is not optional** - Validate everything
✅ **Tests are your safety net** - Write them first
✅ **Simple is better than clever** - Keep it readable
✅ **Consistency matters** - Follow established patterns
✅ **Documentation saves time** - Future you will thank you
✅ **Errors will happen** - Handle them gracefully
✅ **Users are non-technical** - Make it intuitive
✅ **Code is read more than written** - Optimize for readability

### Never Forget

❌ **Never commit secrets** - Use environment variables
❌ **Never store card data** - Use payment processor
❌ **Never concatenate SQL** - Use parameterized queries
❌ **Never ignore errors** - Log and handle properly
❌ **Never skip tests** - They catch bugs early
❌ **Never assume inputs are safe** - Validate everything
❌ **Never log sensitive data** - Protect user privacy
❌ **Never deploy untested code** - Test first, deploy second

---

## Stay Focused

**Current Phase:** Phase 1 - Core Functionality (see docs/IMPLEMENTATION_GUIDE.md)

**This Week's Priority:** [Update based on current sprint]

**Today's Focus:** [Update daily]

**Remember:** Build incrementally. Small, working features are better than incomplete large features. Ship early, ship often, gather feedback, improve.

---

**You've got this! Build something amazing for non-profits.** 🚀
