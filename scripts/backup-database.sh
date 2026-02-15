#!/bin/bash
# POS System - Database Backup Script
# Automated PostgreSQL backup with compression and rotation

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
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="db_backup_${DATE}.sql.gz"
DATABASE_NAME="${DATABASE_NAME:-pos_production}"
DATABASE_USER="${DATABASE_USER:-pos_admin}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}POS System - Database Backup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Database:${NC} $DATABASE_NAME"
echo -e "${YELLOW}Backup directory:${NC} $BACKUP_DIR"
echo -e "${YELLOW}Retention:${NC} $RETENTION_DAYS days"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

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

echo -e "${YELLOW}Creating backup...${NC}"

# Create backup using pg_dump via Docker
docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" exec -T postgres \
    pg_dump -U "$DATABASE_USER" "$DATABASE_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    | gzip > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup created successfully${NC}"
    echo -e "${YELLOW}File:${NC} $BACKUP_FILE"
    echo -e "${YELLOW}Size:${NC} $BACKUP_SIZE"
    echo ""

    # Rotate old backups
    echo -e "${YELLOW}Rotating old backups (keeping last $RETENTION_DAYS days)...${NC}"
    DELETED_COUNT=$(find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l | tr -d ' ')

    if [ "$DELETED_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ Deleted $DELETED_COUNT old backup(s)${NC}"
    else
        echo -e "${YELLOW}No old backups to delete${NC}"
    fi
    echo ""

    # List recent backups
    echo -e "${YELLOW}Recent backups:${NC}"
    ls -lh "$BACKUP_DIR" | grep "db_backup_" | tail -5
    echo ""

    # Optional: Upload to S3
    if [ "${BACKUP_S3_ENABLED:-false}" = "true" ]; then
        if command -v aws &> /dev/null; then
            echo -e "${YELLOW}Uploading to S3...${NC}"
            aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" \
                "s3://${BACKUP_S3_BUCKET}/" \
                --region "${BACKUP_S3_REGION:-us-east-1}" \
                --storage-class STANDARD_IA

            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Uploaded to S3: s3://${BACKUP_S3_BUCKET}/$BACKUP_FILE${NC}"
            else
                echo -e "${RED}✗ S3 upload failed${NC}"
            fi
        else
            echo -e "${YELLOW}Warning: AWS CLI not installed, skipping S3 upload${NC}"
        fi
    fi

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Backup Complete${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "To restore this backup, run:"
    echo "  ./scripts/restore-database.sh $BACKUP_FILE"
    echo ""
else
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
fi
