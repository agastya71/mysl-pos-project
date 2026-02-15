# GitHub Actions CI/CD Setup Guide

**Version:** 1.0
**Created:** February 15, 2026
**Status:** ✅ Workflows Created - Ready for Configuration

---

## Overview

This guide walks you through configuring GitHub Actions for automated builds and releases of the POS System. The workflows are already created in `.github/workflows/` and ready to use.

**What's Included:**
- ✅ **server-build.yml** - Builds Docker images for the backend (multi-arch: amd64, arm64)
- ✅ **terminal-build.yml** - Builds Electron installers (Windows, macOS, Linux)
- ✅ **release.yml** - Creates GitHub releases with all artifacts
- ✅ **ci.yml** - Runs tests on pull requests

---

## Quick Start (5 Steps)

### Step 1: Enable GitHub Container Registry (2 minutes)

1. Go to your GitHub repository: https://github.com/agastya71/mysl-pos-project
2. Click **Settings** → **Actions** → **General**
3. Scroll to **Workflow permissions**
4. Select **"Read and write permissions"**
5. Check **"Allow GitHub Actions to create and approve pull requests"**
6. Click **Save**

### Step 2: Verify Workflow Files (1 minute)

The workflows should already be visible in your repository:

1. Go to **Actions** tab
2. You should see 4 workflows:
   - ✅ CI
   - ✅ Release
   - ✅ Server Build
   - ✅ Terminal Build

If you don't see them, they'll appear after you commit and push the files.

### Step 3: Configure Package-Lock Files (CRITICAL)

⚠️ **IMPORTANT**: The workflows use `npm ci` which requires `package-lock.json` files.

**Generate package-lock files:**
```bash
cd /Users/u0102180/Code/personal-project/pos-system

# Backend
cd backend
rm -f package-lock.json
npm install
# This creates package-lock.json

# Frontend
cd ../pos-client
rm -f package-lock.json
npm install
# This creates package-lock.json

# Commit both files
cd ..
git add backend/package-lock.json pos-client/package-lock.json
git commit -m "chore: add package-lock.json files for CI/CD"
```

### Step 4: Test the Workflows Locally (Optional but Recommended)

Before pushing, you can test workflows locally using `act`:

**Install act (macOS):**
```bash
brew install act
```

**Test CI workflow:**
```bash
cd /Users/u0102180/Code/personal-project/pos-system
act pull_request -W .github/workflows/ci.yml
```

**Note**: This will run in Docker on your machine and may take 10-20 minutes the first time.

### Step 5: Push and Verify

```bash
cd /Users/u0102180/Code/personal-project/pos-system
git add .github/workflows/ .gitignore
git commit -m "ci: add GitHub Actions workflows for automated builds

- Server build: Docker multi-arch images (amd64, arm64)
- Terminal build: Electron installers (Windows, macOS, Linux)
- Release: Automated releases with all artifacts
- CI: Test suite for pull requests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin main
```

**Verify workflows ran:**
1. Go to https://github.com/agastya71/mysl-pos-project/actions
2. Click on the latest workflow run
3. Check that all jobs completed successfully

---

## Workflow Triggers

### CI Workflow (ci.yml)
**Triggers:**
- ✅ Every push to `main`
- ✅ Every pull request to `main`

**What it does:**
- Runs backend tests (with PostgreSQL + Redis)
- Runs frontend tests
- Verifies builds (backend + frontend + Docker)
- Uploads coverage reports

**Duration:** ~5-7 minutes

### Server Build (server-build.yml)
**Triggers:**
- ✅ Push to `main` when backend/schema files change
- ✅ New release tag (`v*`)
- ✅ Manual trigger (workflow_dispatch)

**What it does:**
- Builds Docker image (multi-arch: amd64, arm64)
- Pushes to GitHub Container Registry (ghcr.io)
- Tests the image
- Verifies docker-compose stack

**Duration:** ~8-12 minutes

### Terminal Build (terminal-build.yml)
**Triggers:**
- ✅ Push to `main` when pos-client files change
- ✅ New release tag (`v*`)
- ✅ Manual trigger (workflow_dispatch)

**What it does:**
- Builds Windows installers (.exe)
- Builds macOS installers (.dmg, .zip)
- Builds Linux installers (.AppImage, .deb)
- Generates SHA256 checksums
- Uploads artifacts (retained for 30 days)

