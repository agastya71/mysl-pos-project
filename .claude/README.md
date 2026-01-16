# .claude Configuration Directory

This directory contains configuration files that guide Claude Code when working on this project.

## Files in this Directory

### 1. rules.md
**Coding Rules and Standards**

Contains all coding standards, conventions, and rules that must be followed when writing code for this project. This includes:
- General coding principles (KISS, DRY, YAGNI)
- Security requirements
- TypeScript/JavaScript standards
- React component guidelines
- Database conventions
- API design standards
- Testing requirements
- Git commit conventions
- Prohibited practices

**When to reference:** Before writing any code, when unsure about coding style, during code review

### 2. context.md
**Project Context and Conventions**

Provides comprehensive project context including:
- Project overview and purpose
- System architecture
- Technology stack and dependencies
- Project structure
- Database schema overview
- API structure and conventions
- Naming conventions
- Environment variables
- Development phases
- Key business processes
- Performance targets
- Common patterns

**When to reference:** When starting work on the project, when implementing new features, when making architectural decisions

### 3. prompts.md
**Agent Guidance Prompts**

Contains prompts and checklists to keep the coding agent focused and on-task:
- Pre-task checklists
- Task-specific prompts (API endpoints, database tables, React components, etc.)
- Anti-patterns to avoid
- Progress check prompts
- Problem-solving steps
- Quality gates
- Emergency procedures

**When to reference:** At the start of each task, when stuck, before committing code, before creating PRs

### 4. settings.local.json
**Claude Code Settings**

Local configuration for Claude Code including permissions and custom instructions.

## How Claude Code Uses These Files

Claude Code will reference these files to:
1. **Understand project context** - From context.md
2. **Follow coding standards** - From rules.md
3. **Stay focused on tasks** - From prompts.md
4. **Make consistent decisions** - Using established patterns and conventions

## Custom Instructions

When working on this project, Claude Code should:

1. **Always read relevant documentation first**
   - Check rules.md for coding standards
   - Review context.md for project structure
   - Use prompts.md for task guidance

2. **Follow the established architecture**
   - Three-tier architecture (Presentation, Application, Data)
   - Service layer pattern
   - Repository pattern (optional)
   - RESTful API conventions

3. **Prioritize security**
   - Validate all inputs
   - Use parameterized queries
   - Never log sensitive data
   - Follow PCI DSS guidelines

4. **Write comprehensive tests**
   - Unit tests for business logic
   - Integration tests for APIs
   - E2E tests for critical flows
   - Aim for 80%+ coverage

5. **Maintain code quality**
   - TypeScript strict mode
   - Consistent naming conventions
   - Proper error handling
   - Clear documentation

## Quick Reference

### Before Starting Any Task
1. Read `.claude/prompts.md` - Pre-Task Checklist
2. Review relevant sections in `.claude/context.md`
3. Check `.claude/rules.md` for applicable standards
4. Review related documentation in `docs/`

### When Implementing Features
1. **API Endpoints** → Check `docs/architecture/API_ENDPOINTS.md` + `.claude/rules.md` (API Design section)
2. **Database Changes** → Check `docs/architecture/DATA_MODEL.md` + `.claude/rules.md` (Database section)
3. **React Components** → Check `docs/architecture/UI_UX_DESIGN.md` + `.claude/rules.md` (React section)
4. **Business Logic** → Check `.claude/context.md` (Key Business Processes) + `.claude/prompts.md`

### Before Committing
1. Run through Pre-commit Checklist in `.claude/prompts.md`
2. Verify adherence to `.claude/rules.md`
3. Ensure tests pass
4. Review changes one more time

## Updating These Files

These files should be updated when:
- New coding standards are adopted
- Architecture decisions change
- New technologies are added
- Lessons are learned from incidents
- Best practices evolve

**Process:**
1. Make changes to appropriate file(s)
2. Update this README if structure changes
3. Commit with clear description
4. Notify team of changes

## File Hierarchy

```
.claude/
├── README.md                 # This file - Overview of .claude directory
├── settings.local.json       # Claude Code local settings
├── rules.md                  # Coding rules and standards
├── context.md                # Project context and conventions
└── prompts.md                # Agent guidance prompts
```

## Additional Resources

For more detailed information, see:
- `docs/ARCHITECTURE.md` - System architecture overview
- `docs/GETTING_STARTED.md` - Development environment setup
- `docs/IMPLEMENTATION_GUIDE.md` - Phase-by-phase development plan
- `docs/architecture/` - Detailed architecture documentation
- `schema/` - Database schema SQL files

---

**Remember:** These files are your guide to working effectively on this project. Reference them often, keep them updated, and use them to maintain consistency and quality across the codebase.
