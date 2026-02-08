#!/bin/bash
# Git Start Feature - Helper script to start working on a new feature
# Usage: ./git-start-feature.sh <feature-name>
# Example: ./git-start-feature.sh phase-3b-inventory-adjustments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if feature name provided
if [ -z "$1" ]; then
  echo -e "${RED}❌ Error: Feature name required${NC}"
  echo ""
  echo "Usage: ./git-start-feature.sh <feature-name>"
  echo ""
  echo "Examples:"
  echo "  ./git-start-feature.sh phase-3b-inventory-adjustments"
  echo "  ./git-start-feature.sh fix-category-tree-bug"
  echo "  ./git-start-feature.sh add-inventory-reports"
  exit 1
fi

FEATURE_NAME=$1
BRANCH_PREFIX=""

# Auto-detect branch type from name
if [[ $FEATURE_NAME == phase-* ]] || [[ $FEATURE_NAME == implement-* ]] || [[ $FEATURE_NAME == add-* ]]; then
  BRANCH_PREFIX="feature/"
elif [[ $FEATURE_NAME == fix-* ]] || [[ $FEATURE_NAME == bug-* ]]; then
  BRANCH_PREFIX="fix/"
elif [[ $FEATURE_NAME == test-* ]]; then
  BRANCH_PREFIX="test/"
elif [[ $FEATURE_NAME == doc-* ]] || [[ $FEATURE_NAME == docs-* ]]; then
  BRANCH_PREFIX="docs/"
else
  # Default to feature if unclear
  BRANCH_PREFIX="feature/"
fi

BRANCH_NAME="${BRANCH_PREFIX}${FEATURE_NAME}"

echo -e "${BLUE}🚀 Starting new feature branch${NC}"
echo ""
echo -e "Branch: ${GREEN}${BRANCH_NAME}${NC}"
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
  echo ""
  git status --short
  echo ""
  read -p "Do you want to continue? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted${NC}"
    exit 1
  fi
fi

# Ensure we're on main branch
echo -e "${BLUE}📥 Switching to main branch...${NC}"
git checkout main

# Pull latest changes
echo -e "${BLUE}⬇️  Pulling latest changes...${NC}"
git pull origin main

# Create and checkout new branch
echo -e "${BLUE}🌿 Creating new branch: ${BRANCH_NAME}${NC}"
git checkout -b "$BRANCH_NAME"

echo ""
echo -e "${GREEN}✅ Success! You're now on branch: ${BRANCH_NAME}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Make your changes"
echo "2. Run tests: cd backend && npm test && cd ../pos-client && npm test"
echo "3. Stage files: git add <files>"
echo "4. Commit: git commit -m 'feat: your message'"
echo "5. Push: git push -u origin $BRANCH_NAME"
echo ""
echo -e "${BLUE}Happy coding! 🎉${NC}"
