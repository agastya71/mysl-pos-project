# Contributing to POS System

## Branch-Based Development Workflow

This project follows a branch-based development workflow. **Direct commits to the `main` branch are not allowed.**

## Getting Started

### 1. Create a Feature Branch

Always create a new branch for your changes:

```bash
# For new features
git checkout -b feature/your-feature-name

# For bug fixes
git checkout -b fix/bug-description

# For documentation
git checkout -b docs/what-you-are-documenting

# For architecture changes
git checkout -b arch/architecture-change
```

**Branch Naming Convention:**
- `feature/` - New features or enhancements
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `arch/` - Architecture changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

### 2. Make Your Changes

Work on your feature branch as normal:

```bash
# Make changes to files
# Stage your changes
git add .

# Commit your changes
git commit -m "type: description of changes"
```

**Commit Message Format:**
```
type: subject line (imperative, lowercase, no period)

Optional body with more details.
Can have multiple paragraphs.

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Commit Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `arch:` - Architecture changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 3. Push Your Branch

```bash
# Push your branch to remote
git push -u origin feature/your-feature-name
```

### 4. Create a Pull Request

1. Go to GitHub repository: https://github.com/agastya71/mysl-pos-project
2. Click "Pull requests" → "New pull request"
3. Select your branch as the source
4. Select `main` as the target
5. Fill in the PR template with:
   - Description of changes
   - Why the changes are needed
   - How to test the changes
6. Request review (if working in a team)
7. Wait for approval

### 5. Merge to Main

Once approved:
```bash
# Option 1: Merge via GitHub UI (recommended)
# Click "Merge pull request" on GitHub

# Option 2: Merge locally (if needed)
git checkout main
git pull origin main
git merge --no-ff feature/your-feature-name
git push origin main
```

### 6. Clean Up

After merging:
```bash
# Delete local branch
git branch -d feature/your-feature-name

# Delete remote branch
git push origin --delete feature/your-feature-name
```

## Protected Main Branch

A pre-commit hook prevents direct commits to `main`. If you try to commit directly to main, you'll see:

```
❌ ERROR: Direct commits to 'main' branch are not allowed!

Please create a feature branch instead:
  git checkout -b feature/your-feature-name
```

## Emergency Bypass (Not Recommended)

Only in emergencies (like fixing a critical production issue):

```bash
# Bypass the pre-commit hook
git commit --no-verify -m "hotfix: critical production fix"
```

**Note:** This should be used sparingly and only for genuine emergencies.

## Workflow Examples

### Example 1: Adding a New Feature

```bash
# Start from main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/add-customer-loyalty

# Make changes and commit
git add .
git commit -m "feat: add customer loyalty points system"

# Push to remote
git push -u origin feature/add-customer-loyalty

# Create PR on GitHub
# Wait for review and approval
# Merge via GitHub UI

# Clean up
git checkout main
git pull origin main
git branch -d feature/add-customer-loyalty
```

### Example 2: Fixing a Bug

```bash
# Create fix branch
git checkout -b fix/payment-calculation-error

# Fix the bug and commit
git add .
git commit -m "fix: correct payment calculation rounding error"

# Push and create PR
git push -u origin fix/payment-calculation-error

# Merge after approval
# Clean up
```

### Example 3: Updating Documentation

```bash
# Create docs branch
git checkout -b docs/update-api-endpoints

# Update documentation
git add .
git commit -m "docs: update API endpoint documentation with new parameters"

# Push and create PR
git push -u origin docs/update-api-endpoints
```

## Multiple Developers

If working with multiple developers:

1. **Always pull before creating a branch:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature
   ```

2. **Keep your branch up to date:**
   ```bash
   git checkout feature/your-feature
   git fetch origin
   git rebase origin/main
   ```

3. **Resolve conflicts locally before pushing**

4. **Use descriptive PR titles and descriptions**

5. **Request code reviews from team members**

## Git Configuration

Recommended git config for this project:

```bash
# Set your name and email
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Always create a merge commit (no fast-forward)
git config merge.ff false

# Pull with rebase by default
git config pull.rebase true

# Automatically setup remote branch
git config push.autoSetupRemote true
```

## GitHub Settings (Repository Owner)

To enforce branch protection on GitHub:

1. Go to repository Settings → Branches
2. Add branch protection rule for `main`:
   - ✅ Require pull request before merging
   - ✅ Require approvals (1 minimum)
   - ✅ Dismiss stale pull request approvals
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators (optional)

## Questions?

If you have questions about the workflow:
- Check this CONTRIBUTING.md file
- Review recent pull requests for examples
- Ask in team discussions

---

**Remember:** The `main` branch should always be in a deployable state. All development happens in feature branches.