**Duration:** ~10-15 minutes per platform (runs in parallel)

### Release Workflow (release.yml)
**Triggers:**
- ✅ New git tag matching `v*` (e.g., `v1.0.1`)

**What it does:**
- Creates GitHub release with auto-generated notes
- Downloads all build artifacts
- Combines checksums into SHA256SUMS.txt
- Uploads all installers to release
- Publishes auto-update manifests

**Duration:** ~2-3 minutes (after builds complete)

---

## Creating a Release

### Method 1: Command Line (Recommended)

```bash
cd /Users/u0102180/Code/personal-project/pos-system

# Update version in package.json files
# backend/package.json: "version": "1.0.1"
# pos-client/package.json: "version": "1.0.1"

# Commit version bump
git add backend/package.json pos-client/package.json
git commit -m "chore: bump version to 1.0.1"
git push origin main

# Create and push tag
git tag v1.0.1
git push origin v1.0.1
```

**What happens:**
1. Server Build workflow runs (builds Docker images)
2. Terminal Build workflow runs (builds all installers)
3. Release workflow runs (creates GitHub release)
4. All artifacts appear in GitHub Releases

**Timeline:**
- 0 min: Tag pushed
- 0-15 min: Builds running
- ~15 min: Release published with all artifacts

### Method 2: GitHub UI

1. Go to https://github.com/agastya71/mysl-pos-project/releases
2. Click **"Draft a new release"**
3. Click **"Choose a tag"** → Enter `v1.0.1` → **"Create new tag"**
4. Enter release title: `Release v1.0.1`
5. Click **"Generate release notes"** (auto-fills changelog)
6. Click **"Publish release"**
7. Workflows will automatically build and upload artifacts

---

## Manual Workflow Triggers

You can manually trigger workflows from the GitHub UI:

1. Go to **Actions** tab
2. Select workflow (e.g., "Terminal Build")
3. Click **"Run workflow"** dropdown
4. Select branch (usually `main`)
5. Click **"Run workflow"** button

**Use cases:**
- Rebuild Docker image without code changes
- Regenerate installers for a specific platform
- Test workflow changes

---

## Monitoring Builds

### GitHub Actions Dashboard

**View all runs:**
- https://github.com/agastya71/mysl-pos-project/actions

**View specific workflow:**
- CI: https://github.com/agastya71/mysl-pos-project/actions/workflows/ci.yml
- Server Build: https://github.com/agastya71/mysl-pos-project/actions/workflows/server-build.yml
- Terminal Build: https://github.com/agastya71/mysl-pos-project/actions/workflows/terminal-build.yml
- Release: https://github.com/agastya71/mysl-pos-project/actions/workflows/release.yml

**Status badges:**
Add to README.md:
```markdown
![CI](https://github.com/agastya71/mysl-pos-project/actions/workflows/ci.yml/badge.svg)
![Server Build](https://github.com/agastya71/mysl-pos-project/actions/workflows/server-build.yml/badge.svg)
![Terminal Build](https://github.com/agastya71/mysl-pos-project/actions/workflows/terminal-build.yml/badge.svg)
```

### Email Notifications

By default, GitHub sends emails for:
- ✅ Workflow failures
- ✅ First workflow success after failures

**Configure notifications:**
- GitHub → Settings → Notifications → Actions

---

## Downloading Artifacts

### From Workflow Runs (Development Builds)

1. Go to **Actions** → Select workflow run
2. Scroll to **Artifacts** section
3. Download:
   - `windows-installers` (~95 MB)
   - `macos-installers` (~180 MB)
   - `linux-installers` (~100 MB)

**Retention:** 30 days

### From Releases (Production Builds)

1. Go to **Releases**: https://github.com/agastya71/mysl-pos-project/releases
2. Click on release (e.g., "v1.0.1")
3. Download installers under **Assets**
4. Download `SHA256SUMS.txt` for verification

**Verification:**
```bash
# macOS/Linux
shasum -a 256 -c SHA256SUMS.txt

# Windows (PowerShell)
Get-FileHash POS-Terminal-Setup-1.0.1.exe -Algorithm SHA256
# Compare with SHA256SUMS.txt
```

---

## Docker Images

### Pulling Images

