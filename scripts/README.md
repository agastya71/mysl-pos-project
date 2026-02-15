# POS System - Deployment Scripts

This directory contains scripts for managing the POS system production deployment.

## Scripts

### `build-server.sh`
Builds the production Docker image for the backend API.

**Usage:**
```bash
./scripts/build-server.sh
```

**What it does:**
- Extracts version from `backend/package.json`
- Builds Docker image using `Dockerfile.production`
- Tags image with version and `latest`
- Optionally pushes to Docker registry

**Output:**
- Docker images: `pos-backend:VERSION` and `pos-backend:latest`

---

### `backup-database.sh`
Creates a compressed backup of the PostgreSQL database.

**Usage:**
```bash
./scripts/backup-database.sh
```

**What it does:**
- Exports database using `pg_dump`
- Compresses with gzip
- Saves to `backups/db_backup_YYYYMMDD_HHMMSS.sql.gz`
- Rotates old backups (keeps last 30 days by default)
- Optionally uploads to AWS S3 (if configured)

**Configuration:**
Set in `.env.production`:
- `BACKUP_RETENTION_DAYS` - Number of days to keep backups (default: 30)
- `BACKUP_S3_ENABLED` - Enable S3 uploads (default: false)
- `BACKUP_S3_BUCKET` - S3 bucket name
- `BACKUP_S3_REGION` - AWS region

**Automated Backups:**
Add to crontab for daily backups:
```bash
crontab -e
# Add: 0 2 * * * /opt/pos-system/scripts/backup-database.sh >> /var/log/pos-backup.log 2>&1
```

---

### `restore-database.sh`
Restores the database from a backup file.

**Usage:**
```bash
./scripts/restore-database.sh <backup_file>
```

**Example:**
```bash
./scripts/restore-database.sh db_backup_20260214_020000.sql.gz
```

**What it does:**
- Creates a safety backup of current database
- Stops backend service to prevent connections
- Restores database from backup file
- Restarts backend service
- Verifies health endpoint

**⚠️ Warning:**
This will **OVERWRITE** the current database. All existing data will be lost. The script will prompt for confirmation before proceeding.

---

## Prerequisites

All scripts require:
- Docker and Docker Compose installed and running
- `.env.production` file with configuration
- Production services running (`docker-compose.production.yml`)

---

## Common Tasks

### Initial Deployment
```bash
# 1. Build Docker image
./scripts/build-server.sh

# 2. Deploy services
docker-compose -f docker-compose.production.yml up -d

# 3. Verify deployment
docker-compose -f docker-compose.production.yml ps
curl https://your-server/health
```

### Daily Operations
```bash
# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f backend

# Create manual backup
./scripts/backup-database.sh

# List backups
ls -lh backups/
```

### Disaster Recovery
```bash
# 1. Stop services
docker-compose -f docker-compose.production.yml stop

# 2. Restore from backup
./scripts/restore-database.sh backups/db_backup_20260214_020000.sql.gz

# 3. Start services
docker-compose -f docker-compose.production.yml start

# 4. Verify health
curl https://your-server/health
```

---

## Troubleshooting

### Build fails
```bash
# Check Docker is running
docker info

# Clean Docker cache
docker system prune -a

# Try build again
./scripts/build-server.sh
```

### Backup fails
```bash
# Check PostgreSQL container is running
docker ps | grep postgres

# Check disk space
df -h

# View PostgreSQL logs
docker-compose -f docker-compose.production.yml logs postgres
```

### Restore fails
```bash
# Check backup file exists
ls -lh backups/

# Verify backup file is not corrupted
gunzip -t backups/db_backup_*.sql.gz

# Check PostgreSQL logs
docker-compose -f docker-compose.production.yml logs postgres
```

---

## Security Notes

1. **Backup Files**: Contain sensitive data. Restrict permissions:
   ```bash
   chmod 700 backups/
   chmod 600 backups/*.sql.gz
   ```

2. **Scripts**: Should only be executable by authorized users:
   ```bash
   chmod 750 scripts/*.sh
   ```

3. **Environment Variables**: Never commit `.env.production` to version control

4. **Off-site Backups**: Enable S3 uploads for disaster recovery

---

## Support

For deployment issues, see:
- `/docs/DEPLOYMENT_SERVER.md` - Complete server installation guide
- `/docs/TROUBLESHOOTING.md` - Common issues and solutions
- `/docs/ADMIN_GUIDE.md` - Admin procedures
