#!/bin/bash
# POS System - Database Restore Script
# Restore PostgreSQL database from backup file

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables from .env.production if it exists
if [ -f "$PROJECT_ROOT/.env.production" ]; then
    source "$PROJECT_ROOT/.env.production"
fi

# Configuration
BACKUP_DIR="${PROJECT_ROOT}/backups"
DATABASE_NAME="${DATABASE_NAME:-pos_production}"
DATABASE_USER="${DATABASE_USER:-pos_admin}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}POS System - Database Restore${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Backup file not specified${NC}"
    echo ""
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -lh "$BACKUP_DIR" | grep "db_backup_"
    else
        echo "  No backups found in $BACKUP_DIR"
    fi
    echo ""
    exit 1
fi

BACKUP_FILE="$1"

# Check if file is just filename (not full path)
if [ ! -f "$BACKUP_FILE" ]; then
    # Try looking in backup directory
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    else
        echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
        exit 1
    fi
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo -e "${YELLOW}Backup file:${NC} $(basename $BACKUP_FILE)"
echo -e "${YELLOW}Size:${NC} $BACKUP_SIZE"
echo -e "${YELLOW}Database:${NC} $DATABASE_NAME"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Check if postgres container is running
if ! docker ps --format '{{.Names}}' | grep -q "pos-postgres-prod"; then
    echo -e "${RED}Error: PostgreSQL container (pos-postgres-prod) is not running${NC}"
    echo "Start the services with: docker-compose -f docker-compose.production.yml up -d"
    exit 1
fi

# Warning
echo -e "${RED}⚠️  WARNING: This will OVERWRITE the current database!${NC}"
echo -e "${RED}All current data will be LOST!${NC}"
echo ""
read -p "Are you sure you want to continue? Type 'yes' to proceed: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo ""
echo -e "${YELLOW}Creating safety backup of current database...${NC}"

# Create a safety backup before restore
SAFETY_BACKUP="$BACKUP_DIR/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" exec -T postgres \
    pg_dump -U "$DATABASE_USER" "$DATABASE_NAME" \
    --clean \
    --if-exists \
    | gzip > "$SAFETY_BACKUP"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Safety backup created: $(basename $SAFETY_BACKUP)${NC}"
    echo ""
else
    echo -e "${RED}✗ Safety backup failed${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Restore cancelled"
        exit 1
    fi
fi

echo -e "${YELLOW}Stopping backend service to prevent connections...${NC}"
docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" stop backend

echo ""
echo -e "${YELLOW}Restoring database from backup...${NC}"

# Decompress and restore
gunzip -c "$BACKUP_FILE" | docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" exec -T postgres \
    psql -U "$DATABASE_USER" "$DATABASE_NAME"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database restored successfully${NC}"
    echo ""

    # Restart backend service
    echo -e "${YELLOW}Starting backend service...${NC}"
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" start backend

    # Wait for backend to be healthy
    echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
    sleep 5

    # Check health endpoint
    HEALTH_CHECK=$(docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" exec -T backend \
        node -e "require('http').get('http://localhost:3000/health', (r) => {let data=''; r.on('data', (chunk) => {data += chunk}); r.on('end', () => {console.log(r.statusCode === 200 ? 'OK' : 'FAIL')})})" 2>/dev/null || echo "FAIL")

    if [ "$HEALTH_CHECK" = "OK" ]; then
        echo -e "${GREEN}✓ Backend is healthy${NC}"
    else
        echo -e "${YELLOW}Warning: Backend health check failed (may need a moment to start)${NC}"
    fi

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Restore Complete${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Database has been restored from:"
    echo "  $(basename $BACKUP_FILE)"
    echo ""
    echo "Safety backup saved as:"
    echo "  $(basename $SAFETY_BACKUP)"
    echo ""
else
    echo -e "${RED}✗ Restore failed${NC}"
    echo ""
    echo "Attempting to restart backend service..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" start backend
    exit 1
fi