**Latest from main branch:**
```bash
docker pull ghcr.io/agastya71/mysl-pos-project/backend:main
```

**Specific version:**
```bash
docker pull ghcr.io/agastya71/mysl-pos-project/backend:v1.0.1
docker pull ghcr.io/agastya71/mysl-pos-project/backend:1.0
```

**By commit SHA:**
```bash
docker pull ghcr.io/agastya71/mysl-pos-project/backend:sha-abc1234
```

### Using in Production

**Update docker-compose.production.yml:**
```yaml
services:
  backend:
    image: ghcr.io/agastya71/mysl-pos-project/backend:v1.0.1
    # ... rest of config
```

**Deploy:**
```bash
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
```

---

## Troubleshooting

### Workflow Fails: "npm ci requires package-lock.json"

**Solution:**
```bash
cd backend && npm install  # Creates package-lock.json
cd ../pos-client && npm install
git add */package-lock.json
git commit -m "chore: add package-lock.json"
git push
```

### Workflow Fails: "Permission denied to push to ghcr.io"

**Solution:**
1. Settings → Actions → General → Workflow permissions
2. Select "Read and write permissions"
3. Save and re-run workflow

### Build Fails: "Docker build timeout"

**Cause:** Multi-arch builds are slow on GitHub runners.

**Solution:**
- Builds use layer caching (faster after first run)
- First build may take 15-20 minutes
- Subsequent builds: 5-10 minutes

### macOS Build Fails: "Application not signed"

**This is expected.** Code signing requires Apple Developer certificates ($99/year).

**For testing:** Workflows will still produce unsigned installers that work on your own Mac.

**For production:**
1. Obtain Apple Developer certificates
2. Add secrets: `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_ID_PASSWORD`, `APPLE_TEAM_ID`
3. Uncomment code signing section in `terminal-build.yml`

### Windows Build Fails: "Application not signed"

**This is expected.** Code signing requires Windows certificates (starting at ~$200/year).

**For testing:** Workflows will still produce unsigned installers.
Users will see "Windows protected your PC" warning → Click "More info" → "Run anyway"

**For production:**
1. Obtain code signing certificate
2. Add secrets: `CODE_SIGN_CERT_WIN`, `CODE_SIGN_CERT_WIN_PASSWORD`
3. Update `terminal-build.yml` with signing configuration

### Release Artifacts Missing

**Cause:** Release workflow runs before build workflows complete.

**Solution:** Wait 15-20 minutes for builds, then re-run release workflow:
1. Actions → Release → Latest run
2. Click "Re-run all jobs"

---

## Cost Optimization

### GitHub Actions Minutes (Free Tier)

**Free tier includes:**
- 2,000 minutes/month for private repos
- Unlimited for public repos

**This project uses per workflow:**
- CI: ~6 minutes
- Server Build: ~10 minutes
- Terminal Build: ~30 minutes total (3 platforms × 10 min)
- Release: ~3 minutes

**Per release cycle:** ~49 minutes

**Monthly estimate:**
- 4 releases/month: ~196 minutes
- 20 commits/month (CI): ~120 minutes
- **Total: ~316 minutes/month** (well within free tier)

### Optimization Tips

1. **Use path filters** (already configured):
   - Server Build only runs when backend/ or schema/ change
   - Terminal Build only runs when pos-client/ changes

2. **Cache dependencies** (already configured):
   - npm cache speeds up installs
   - Docker layer cache speeds up builds

3. **Artifact retention**:
   - Currently: 30 days
   - Reduce to 7 days to save storage: `retention-days: 7`

---

## Next Steps

✅ **Phase 1 Complete:** Workflows created and ready
⏭️ **Phase 2:** Push workflows to GitHub
⏭️ **Phase 3:** Configure package-lock.json files
⏭️ **Phase 4:** Test first workflow run
⏭️ **Phase 5:** Create first automated release

---

## Support

**Issues with workflows:**
- Check workflow logs: Actions → Select run → View logs
- Review GITHUB_ACTIONS_PLAN.md for detailed explanations

**Questions:**
- GitHub Actions docs: https://docs.github.com/en/actions
- electron-builder CI docs: https://www.electron.build/ci

---

**GitHub Actions CI/CD is now ready!** 🎉

Push the workflows to GitHub to enable automated builds and releases.
