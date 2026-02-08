# Git Workflow - Quick Reference

⚠️ **IMPORTANT**: Always work on feature branches. Never commit directly to `main`.

---

## 🚀 Starting Work on a New Feature

### Option 1: Use Helper Script (Recommended)
```bash
./git-start-feature.sh phase-3b-inventory-adjustments
```

The script will:
- Switch to main and pull latest
- Create a new branch with proper naming
- Auto-detect branch type (feature/fix/test/docs)

### Option 2: Manual Process
```bash
# 1. Update main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/phase-3b-inventory-adjustments

# 3. Start working
# ... make changes ...
```

---

## 📝 Branch Naming Conventions

| Type | Prefix | Example |
|------|--------|---------|
| New Feature | `feature/` | `feature/phase-3b-inventory-adjustments` |
| Bug Fix | `fix/` | `fix/category-tree-rendering-bug` |
| Documentation | `docs/` | `docs/update-api-documentation` |
| Tests | `test/` | `test/add-category-integration-tests` |
| Refactoring | `refactor/` | `refactor/simplify-tree-builder` |
| Chore | `chore/` | `chore/update-dependencies` |

**Naming tips**:
- Use lowercase with hyphens
- Be descriptive but concise
- Include phase number if applicable
- Start with action verb when possible

---

## 💾 Committing Changes

### 1. Check Status
```bash
git status                  # See what changed
git diff                    # See detailed changes
git diff --stat             # See summary
```

### 2. Stage Files
```bash
# Stage specific files (recommended)
git add backend/src/services/inventory.service.ts
git add pos-client/src/pages/InventoryPage.tsx

# Stage all changes (use carefully)
git add .

# Stage all files in a directory
git add backend/src/services/
```

### 3. Commit
```bash
git commit -m "$(cat <<'EOF'
feat: implement inventory adjustments feature

Add complete inventory adjustment system:
- Create inventory_adjustments table with ADJ-XXXXXX numbering
- Implement InventoryService with validation
- Add frontend adjustment form and history view
- Prevent negative inventory with database constraint
- Add 20 unit tests (all passing)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## 📤 Pushing and Merging

### Push to Remote
```bash
# First push (creates remote branch)
git push -u origin feature/phase-3b-inventory-adjustments

# Subsequent pushes
git push
```

### Merge to Main

**Option A: Local Merge** (for solo work)
```bash
git checkout main
git merge feature/phase-3b-inventory-adjustments
git branch -d feature/phase-3b-inventory-adjustments
git push origin main
```

**Option B: Pull Request** (for team/review)
```bash
# Push branch to remote
git push -u origin feature/phase-3b-inventory-adjustments

# Then create PR on GitHub/GitLab
# Merge via web interface after approval
```

---

## ✍️ Commit Message Format

### Structure
```
type: brief description (50 chars or less)

Detailed explanation (72 chars per line):
- What changed
- Why it changed
- Important notes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Commit Types
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Adding or updating tests
- `refactor:` - Code refactoring (no behavior change)
- `chore:` - Maintenance (dependencies, config)
- `style:` - Code style changes (formatting, etc.)

### Examples

**Good Commit Messages**:
```
feat: add category tree view with expand/collapse

fix: prevent negative inventory in adjustments

test: add integration tests for category API

docs: update Phase 3B implementation guide
```

**Bad Commit Messages**:
```
update files
fixed bug
WIP
changes
```

---

## 🔧 Common Git Operations

### View History
```bash
git log --oneline -10           # Last 10 commits
git log --graph --oneline       # Visual branch graph
git show HEAD                   # Show last commit
```

### Undo Changes
```bash
# Unstage file (keep changes)
git restore --staged <file>

# Discard local changes (CAREFUL!)
git restore <file>

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes - DANGEROUS!)
git reset --hard HEAD~1
```

### Branch Management
```bash
git branch                      # List local branches
git branch -v                   # Show with last commit
git branch -d feature/old       # Delete merged branch
git branch -D feature/old       # Force delete branch
```

### Stash Changes
```bash
git stash                       # Stash current changes
git stash list                  # View stashed changes
git stash pop                   # Apply and remove stash
git stash apply                 # Apply but keep stash
```

---

## 🚨 Pre-Commit Hook

The repository has a pre-commit hook that **blocks direct commits to main**.

If you see this error:
```
❌ ERROR: Direct commits to 'main' branch are not allowed!
```

**Solution**: Create a feature branch:
```bash
git checkout -b feature/my-feature-name
git commit -m "your commit message"
```

**Bypass (NOT RECOMMENDED)**:
```bash
git commit --no-verify -m "message"
```

Only bypass the hook if you have a very good reason and understand the risks.

---

## 📋 Workflow Summary

```
1. ./git-start-feature.sh my-feature
2. Make changes + write tests
3. git add <files>
4. git commit -m "feat: description"
5. git push -u origin feature/my-feature
6. git checkout main && git merge feature/my-feature
7. git branch -d feature/my-feature
```

---

## 🆘 Troubleshooting

### "Branch already exists"
```bash
# Delete old branch
git branch -D feature/old-branch

# Or checkout existing
git checkout feature/existing-branch
```

### "Merge conflicts"
```bash
# See conflicted files
git status

# Edit files to resolve conflicts (look for <<<<<<<)
# Then:
git add <resolved-files>
git commit -m "merge: resolve conflicts"
```

### "Accidentally committed to main"
```bash
# Create branch from current state
git branch feature/emergency-branch

# Reset main to origin
git reset --hard origin/main

# Switch to new branch
git checkout feature/emergency-branch
```

### "Need to switch branches with uncommitted changes"
```bash
# Save changes temporarily
git stash

# Switch branch
git checkout other-branch

# Return and restore
git checkout original-branch
git stash pop
```

---

## 📚 Additional Resources

- [Git Documentation](https://git-scm.com/doc)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Branch Naming Conventions](https://dev.to/varbsan/a-simplified-convention-for-naming-branches-and-commits-in-git-il4)

---

**Remember**: Feature branches keep main stable and make collaboration easier! 🌿
