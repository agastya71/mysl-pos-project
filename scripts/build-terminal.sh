#!/bin/bash

# POS Terminal Build Script
# Builds terminal installers for all platforms (Windows, macOS, Linux)
# Generates SHA256 checksums and organizes release artifacts

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
POS_CLIENT_DIR="$PROJECT_ROOT/pos-client"
RELEASE_DIR="$POS_CLIENT_DIR/release"

# Get version from package.json
VERSION=$(node -p "require('$POS_CLIENT_DIR/package.json').version")

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}POS Terminal Build Script${NC}"
echo -e "${BLUE}Version: $VERSION${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# Check if we're in the correct directory
if [ ! -f "$POS_CLIENT_DIR/package.json" ]; then
    echo -e "${RED}Error: pos-client/package.json not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Parse command line arguments
BUILD_MAC=false
BUILD_WIN=false
BUILD_LINUX=false
BUILD_ALL=false

if [ $# -eq 0 ]; then
    BUILD_ALL=true
else
    while [ $# -gt 0 ]; do
        case "$1" in
            --mac|-m)
                BUILD_MAC=true
                ;;
            --win|-w)
                BUILD_WIN=true
                ;;
            --linux|-l)
                BUILD_LINUX=true
                ;;
            --all|-a)
                BUILD_ALL=true
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  -m, --mac       Build for macOS only"
                echo "  -w, --win       Build for Windows only"
                echo "  -l, --linux     Build for Linux only"
                echo "  -a, --all       Build for all platforms (default)"
                echo "  -h, --help      Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0              Build for all platforms"
                echo "  $0 --mac        Build for macOS only"
                echo "  $0 -w -l        Build for Windows and Linux"
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
        shift
    done
fi

# If --all is set, enable all platforms
if [ "$BUILD_ALL" = true ]; then
    BUILD_MAC=true
    BUILD_WIN=true
    BUILD_LINUX=true
fi

# Change to pos-client directory
cd "$POS_CLIENT_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules not found. Installing dependencies...${NC}"
    npm install
fi

# Clean previous release
if [ -d "$RELEASE_DIR" ]; then
    echo -e "${YELLOW}Cleaning previous release...${NC}"
    rm -rf "$RELEASE_DIR"
fi

# Build the application code first
echo -e "${BLUE}Building application code...${NC}"
npm run build

# Build for each platform
if [ "$BUILD_MAC" = true ]; then
    echo ""
    echo -e "${BLUE}Building for macOS...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        electron-builder --mac
        echo -e "${GREEN}✓ macOS build complete${NC}"
    else
        echo -e "${YELLOW}⚠ Skipping macOS build (requires macOS)${NC}"
    fi
fi

if [ "$BUILD_WIN" = true ]; then
    echo ""
    echo -e "${BLUE}Building for Windows...${NC}"
    electron-builder --win
    echo -e "${GREEN}✓ Windows build complete${NC}"
fi

if [ "$BUILD_LINUX" = true ]; then
    echo ""
    echo -e "${BLUE}Building for Linux...${NC}"
    electron-builder --linux
    echo -e "${GREEN}✓ Linux build complete${NC}"
fi

# Generate checksums
if [ -d "$RELEASE_DIR" ]; then
    echo ""
    echo -e "${BLUE}Generating SHA256 checksums...${NC}"
    cd "$RELEASE_DIR"

    # Create checksums file
    CHECKSUM_FILE="SHA256SUMS.txt"
    > "$CHECKSUM_FILE"  # Clear file

    echo "POS Terminal v$VERSION - SHA256 Checksums" >> "$CHECKSUM_FILE"
    echo "Generated: $(date)" >> "$CHECKSUM_FILE"
    echo "" >> "$CHECKSUM_FILE"

    # Generate checksums for all installers (exclude .blockmap and .yml files)
    for file in *.{exe,dmg,zip,deb,AppImage} 2>/dev/null; do
        if [ -f "$file" ]; then
            echo -e "  ${YELLOW}Checksumming: $file${NC}"
            if command -v sha256sum &> /dev/null; then
                sha256sum "$file" >> "$CHECKSUM_FILE"
            elif command -v shasum &> /dev/null; then
                shasum -a 256 "$file" >> "$CHECKSUM_FILE"
            else
                echo -e "${RED}Error: No SHA256 tool found (sha256sum or shasum)${NC}"
            fi
        fi
    done

    echo -e "${GREEN}✓ Checksums generated: $CHECKSUM_FILE${NC}"

    # Show build summary
    echo ""
    echo -e "${BLUE}==================================${NC}"
    echo -e "${BLUE}Build Summary${NC}"
    echo -e "${BLUE}==================================${NC}"
    echo -e "${GREEN}Version: $VERSION${NC}"
    echo -e "${GREEN}Output directory: $RELEASE_DIR${NC}"
    echo ""
    echo "Artifacts:"
    ls -lh *.{exe,dmg,zip,deb,AppImage} 2>/dev/null | awk '{printf "  %s %s %s\n", $9, $5, $6}' || echo "  No artifacts found"
    echo ""
    echo -e "${GREEN}Build complete!${NC}"
else
    echo -e "${RED}Error: Release directory not found${NC}"
    exit 1
fi
