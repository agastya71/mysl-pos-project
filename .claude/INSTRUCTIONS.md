# Instructions for Claude Code

## 🚨 IMPORTANT - Read This First

Before starting ANY coding task on this project, you MUST read these three essential files:

### 1️⃣ `.claude/rules.md` - Coding Standards
Read this file to understand:
- Coding standards and best practices
- Security requirements (SQL injection prevention, input validation, etc.)
- TypeScript/JavaScript conventions
- React component guidelines
- Database design rules
- API design patterns
- Testing requirements
- Git commit conventions

**When to read:** Before writing any code, during code review

### 2️⃣ `.claude/context.md` - Project Context
Read this file to understand:
- What this project is (POS system for non-profit organizations)
- System architecture (three-tier, local-first)
- Technology stack (Node.js, TypeScript, PostgreSQL, React, Electron)
- Project structure and file organization
- Database schema overview (30 tables)
- API structure and conventions
- Naming conventions
- Business processes

**When to read:** When starting work, implementing new features, making architectural decisions

### 3️⃣ `.claude/prompts.md` - Task Guidance
Read this file to:
- Get pre-task checklists
- Find task-specific prompts (for APIs, database, React components, etc.)
- Learn anti-patterns to avoid
- Use progress check prompts
- Follow problem-solving steps
- Apply quality gates

**When to read:** At the start of each task, when stuck, before committing

## Quick Start Workflow

### Step 1: Understand the Task
- What am I building/fixing?
- What is the expected outcome?
- Are there acceptance criteria?

### Step 2: Read the Documentation
```bash
# Essential reading order:
1. .claude/context.md - Understand the project
2. .claude/rules.md - Learn the standards
3. .claude/prompts.md - Get task-specific guidance
4. docs/ARCHITECTURE.md - Review system design
5. Relevant docs in docs/architecture/ - Deep dive into specifics
```

### Step 3: Check Existing Code
- Is there similar functionality already implemented?
- What patterns are established in the codebase?
- Can I reuse existing components/services?

### Step 4: Plan the Implementation
- Which files need to be modified?
- What tests need to be written?
- What are the security implications?
- What edge cases exist?

### Step 5: Implement with Quality
- Follow TypeScript strict mode
- Validate all inputs
- Use parameterized queries
- Handle errors properly
- Write tests as you go
- Keep functions small and focused

### Step 6: Before Committing
```bash
# Run these checks:
npm test              # All tests must pass
npm run lint          # No linting errors
# Remove console.log and debugger statements
# Verify no secrets in code
# Write clear commit message (conventional commits format)
```

## Key Reminders

### Security First ✅
- Validate ALL user inputs
- Use parameterized queries (NEVER string concatenation in SQL)
- Never log sensitive data (passwords, tokens, card numbers)
- Follow PCI DSS guidelines (use Square SDK, never store card data)
- Implement proper authentication and authorization

### TypeScript Strict Mode ✅
- Always use explicit types
- No `any` type without justification
- Use interfaces for object shapes
- Use type for union/literal types

### Testing is Mandatory ✅
- Write unit tests for business logic
- Write integration tests for APIs
- Write E2E tests for critical flows
- Aim for 80%+ code coverage

### Follow the Architecture ✅
- Three-tier architecture (Presentation, Application, Data)
- Service layer pattern for business logic
- RESTful API conventions
- Repository pattern (optional, for data access)

### Local-First System ✅
- This system runs on LOCAL servers
- No cloud dependencies (except payment processing)
- Offline-capable POS terminals
- All data stored locally (PostgreSQL, Redis, local files)

## Common Tasks Quick Reference

### Creating an API Endpoint
1. Read `.claude/prompts.md` - "When Creating a New API Endpoint"
2. Check `docs/architecture/API_ENDPOINTS.md` for patterns
3. Define TypeScript types
4. Create validator schema
5. Implement service logic
6. Create controller
7. Add route
8. Write tests

### Creating a Database Table
1. Read `.claude/prompts.md` - "When Creating a Database Table"
2. Check `docs/architecture/DATA_MODEL.md` for schema
3. Check `schema/tables/` for examples
4. Use UUID for primary keys, snake_case for names
5. Create SQL file in `schema/tables/`
6. Create TypeScript types
7. Write migration
8. Update documentation

### Creating a React Component
1. Read `.claude/prompts.md` - "When Creating a React Component"
2. Check `docs/architecture/UI_UX_DESIGN.md` for design patterns
3. Define TypeScript interfaces for props
4. Create functional component
5. Extract complex logic into hooks
6. Add proper error boundaries
7. Write tests with React Testing Library

### Working with Payments
1. Read `.claude/prompts.md` - "When Working with Payments"
2. CRITICAL: NEVER store card data in database
3. Use Square SDK for all card processing
4. Store only payment reference IDs
5. Handle errors gracefully
6. Test in Square sandbox mode

## Emergency Procedures

### If You Break Something
1. Don't panic - assess the impact
2. Stop deployment if in progress
3. Rollback if already deployed
4. Document the issue clearly
5. Fix properly (understand root cause, write test, fix, verify)
6. Learn and improve (document incident, update tests)

## Getting Help

### When Stuck
1. Re-read the relevant documentation
2. Check for similar code in the codebase
3. Break the problem into smaller pieces
4. Test incrementally
5. Ask specific questions with context

### Resources
- `docs/ARCHITECTURE.md` - System overview
- `docs/GETTING_STARTED.md` - Setup guide
- `docs/IMPLEMENTATION_GUIDE.md` - Development roadmap
- `docs/architecture/` - Detailed docs
- `.claude/README.md` - Overview of .claude directory

## Final Checklist

Before considering any task complete:

- [ ] Code follows all standards in `.claude/rules.md`
- [ ] Implementation aligns with architecture in `.claude/context.md`
- [ ] All checklists from `.claude/prompts.md` completed
- [ ] All tests passing
- [ ] No linting errors
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Code reviewed

---

## Remember

**You are building a POS system for non-profit organizations.** Think about:
- Volunteer users with limited tech experience
- Donated goods with variable quality
- Tax receipt requirements for donors
- Budget constraints
- Need for reliable local operation

**Security is not optional.** Never compromise on:
- Input validation
- SQL injection prevention
- Sensitive data protection
- PCI DSS compliance
- Proper authentication/authorization

**Quality matters.** Always ensure:
- Clean, readable code
- Comprehensive tests
- Clear documentation
- Proper error handling
- Performance optimization

---

**Now you're ready to code! Build something amazing! 🚀**
