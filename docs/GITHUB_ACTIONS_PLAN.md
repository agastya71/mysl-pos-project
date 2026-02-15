# GitHub Actions CI/CD Implementation Plan

**Version:** 1.0
**Created:** February 14, 2026
**Status:** 📋 Planned (Not Yet Implemented)
**Estimated Effort:** 18 hours (2-3 days)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Phase 1: Repository Setup & Secrets](#phase-1-repository-setup--secrets)
4. [Phase 2: Server Build Workflow](#phase-2-server-build-workflow)
5. [Phase 3: Terminal Build Workflow](#phase-3-terminal-build-workflow)
6. [Phase 4: Release Workflow](#phase-4-release-workflow)
7. [Phase 5: CI/CD Testing](#phase-5-cicd-testing--pull-request-checks)
8. [Implementation Steps](#implementation-steps)
9. [Workflow Optimization](#workflow-optimization)
10. [Cost Optimization](#cost-optimization)
11. [Security Best Practices](#security-best-practices)
12. [Monitoring & Notifications](#monitoring--notifications)
13. [Expected Timeline](#expected-timeline)
14. [Success Criteria](#success-criteria)
15. [Future Enhancements](#future-enhancements)

---

## Overview

This document provides a complete plan for implementing GitHub Actions CI/CD workflows to automate building, testing, and releasing both server and terminal components of the POS System.

**Goals:**
- Automate Docker image builds for the server
- Automate Electron installer builds for terminals (Windows, macOS, Linux)
- Generate checksums for all artifacts
- Create GitHub releases automatically
- Run tests on pull requests
- Reduce manual release effort from hours to minutes

**Current State:**
- ✅ Manual builds using local scripts
- ✅ Docker images built with `scripts/build-server.sh`
- ✅ Terminal installers built with `scripts/build-terminal.sh`
- ❌ No automated CI/CD pipeline
- ❌ No automated releases

**Target State:**
- ✅ Push to `main` → Automatic builds
- ✅ Git tag → Complete release with all artifacts
- ✅ Pull requests → Automated tests
- ✅ Installers available in GitHub Releases
- ✅ Auto-update manifests generated

---

## Architecture

```
GitHub Push/Tag
    ↓
GitHub Actions Runners
    ├─→ Server Build (Docker images)
    │   ├─ Build multi-arch image (amd64, arm64)
    │   ├─ Push to GitHub Container Registry
    │   └─ Test with docker-compose
    │
    ├─→ Terminal Build (Windows/macOS/Linux)
    │   ├─ windows-latest → .exe installers
    │   ├─ macos-latest → .dmg + .zip (Intel + ARM)
    │   └─ ubuntu-latest → .AppImage + .deb
    │
    └─→ Release Creation (Artifacts + Checksums)
        ├─ Aggregate all artifacts
        ├─ Generate SHA256SUMS.txt
        ├─ Create GitHub release
        └─ Publish auto-update manifests
    ↓
GitHub Releases (Public downloads)
```

**Workflow Dependencies:**
```
[Push to main] ──→ [Server Build]
                   [Terminal Build (3 jobs in parallel)]
                            ↓
[Git Tag] ────────→ [Create Release] ──→ [Upload Artifacts]
```

---

## Phase 1: Repository Setup & Secrets

### 1.1 Repository Structure

Create the following directory structure:

```
.github/
├── workflows/
│   ├── server-build.yml           # Build Docker images
│   ├── terminal-build.yml         # Build Electron installers
│   ├── release.yml                # Create GitHub releases
│   └── ci.yml                     # Run tests on PR
├── actions/
│   ├── setup-node/                # Reusable Node.js setup
│   │   └── action.yml
│   └── setup-docker/              # Reusable Docker setup
│       └── action.yml
└── ISSUE_TEMPLATE/
    ├── bug_report.md
    └── feature_request.md
```

**Commands to create structure:**
```bash
cd /path/to/pos-system
mkdir -p .github/workflows
mkdir -p .github/actions/setup-node
mkdir -p .github/actions/setup-docker
mkdir -p .github/ISSUE_TEMPLATE
```

### 1.2 Required GitHub Secrets

**Navigate to:** Repository → Settings → Secrets and variables → Actions → New repository secret

**Essential Secrets (Start with these):**

| Secret Name | Description | How to Generate | Required For |
|-------------|-------------|-----------------|--------------|
| `DOCKER_USERNAME` | Docker Hub username | Your Docker Hub account | Server builds |
| `DOCKER_PASSWORD` | Docker Hub access token | Docker Hub → Account Settings → Security → New Access Token | Server builds |
| `GH_PAT` | GitHub Personal Access Token | GitHub → Settings → Developer settings → Personal access tokens → Generate (with `repo` scope) | Release creation |

**Optional Secrets (Add later for code signing):**

| Secret Name | Description | How to Generate | Required For |
|-------------|-------------|-----------------|--------------|
| `CODE_SIGN_CERT_WIN` | Windows code signing cert (base64) | `cat certificate.pfx \| base64` | Windows signing |
| `CODE_SIGN_CERT_WIN_PASSWORD` | Certificate password | From certificate provider | Windows signing |
| `APPLE_ID` | Apple Developer ID email | Your Apple ID | macOS notarization |
| `APPLE_ID_PASSWORD` | App-specific password | Apple ID → Sign-In and Security → App-Specific Passwords | macOS notarization |
| `APPLE_TEAM_ID` | Apple Team ID | Apple Developer → Membership | macOS notarization |
| `CSC_LINK` | macOS certificate (base64 .p12) | `cat certificate.p12 \| base64` | macOS signing |
| `CSC_KEY_PASSWORD` | Certificate password | From certificate provider | macOS signing |
| `SLACK_WEBHOOK` | Slack webhook URL | Slack → Apps → Incoming Webhooks | Notifications |

**Security Notes:**
- ⚠️ Never commit secrets to repository
- ✅ Use GitHub Secrets for sensitive data
- ✅ Rotate secrets every 90 days
- ✅ Test without signing first, add signing later

### 1.3 GitHub Container Registry Setup

**Enable GHCR:**
1. Repository → Settings → Actions → General
2. Workflow permissions → Read and write permissions
3. Allow GitHub Actions to create and approve pull requests ✓

**Registry location:** `ghcr.io/<username>/pos-system`

---

## Phase 2: Server Build Workflow

### 2.1 Workflow File: `.github/workflows/server-build.yml`

**Purpose:** Build Docker images and push to GitHub Container Registry

**Triggers:**
- Push to `main` branch (when backend files change)
- Release tags (`v*`)
- Manual workflow dispatch

**File Location:** `.github/workflows/server-build.yml`

**Complete Workflow:**

```yaml
name: Server Build

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'schema/**'
      - 'docker-compose.production.yml'
      - 'backend/Dockerfile.production'
      - '.github/workflows/server-build.yml'
  release:
    types: [published]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/backend

jobs:
  build-server:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./backend/Dockerfile.production
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Test image
        run: |
          docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          docker run --rm ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} node --version

  test-stack:
    needs: build-server
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Create test environment
        run: |
          cp .env.production.template .env.production
          echo "DB_PASSWORD=test_password" >> .env.production
          echo "REDIS_PASSWORD=test_password" >> .env.production
          echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.production
          echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)" >> .env.production

      - name: Start services
        run: |
          docker compose -f docker-compose.production.yml up -d
          sleep 30

      - name: Check service health
        run: |
          docker compose -f docker-compose.production.yml ps
          curl -f http://localhost:3000/health || exit 1

      - name: View logs on failure
        if: failure()
        run: docker compose -f docker-compose.production.yml logs

      - name: Cleanup
        if: always()
        run: docker compose -f docker-compose.production.yml down -v
```

**Key Features:**
- ✅ Multi-architecture build (amd64 + arm64)
- ✅ Automatic tagging (branch, PR, semver, SHA)
- ✅ Layer caching for faster builds
- ✅ Health check verification
- ✅ Automatic cleanup

---

## Phase 3: Terminal Build Workflow

### 3.1 Workflow File: `.github/workflows/terminal-build.yml`

**Purpose:** Build Electron installers for all platforms

**Triggers:**
- Push to `main` branch (when pos-client files change)
- Release tags (`v*`)
- Manual workflow dispatch

**File Location:** `.github/workflows/terminal-build.yml`

**Complete Workflow:**

```yaml
name: Terminal Build

on:
  push:
    branches: [main]
    paths:
      - 'pos-client/**'
      - '.github/workflows/terminal-build.yml'
  release:
    types: [published]
  workflow_dispatch:

jobs:
  build-windows:
    runs-on: windows-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
          cache-dependency-path: pos-client/package-lock.json

      - name: Install dependencies
        working-directory: pos-client
        run: npm ci

      - name: Build application
        working-directory: pos-client
        run: npm run build

      - name: Build Windows installer
        working-directory: pos-client
        run: npm run build:win
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Generate checksums
        working-directory: pos-client/release
        run: |
          Get-ChildItem -Filter *.exe | ForEach-Object {
            $hash = Get-FileHash $_.FullName -Algorithm SHA256
            "$($hash.Hash)  $($_.Name)" | Out-File -Append SHA256SUMS-windows.txt -Encoding ASCII
          }

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: windows-installers
          path: |
            pos-client/release/*.exe
            pos-client/release/SHA256SUMS-windows.txt
          retention-days: 30

  build-macos:
    runs-on: macos-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
          cache-dependency-path: pos-client/package-lock.json

      - name: Install dependencies
        working-directory: pos-client
        run: npm ci

      - name: Build application
        working-directory: pos-client
        run: npm run build

      - name: Build macOS installer
        working-directory: pos-client
        run: npm run build:mac
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Uncomment for code signing:
          # CSC_LINK: ${{ secrets.CSC_LINK }}
          # CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
          # APPLE_ID: ${{ secrets.APPLE_ID }}
          # APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
          # APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

      - name: Generate checksums
        working-directory: pos-client/release
        run: |
          shasum -a 256 *.dmg *.zip > SHA256SUMS-macos.txt

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: macos-installers
          path: |
            pos-client/release/*.dmg
            pos-client/release/*.zip
            pos-client/release/latest-mac.yml
            pos-client/release/SHA256SUMS-macos.txt
          retention-days: 30

  build-linux:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
          cache-dependency-path: pos-client/package-lock.json

      - name: Install dependencies
        working-directory: pos-client
        run: npm ci

      - name: Build application
        working-directory: pos-client
        run: npm run build

      - name: Build Linux installer
        working-directory: pos-client
        run: npm run build:linux
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Generate checksums
        working-directory: pos-client/release
        run: |
          shasum -a 256 *.AppImage *.deb > SHA256SUMS-linux.txt

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: linux-installers
          path: |
            pos-client/release/*.AppImage
            pos-client/release/*.deb
            pos-client/release/latest-linux.yml
            pos-client/release/SHA256SUMS-linux.txt
          retention-days: 30
```

**Key Features:**
- ✅ Parallel builds on native runners
- ✅ Platform-specific installers
- ✅ Automatic checksum generation
- ✅ Auto-update manifests (latest*.yml)
- ✅ Artifact retention (30 days)

---

## Phase 4: Release Workflow

### 4.1 Workflow File: `.github/workflows/release.yml`

**Purpose:** Create GitHub releases with all artifacts

**Triggers:**
- Git tag push (`v*`)

**File Location:** `.github/workflows/release.yml`

**Complete Workflow:**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  create-release:
    runs-on: ubuntu-latest
    outputs:
      upload_url: ${{ steps.create_release.outputs.upload_url }}
      version: ${{ steps.get_version.outputs.version }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get version from tag
        id: get_version
        run: echo "version=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Generate release notes
        id: release_notes
        run: |
          # Get previous tag
          PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")

          # Generate changelog
          if [ -z "$PREV_TAG" ]; then
            CHANGELOG=$(git log --pretty=format:"- %s" --no-merges)
          else
            CHANGELOG=$(git log ${PREV_TAG}..HEAD --pretty=format:"- %s" --no-merges)
          fi

          # Save to file
          cat > release_notes.md << EOF
          ## What's Changed

          ${CHANGELOG}

          ## Downloads

          Choose the installer for your platform:

          ### Windows
          - **POS-Terminal-Setup-${{ steps.get_version.outputs.version }}.exe** - Standard installer (recommended)
          - **POS-Terminal-Portable-${{ steps.get_version.outputs.version }}.exe** - Portable version (no installation)

          ### macOS
          - **POS-Terminal-${{ steps.get_version.outputs.version }}.dmg** - Intel Macs
          - **POS-Terminal-${{ steps.get_version.outputs.version }}-arm64.dmg** - Apple Silicon (M1/M2/M3)

          ### Linux
          - **POS-Terminal-${{ steps.get_version.outputs.version }}.AppImage** - Universal (all distros)
          - **pos-terminal_${{ steps.get_version.outputs.version }}_amd64.deb** - Debian/Ubuntu

          ### Verification
          Verify downloads with \`SHA256SUMS.txt\`

          ## Installation
          See [Terminal Installation Guide](docs/DEPLOYMENT_TERMINAL.md)

          ## Docker Images
          \`\`\`bash
          docker pull ghcr.io/${{ github.repository }}/backend:${{ steps.get_version.outputs.version }}
          \`\`\`

          **Full Changelog**: https://github.com/${{ github.repository }}/compare/${PREV_TAG}...v${{ steps.get_version.outputs.version }}
          EOF

      - name: Create Release
        id: create_release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: ${{ github.ref }}
          name: Release v${{ steps.get_version.outputs.version }}
          body_path: release_notes.md
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  upload-artifacts:
    needs: create-release
    runs-on: ubuntu-latest

    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts

      - name: Combine checksums
        run: |
          cd artifacts
          cat */SHA256SUMS-*.txt > SHA256SUMS.txt
          echo "Combined checksums:"
          cat SHA256SUMS.txt

      - name: Upload Windows installers
        uses: softprops/action-gh-release@v1
        with:
          tag_name: ${{ github.ref }}
          files: artifacts/windows-installers/*.exe
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload macOS installers
        uses: softprops/action-gh-release@v1
        with:
          tag_name: ${{ github.ref }}
          files: |
            artifacts/macos-installers/*.dmg
            artifacts/macos-installers/*.zip
            artifacts/macos-installers/latest-mac.yml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload Linux installers
        uses: softprops/action-gh-release@v1
        with:
          tag_name: ${{ github.ref }}
          files: |
            artifacts/linux-installers/*.AppImage
            artifacts/linux-installers/*.deb
            artifacts/linux-installers/latest-linux.yml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload checksums
        uses: softprops/action-gh-release@v1
        with:
          tag_name: ${{ github.ref }}
          files: artifacts/SHA256SUMS.txt
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Release Contents:**
- Windows: .exe installers
- macOS: .dmg + .zip (Intel + ARM)
- Linux: .AppImage + .deb
- SHA256SUMS.txt (combined)
- Auto-update manifests (latest*.yml)
- Auto-generated release notes

---

## Phase 5: CI/CD Testing & Pull Request Checks

### 5.1 Workflow File: `.github/workflows/ci.yml`

**Purpose:** Run tests and checks on pull requests

**File Location:** `.github/workflows/ci.yml`

**Complete Workflow:**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: pos_test
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: pos_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci

      - name: Run linter
        working-directory: backend
        run: npm run lint

      - name: Run unit tests
        working-directory: backend
        run: npm test
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: pos_test
          DB_USER: pos_test
          DB_PASSWORD: test_password
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          JWT_SECRET: test_secret
          JWT_REFRESH_SECRET: test_refresh_secret

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./backend/coverage/lcov.info
          flags: backend

  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
          cache-dependency-path: pos-client/package-lock.json

      - name: Install dependencies
        working-directory: pos-client
        run: npm ci

      - name: Run linter
        working-directory: pos-client
        run: npm run lint

      - name: Run tests
        working-directory: pos-client
        run: npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./pos-client/coverage/lcov.info
          flags: frontend

  build-verification:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Verify backend build
        working-directory: backend
        run: |
          npm ci
          npm run build

      - name: Verify frontend build
        working-directory: pos-client
        run: |
          npm ci
          npm run build

      - name: Test Docker build
        run: |
          docker build -f backend/Dockerfile.production -t pos-backend:test .
          docker run --rm pos-backend:test node --version
```

**Key Features:**
- ✅ Backend tests with PostgreSQL + Redis
- ✅ Frontend tests with coverage
- ✅ Linting verification
- ✅ Build verification
- ✅ Coverage reporting (Codecov)

---

## Implementation Steps

### Step 1: Prepare Repository (30 minutes)

```bash
cd /path/to/pos-system

# Create workflow directories
mkdir -p .github/workflows
mkdir -p .github/actions/setup-node
mkdir -p .github/actions/setup-docker
mkdir -p .github/ISSUE_TEMPLATE

# Create placeholder files
touch .github/workflows/server-build.yml
touch .github/workflows/terminal-build.yml
touch .github/workflows/release.yml
touch .github/workflows/ci.yml

# Add .gitignore entries
echo "" >> .gitignore
echo "# GitHub Actions artifacts" >> .gitignore
echo "artifacts/" >> .gitignore
```

### Step 2: Configure GitHub Secrets (30 minutes)

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add essential secrets:

**Start with these (minimum viable):**
```
DOCKER_USERNAME = <your-docker-hub-username>
DOCKER_PASSWORD = <docker-hub-access-token>
GH_PAT = <github-personal-access-token>
```

**Generate Docker Hub token:**
- https://hub.docker.com/settings/security
- Click "New Access Token"
- Name: "GitHub Actions"
- Copy token

**Generate GitHub PAT:**
- https://github.com/settings/tokens
- Click "Generate new token (classic)"
- Name: "POS System CI/CD"
- Select scope: `repo`
- Copy token

### Step 3: Create Workflow Files (3-4 hours)

Copy the complete YAML workflows from this document:

1. **Server Build** → `.github/workflows/server-build.yml`
2. **Terminal Build** → `.github/workflows/terminal-build.yml`
3. **Release** → `.github/workflows/release.yml`
4. **CI Tests** → `.github/workflows/ci.yml`

### Step 4: Test Locally with Act (1 hour)

**Install Act (GitHub Actions local testing):**

```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows (with Chocolatey)
choco install act-cli
```

**Create `.actrc` config:**
```bash
cat > .actrc << EOF
-P ubuntu-latest=catthehacker/ubuntu:act-latest
-P windows-latest=catthehacker/windows:act-latest
-P macos-latest=catthehacker/macos:act-latest
EOF
```

**Test workflows locally:**
```bash
# List available workflows
act -l

# Test server build (dry run)
act push -j build-server --dryrun

# Test CI workflow
act pull_request -j backend-tests

# Test with secrets
act -s DOCKER_USERNAME=<user> -s DOCKER_PASSWORD=<pass>
```

### Step 5: Commit and Test on GitHub (1 hour)

```bash
# Create feature branch
git checkout -b feature/github-actions

# Add workflow files
git add .github/

# Commit
git commit -m "feat: add GitHub Actions CI/CD workflows

- Add server build workflow (Docker multi-arch)
- Add terminal build workflow (Windows/macOS/Linux)
- Add release workflow (automated releases)
- Add CI workflow (PR tests)

Implements: GITHUB_ACTIONS_PLAN.md"

# Push to GitHub
git push -u origin feature/github-actions

# Create pull request
gh pr create --title "Add GitHub Actions CI/CD" \
             --body "Implements automated builds and releases per GITHUB_ACTIONS_PLAN.md"
```

**Monitor PR:**
- Go to GitHub → Actions tab
- Watch workflows run
- Fix any errors
- Merge PR when green

### Step 6: Create First Automated Release (30 minutes)

```bash
# Merge PR to main
git checkout main
git pull origin main

# Create release tag
git tag -a v1.0.1 -m "Release v1.0.1 - First automated release"

# Push tag
git push origin v1.0.1

# Monitor release workflow
# Go to: https://github.com/<user>/pos-system/actions
# Watch "Release" workflow execute
```

**Verify release:**
- Go to: https://github.com/<user>/pos-system/releases
- Should see "Release v1.0.1" with all installers
- Download and test an installer

### Step 7: Add Build Badges to README (15 minutes)

```bash
# Edit README.md
nano README.md
```

**Add at top:**
```markdown
# POS System

[![Server Build](https://github.com/<user>/pos-system/actions/workflows/server-build.yml/badge.svg)](https://github.com/<user>/pos-system/actions/workflows/server-build.yml)
[![Terminal Build](https://github.com/<user>/pos-system/actions/workflows/terminal-build.yml/badge.svg)](https://github.com/<user>/pos-system/actions/workflows/terminal-build.yml)
[![CI](https://github.com/<user>/pos-system/actions/workflows/ci.yml/badge.svg)](https://github.com/<user>/pos-system/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

...
```

---

## Workflow Optimization

### Caching Strategy

**NPM Dependencies:**
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 18
    cache: 'npm'
    cache-dependency-path: |
      backend/package-lock.json
      pos-client/package-lock.json
```

**Docker Layers:**
```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**Expected Speedup:**
- First build: 10-15 minutes
- Cached builds: 3-5 minutes (70% faster)

### Conditional Execution

**Skip builds when only docs change:**
```yaml
on:
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

**Build only affected components:**
```yaml
jobs:
  check-changes:
    outputs:
      backend: ${{ steps.filter.outputs.backend }}
      frontend: ${{ steps.filter.outputs.frontend }}
    steps:
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            backend:
              - 'backend/**'
            frontend:
              - 'pos-client/**'

  build-backend:
    needs: check-changes
    if: needs.check-changes.outputs.backend == 'true'
    # ... build steps
```

### Parallel Matrix Builds

**Test multiple Node versions:**
```yaml
strategy:
  matrix:
    node-version: [18, 20]
    os: [ubuntu-latest, windows-latest, macos-latest]

runs-on: ${{ matrix.os }}
```

---

## Cost Optimization

### GitHub Actions Minutes Usage

**Free Tier:** 2,000 minutes/month

**Estimated Usage:**

| Workflow | Duration | Triggers/Month | Total Minutes |
|----------|----------|----------------|---------------|
| Server Build | 10 min | 20 pushes | 200 min |
| Terminal Build | 30 min | 4 releases | 120 min |
| CI Tests | 15 min | 40 PRs | 600 min |
| **Total** | | | **920 min/month** |

**Percentage Used:** 46% of free tier

**Cost if exceeded:** $0.008/minute = $7.36 for additional 920 minutes

### Optimization Tips

1. **Cache Dependencies** (saves ~5 min per build)
2. **Conditional Execution** (skip unnecessary builds)
3. **Self-Hosted Runners** (for high-volume projects)
4. **Reduce Matrix Size** (test fewer combinations)

### Self-Hosted Runners (Advanced)

**For unlimited minutes:**

```yaml
jobs:
  build-server:
    runs-on: self-hosted
    labels: [linux, x64]
```

**Setup:**
1. Settings → Actions → Runners → New self-hosted runner
2. Follow instructions on your server
3. Update workflows to use `runs-on: self-hosted`

**Benefits:**
- ✅ Unlimited minutes
- ✅ Faster builds (local cache)
- ✅ Custom hardware

**Requirements:**
- Linux/Windows/macOS server
- Docker installed
- Network access to GitHub

---

## Security Best Practices

### 1. Secret Management

```yaml
# ✅ GOOD: Use GitHub Secrets
env:
  DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}

# ❌ BAD: Never hardcode secrets
env:
  DOCKER_PASSWORD: "mypassword123"
```

**Audit secrets regularly:**
- Settings → Secrets → Review access
- Remove unused secrets
- Rotate every 90 days

### 2. Workflow Permissions

```yaml
permissions:
  contents: read        # Read repo contents
  packages: write       # Push to GHCR
  pull-requests: read   # Read PR info
  # Principle of least privilege
```

### 3. Dependency Scanning

**Add to CI workflow:**
```yaml
- name: Run security audit
  run: |
    npm audit --audit-level=high
    npm audit fix --dry-run
```

**Use Dependabot:**
- Settings → Security → Dependabot
- Enable: Dependabot alerts
- Enable: Dependabot security updates

### 4. Code Signing

**Windows:**
- Get certificate from trusted CA
- Store as base64 secret
- Sign with `electron-builder`

**macOS:**
- Get Developer ID from Apple ($99/year)
- Notarize with Apple
- Users won't see security warnings

**Benefits:**
- ✅ No security warnings for users
- ✅ Trusted downloads
- ✅ Professional appearance

---

## Monitoring & Notifications

### Slack Notifications

**Add to workflow:**
```yaml
- name: Notify Slack on Failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "❌ Build Failed: ${{ github.workflow }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Build Failed*\n*Workflow:* ${{ github.workflow }}\n*Branch:* ${{ github.ref }}\n*Commit:* ${{ github.sha }}"
            }
          },
          {
            "type": "actions",
            "elements": [
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "View Logs"
                },
                "url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
              }
            ]
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

**Setup Slack Webhook:**
1. Slack → Apps → Incoming Webhooks
2. Create webhook for #deployments channel
3. Copy webhook URL
4. Add to GitHub Secrets as `SLACK_WEBHOOK`

### Email Notifications

**GitHub Settings:**
- Settings → Notifications → Actions
- Check: "Email me when a workflow run fails"

### Status Checks

**Require status checks before merge:**
1. Settings → Branches → main → Add rule
2. ☑ Require status checks to pass before merging
3. Select: CI, build-server, build-windows, etc.

---

## Expected Timeline

| Phase | Tasks | Estimated Time | Cumulative |
|-------|-------|---------------|------------|
| **Phase 1** | Repository setup + secrets configuration | 1 hour | 1 hour |
| **Phase 2** | Server build workflow creation + testing | 3 hours | 4 hours |
| **Phase 3** | Terminal build workflow (3 platforms) | 5 hours | 9 hours |
| **Phase 4** | Release workflow + automation | 3 hours | 12 hours |
| **Phase 5** | CI/CD test suite + PR checks | 2 hours | 14 hours |
| **Testing** | End-to-end verification + fixes | 2 hours | 16 hours |
| **Documentation** | Update guides + README badges | 2 hours | **18 hours** |

**Total Estimated Time:** 18 hours (2-3 days of focused work)

**Breakdown:**
- Day 1 (8 hours): Phase 1-2 (Setup + Server)
- Day 2 (8 hours): Phase 3 (Terminal builds)
- Day 3 (2 hours): Phase 4-5 + Testing + Docs

---

## Success Criteria

Your CI/CD implementation is successful when:

✅ **Automated Builds**
- [ ] Push to `main` triggers server build
- [ ] Docker image appears in GHCR
- [ ] Multi-arch images (amd64 + arm64) created
- [ ] Terminal installers build on all platforms

✅ **Automated Releases**
- [ ] Git tag triggers release workflow
- [ ] GitHub release created automatically
- [ ] All installers uploaded to release
- [ ] SHA256 checksums generated
- [ ] Auto-update manifests created (latest*.yml)

✅ **Quality Checks**
- [ ] Pull requests trigger CI tests
- [ ] Backend tests pass with PostgreSQL + Redis
- [ ] Frontend tests pass
- [ ] Linting checks pass
- [ ] Build verification passes

✅ **Documentation**
- [ ] Build badges in README
- [ ] Release notes auto-generated
- [ ] Installation guides updated
- [ ] CONTRIBUTING.md created

✅ **Notifications**
- [ ] Slack notified on failures
- [ ] Email sent on build failures
- [ ] Status checks visible in PRs

✅ **Performance**
- [ ] Builds complete in < 15 minutes
- [ ] Caching reduces repeat builds to < 5 minutes
- [ ] Monthly minute usage < 2,000 (free tier)

---

## Future Enhancements

### Phase 2 Improvements

1. **Automated Testing**
   - E2E tests with Playwright
   - Visual regression testing (Percy/Chromatic)
   - Performance benchmarks
   - Load testing

2. **Deployment Automation**
   - Auto-deploy to staging on main push
   - Blue-green deployments
   - Automatic rollback on failure
   - Canary releases

3. **Advanced Monitoring**
   - Sentry error tracking
   - Application performance monitoring (APM)
   - Usage analytics
   - Uptime monitoring (Pingdom/UptimeRobot)

4. **Security Enhancements**
   - CodeQL security scanning
   - Dependency vulnerability scanning (Snyk)
   - Container scanning (Trivy)
   - SAST/DAST testing

5. **Release Management**
   - Semantic versioning automation
   - Conventional commits enforcement
   - Automated changelog generation
   - Release candidate workflow

6. **Developer Experience**
   - Preview deployments for PRs
   - Automatic PR labels
   - Code review bot
   - Stale PR cleanup

---

## Troubleshooting

### Common Issues

#### Build Fails: "Docker push permission denied"

**Solution:**
```yaml
# Ensure workflow has packages permission
permissions:
  packages: write
```

#### Build Fails: "Secrets not found"

**Check:**
1. Secrets are correctly named (case-sensitive)
2. Secrets exist in repository settings
3. Workflows reference correct secret names

#### macOS Build Fails: "Notarization failed"

**Solution:**
- Skip notarization initially
- Comment out Apple ID env vars
- Add code signing later

#### Windows Build: "Code signing failed"

**Solution:**
```yaml
# Add to environment
env:
  CSC_IDENTITY_AUTO_DISCOVERY: false  # Disable auto-signing
```

#### Artifact Upload: "File not found"

**Check:**
- Build completed successfully
- File paths are correct
- Working directory is correct

```yaml
working-directory: pos-client
# Paths are relative to working-directory
```

---

## Reference Links

### GitHub Actions Documentation
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Events that trigger workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)
- [Encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

### Electron Builder
- [electron-builder](https://www.electron.build/)
- [Code Signing](https://www.electron.build/code-signing)
- [Auto Update](https://www.electron.build/auto-update)

### Docker
- [Multi-platform builds](https://docs.docker.com/build/building/multi-platform/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

## Appendix: Complete File List

When implementation is complete, you'll have:

```
.github/
├── workflows/
│   ├── server-build.yml          (~150 lines)
│   ├── terminal-build.yml        (~250 lines)
│   ├── release.yml               (~200 lines)
│   └── ci.yml                    (~150 lines)
├── actions/
│   ├── setup-node/
│   │   └── action.yml
│   └── setup-docker/
│       └── action.yml
└── ISSUE_TEMPLATE/
    ├── bug_report.md
    └── feature_request.md

README.md (updated with badges)
CONTRIBUTING.md (new)
docs/GITHUB_ACTIONS_PLAN.md (this file)
```

**Total:** ~750 lines of YAML configuration

---

## Conclusion

This plan provides a complete roadmap for implementing GitHub Actions CI/CD for the POS System. When implemented, it will:

- **Save time:** Automated builds (vs hours of manual work)
- **Improve quality:** Tests run on every PR
- **Simplify releases:** One git tag creates everything
- **Enable collaboration:** Contributors can easily test changes
- **Professional distribution:** Installers available in releases

**Next Steps:**
1. Review this plan with team
2. Allocate 2-3 days for implementation
3. Start with Phase 1 (setup)
4. Test each phase before moving forward
5. Iterate and improve based on usage

---

**Document Version:** 1.0
**Created:** February 14, 2026
**Author:** POS System Team
**Status:** 📋 Ready for Implementation
