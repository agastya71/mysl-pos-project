#!/bin/bash
# POS System - Server Build Script
# Builds production Docker image for backend API

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}POS System - Server Build${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running from project root
if [ ! -f "$PROJECT_ROOT/docker-compose.production.yml" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Get version from backend package.json
cd "$PROJECT_ROOT/backend"
if [ -f "package.json" ]; then
    VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "1.0.0")
else
    VERSION="1.0.0"
fi
cd "$PROJECT_ROOT"

echo -e "${YELLOW}Version:${NC} $VERSION"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi

echo -e "${YELLOW}Building Docker image...${NC}"
echo ""

# Build the Docker image
docker build \
    -f backend/Dockerfile.production \
    -t pos-backend:${VERSION} \
    -t pos-backend:latest \
    ./backend

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Build successful!${NC}"
    echo ""
    echo -e "${YELLOW}Image tags:${NC}"
    echo "  - pos-backend:${VERSION}"
    echo "  - pos-backend:latest"
    echo ""

    # Show image size
    IMAGE_SIZE=$(docker images pos-backend:${VERSION} --format "{{.Size}}")
    echo -e "${YELLOW}Image size:${NC} $IMAGE_SIZE"
    echo ""

    # Optional: Push to registry
    read -p "Push to Docker registry? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -z "$DOCKER_REGISTRY" ]; then
            read -p "Enter Docker registry URL (e.g., registry.company.com): " DOCKER_REGISTRY
        fi

        if [ -n "$DOCKER_REGISTRY" ]; then
            echo -e "${YELLOW}Tagging for registry...${NC}"
            docker tag pos-backend:${VERSION} ${DOCKER_REGISTRY}/pos-backend:${VERSION}
            docker tag pos-backend:${VERSION} ${DOCKER_REGISTRY}/pos-backend:latest

            echo -e "${YELLOW}Pushing to registry...${NC}"
            docker push ${DOCKER_REGISTRY}/pos-backend:${VERSION}
            docker push ${DOCKER_REGISTRY}/pos-backend:latest

            echo -e "${GREEN}✓ Pushed to registry${NC}"
        fi
    fi

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Build Complete${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "To deploy, run:"
    echo "  docker-compose -f docker-compose.production.yml up -d"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
