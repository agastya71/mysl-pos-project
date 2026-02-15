# POS System Server Deployment Guide

**Version:** 1.0.0-deployment
**Last Updated:** February 14, 2026
**Estimated Time:** 30-45 minutes

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [System Requirements](#system-requirements)
4. [Installation Steps](#installation-steps)
5. [SSL Certificate Setup](#ssl-certificate-setup)
6. [Configuration](#configuration)
7. [Database Initialization](#database-initialization)
8. [Backup Configuration](#backup-configuration)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide walks you through deploying the POS System server infrastructure on Ubuntu 20.04+ using Docker. The server stack includes:

- **PostgreSQL 16** - Primary database
- **Redis 7** - Session management and caching
- **Backend API** - Node.js/Express REST API
- **Nginx** - Reverse proxy with SSL/TLS termination

**Architecture:**
```
Internet → Nginx (SSL :443) → Backend API (:3000) → PostgreSQL (:5432)
                                                   → Redis (:6379)
```

---

## Prerequisites

### Required Software

1. **Ubuntu Server 20.04 LTS or newer**
   - Ubuntu 20.04, 22.04, or 24.04 recommended
   - Fresh installation preferred

2. **Docker & Docker Compose**
   - Docker Engine 20.10+
   - Docker Compose v2.0+

3. **SSL Certificate**
   - Valid SSL certificate for HTTPS (Let's Encrypt or commercial)
   - Or use self-signed certificates for internal networks

### Required Access

- Root or sudo access
- SSH access to the server
- Domain name pointing to server IP (for SSL)

### Network Requirements

- Open ports:
  - `443` (HTTPS) - Terminal connections
  - `80` (HTTP) - Optional, for Let's Encrypt
  - `22` (SSH) - Server management
- Firewall configured to allow terminal connections

---

## System Requirements

### Minimum Requirements

- **CPU:** 2 cores
- **RAM:** 4 GB
- **Disk:** 50 GB SSD
- **Network:** 100 Mbps

### Recommended for Production

- **CPU:** 4 cores or more
- **RAM:** 8 GB or more
- **Disk:** 100 GB SSD with RAID 1
- **Network:** 1 Gbps
- **Backup:** Automated offsite backups

### Capacity Planning

- **Database:** ~100 MB per 10,000 transactions
- **Logs:** ~50 MB per day
- **Backups:** Retain 30 days = ~3-5 GB

---

## Installation Steps

### Step 1: Install Docker

```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
sudo docker --version
sudo docker compose version
```

**Expected output:**
```
Docker version 24.0.7, build afdd53b
Docker Compose version v2.23.0
```

### Step 2: Download Deployment Package

```bash
# Create deployment directory
sudo mkdir -p /opt/pos-system
cd /opt/pos-system

# Option A: Clone from Git (if using version control)
git clone https://github.com/yourcompany/pos-system.git .

# Option B: Extract from release package
# Upload pos-system-server-v1.0.0.tar.gz to server, then:
tar -xzf pos-system-server-v1.0.0.tar.gz
```

### Step 3: Generate Secure Secrets

```bash
# Generate JWT secret (32 bytes)
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET: $JWT_SECRET"

# Generate JWT refresh secret (32 bytes)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"

# Generate database password (16 bytes)
DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
echo "DB_PASSWORD: $DB_PASSWORD"

# Generate Redis password (16 bytes)
REDIS_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
echo "REDIS_PASSWORD: $REDIS_PASSWORD"

# IMPORTANT: Save these secrets securely!
# You'll need them in the next step.
```

**⚠️ SECURITY WARNING:**
- Save these secrets in a secure password manager
- Never commit secrets to version control
- Rotate secrets every 90 days in production

### Step 4: Configure Environment

```bash
# Copy environment template
cp .env.production.template .env.production

# Edit configuration
nano .env.production
```

**Update these required values:**

```bash
# Application
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database (PostgreSQL)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=pos_production
DB_USER=pos_admin
DB_PASSWORD=<YOUR_DB_PASSWORD>      # From Step 3

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<YOUR_REDIS_PASSWORD> # From Step 3

# JWT Authentication
JWT_SECRET=<YOUR_JWT_SECRET>         # From Step 3
JWT_REFRESH_SECRET=<YOUR_JWT_REFRESH_SECRET> # From Step 3
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Server URLs
SERVER_URL=https://pos.yourcompany.com
CLIENT_URL=https://pos.yourcompany.com

# SSL/TLS (update paths if different)
SSL_CERT_PATH=./nginx/ssl/fullchain.pem
SSL_KEY_PATH=./nginx/ssl/privkey.pem

# Backup Configuration
BACKUP_DIR=/opt/pos-system/backups
BACKUP_RETENTION_DAYS=30
```

**Save and exit:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

## SSL Certificate Setup

Choose **one** of the following options:

### Option A: Let's Encrypt (Recommended for Public Servers)

```bash
# Install Certbot
sudo apt-get install -y certbot

# Stop services if running
sudo docker compose -f docker-compose.production.yml down

# Obtain certificate (replace with your domain)
sudo certbot certonly --standalone \
    -d pos.yourcompany.com \
    --agree-tos \
    --email admin@yourcompany.com

# Copy certificates to deployment directory
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/pos.yourcompany.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/pos.yourcompany.com/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/fullchain.pem
sudo chmod 600 nginx/ssl/privkey.pem
```

**Certificate Renewal:**
```bash
# Certificates expire every 90 days
# Set up automatic renewal with cron:
sudo crontab -e

# Add this line:
0 3 * * * certbot renew --quiet --deploy-hook "docker compose -f /opt/pos-system/docker-compose.production.yml restart nginx"
```

### Option B: Self-Signed Certificate (For Internal Networks)

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/privkey.pem \
    -out nginx/ssl/fullchain.pem \
    -subj "/C=US/ST=State/L=City/O=Company/CN=pos.yourcompany.local"

# Set permissions
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

**⚠️ Note:** Terminals will show security warnings with self-signed certificates. You'll need to accept the certificate in each terminal's configuration.

---

## Configuration

### Database Configuration

The PostgreSQL database is configured in `docker-compose.production.yml`. Default settings are optimized for the recommended system requirements.

**Review settings** (optional):
```bash
nano docker-compose.production.yml
```

Key PostgreSQL parameters:
- `shared_buffers`: 256MB (25% of RAM)
- `effective_cache_size`: 1GB (75% of RAM)
- `max_connections`: 100

**For larger deployments**, adjust these values based on your hardware.

### Nginx Configuration

Review and customize Nginx settings:
```bash
nano nginx/nginx.conf
```

Key settings:
- `worker_processes`: auto (recommended)
- `client_max_body_size`: 10M (for file uploads)
- `ssl_protocols`: TLSv1.2 TLSv1.3 (secure defaults)

---

## Database Initialization

### Step 1: Build and Start Services

```bash
# Build the backend image
./scripts/build-server.sh

# Start all services
sudo docker compose -f docker-compose.production.yml up -d

# Check service status
sudo docker compose -f docker-compose.production.yml ps
```

**Expected output:**
```
NAME                  STATUS              PORTS
pos-backend           Up 10 seconds       0.0.0.0:3000->3000/tcp
pos-postgres          Up 12 seconds       0.0.0.0:5432->5432/tcp
pos-redis             Up 12 seconds       0.0.0.0:6379->6379/tcp
pos-nginx             Up 8 seconds        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### Step 2: Verify Migrations

The backend automatically runs migrations on startup. Verify they completed:

```bash
# Check backend logs
sudo docker compose -f docker-compose.production.yml logs backend | grep -i migration

# You should see:
# ✓ Database migration successful
# Applied 58 migrations
```

### Step 3: Create Initial Admin User

```bash
# Connect to backend container
sudo docker compose -f docker-compose.production.yml exec backend sh

# Run seed script (creates admin user: admin/admin123)
npm run seed

# Exit container
exit
```

**Default credentials:**
- Username: `admin`
- Password: `admin123`

**⚠️ SECURITY:** Change the admin password immediately after first login!

### Step 4: Verify Health

```bash
# Check health endpoint
curl -k https://localhost/health

# Expected response:
# {"success":true,"data":{"status":"healthy","timestamp":"...","services":{"database":"connected","redis":"connected"}}}
```

---

## Backup Configuration

### Automated Backup Setup

```bash
# Make backup script executable
chmod +x ./scripts/backup-database.sh

# Test backup
./scripts/backup-database.sh

# Verify backup created
ls -lh backups/
# Should show: db_backup_YYYYMMDD_HHMMSS.sql.gz
```

### Schedule Automated Backups

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/pos-system/scripts/backup-database.sh >> /opt/pos-system/backups/backup.log 2>&1
```

### Backup Retention

The backup script automatically:
- Creates compressed SQL dumps
- Retains backups for 30 days
- Deletes backups older than 30 days

**For offsite backups:**
```bash
# Add to backup script or create separate cron job
# Example: Upload to S3
aws s3 sync /opt/pos-system/backups/ s3://your-bucket/pos-backups/
```

---

## Monitoring

### Health Checks

**Automated health check:**
```bash
# Check every 5 minutes
*/5 * * * * curl -k -f https://localhost/health > /dev/null 2>&1 || echo "POS Server Down!" | mail -s "ALERT: POS Server Health Check Failed" admin@yourcompany.com
```

### Service Logs

```bash
# View all logs
sudo docker compose -f docker-compose.production.yml logs -f

# View specific service
sudo docker compose -f docker-compose.production.yml logs -f backend
sudo docker compose -f docker-compose.production.yml logs -f postgres
sudo docker compose -f docker-compose.production.yml logs -f redis
sudo docker compose -f docker-compose.production.yml logs -f nginx

# View last 100 lines
sudo docker compose -f docker-compose.production.yml logs --tail=100
```

### Database Monitoring

```bash
# Connect to PostgreSQL
sudo docker compose -f docker-compose.production.yml exec postgres \
    psql -U pos_admin -d pos_production

# Check database size
SELECT pg_size_pretty(pg_database_size('pos_production'));

# Check active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'pos_production';

# Check transaction count
SELECT COUNT(*) FROM transactions;

# Exit
\q
```

### Resource Usage

```bash
# Check Docker container stats
sudo docker stats

# Check disk usage
df -h /opt/pos-system

# Check memory usage
free -h
```

---

## Troubleshooting

### Services Won't Start

**Check logs:**
```bash
sudo docker compose -f docker-compose.production.yml logs
```

**Common issues:**
- Port conflicts (3000, 5432, 6379, 443 already in use)
- Insufficient disk space
- Invalid SSL certificates

**Solution:**
```bash
# Check port conflicts
sudo netstat -tuln | grep -E ':(3000|5432|6379|443)'

# Check disk space
df -h

# Restart services
sudo docker compose -f docker-compose.production.yml restart
```

### Database Connection Errors

**Error:** `Connection refused` or `authentication failed`

**Check:**
```bash
# Verify PostgreSQL is running
sudo docker compose -f docker-compose.production.yml ps postgres

# Check database logs
sudo docker compose -f docker-compose.production.yml logs postgres

# Verify credentials in .env.production
grep DB_ .env.production
```

### Migration Failures

**Error:** `Migration failed` or `Database schema out of date`

**Solution:**
```bash
# Reset database (⚠️ DATA LOSS!)
sudo docker compose -f docker-compose.production.yml down -v
sudo docker compose -f docker-compose.production.yml up -d

# Or restore from backup
./scripts/restore-database.sh backups/db_backup_YYYYMMDD_HHMMSS.sql.gz
```

### SSL Certificate Errors

**Error:** `SSL handshake failed` or `certificate expired`

**Check certificate:**
```bash
# Verify certificate files exist
ls -la nginx/ssl/

# Check certificate expiration
openssl x509 -in nginx/ssl/fullchain.pem -noout -dates

# Test SSL connection
openssl s_client -connect localhost:443 -showcerts
```

**Renew Let's Encrypt:**
```bash
sudo certbot renew
sudo docker compose -f docker-compose.production.yml restart nginx
```

### High Memory Usage

**Check Docker stats:**
```bash
sudo docker stats
```

**Increase PostgreSQL shared_buffers:**
```bash
nano docker-compose.production.yml
# Update: command: -c shared_buffers=512MB
sudo docker compose -f docker-compose.production.yml restart postgres
```

---

## Maintenance

### Updates

**Update backend application:**
```bash
# Pull latest changes
git pull origin main

# Rebuild backend image
./scripts/build-server.sh

# Restart services
sudo docker compose -f docker-compose.production.yml up -d backend

# Verify health
curl -k https://localhost/health
```

### Database Maintenance

**Vacuum database (monthly):**
```bash
sudo docker compose -f docker-compose.production.yml exec postgres \
    psql -U pos_admin -d pos_production -c "VACUUM ANALYZE;"
```

**Reindex (if performance degrades):**
```bash
sudo docker compose -f docker-compose.production.yml exec postgres \
    psql -U pos_admin -d pos_production -c "REINDEX DATABASE pos_production;"
```

---

## Security Best Practices

1. **Change default admin password immediately**
2. **Use strong, unique secrets** (generated with openssl)
3. **Enable firewall** (ufw or iptables)
4. **Restrict SSH access** (key-based authentication only)
5. **Keep system updated** (apt-get update && apt-get upgrade)
6. **Monitor logs regularly** (check for suspicious activity)
7. **Rotate secrets every 90 days**
8. **Use SSL certificates from trusted CA** (Let's Encrypt or commercial)
9. **Enable automated backups** (offsite storage)
10. **Limit container resources** (prevent resource exhaustion)

---

## Support

For issues not covered in this guide, refer to:
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Admin Guide](ADMIN_GUIDE.md)
- GitHub Issues: https://github.com/yourcompany/pos-system/issues

---

**Deployment complete!** Your POS server is ready to accept terminal connections.

Next step: [Terminal Deployment Guide](DEPLOYMENT_TERMINAL.md)
