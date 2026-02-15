# POS System - Server Deployment Guide

**Version:** 1.0.2
**Last Updated:** February 15, 2026
**Target Platform:** Ubuntu 20.04+ (or similar Linux distributions)

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [System Architecture](#system-architecture)
4. [Installation Steps](#installation-steps)
5. [Configuration Reference](#configuration-reference)
6. [SSL/TLS Setup](#ssltls-setup)
7. [Backup and Restore](#backup-and-restore)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Security Recommendations](#security-recommendations)

---

## Overview

The POS System server is a containerized application stack that provides the backend API, database, and cache services for all POS terminals. The server runs as a Docker Compose stack with the following components:

- **PostgreSQL 16**: Primary database for all POS data
- **Redis 7**: Session cache and real-time data
- **Backend API**: Node.js/Express REST API
- **Nginx**: Reverse proxy with SSL/TLS termination

**Deployment Model**: Centralized server with multiple distributed terminals

---

## Prerequisites

### Hardware Requirements

**Minimum:**
- 4 CPU cores
- 4 GB RAM
- 50 GB storage (SSD recommended)
- Network interface with static IP or domain name

**Recommended (for production):**
- 8 CPU cores
- 8 GB RAM
- 100 GB storage (SSD)
- Dedicated network interface
- UPS for power protection

### Software Requirements

- **Operating System**: Ubuntu 20.04 LTS or later (Ubuntu 22.04 LTS recommended)
- **Docker**: Version 20.10 or later
- **Docker Compose**: Version 2.0 or later
- **SSL Certificate**: Let's Encrypt certificate or valid commercial SSL certificate
- **Domain Name**: Recommended (e.g., pos-server.yourcompany.com)

### Network Requirements

- **Static IP Address**: Required for terminal connectivity
- **Open Ports**:
  - `80/tcp` - HTTP (redirects to HTTPS)
  - `443/tcp` - HTTPS (API access)
  - `22/tcp` - SSH (for administration)
- **Firewall**: Configure to allow only necessary ports
- **DNS**: A record pointing to server IP (if using domain name)

### Access Requirements

- Root or sudo access to the server
- SSH access for remote administration
- Basic knowledge of Docker and Linux command line

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Server Host (Ubuntu)                  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │            Docker Compose Stack                     │ │
│  │                                                     │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │ │
│  │  │PostgreSQL│  │  Redis   │  │  Backend API     │ │ │
│  │  │  :5432   │  │  :6379   │  │  (Node.js)       │ │ │
│  │  │          │  │          │  │  :3000           │ │ │
│  │  └─────┬────┘  └────┬─────┘  └────────┬─────────┘ │ │
│  │        │            │                  │           │ │
│  │        └────────────┴──────────────────┘           │ │
│  │                     │                              │ │
│  │              ┌──────▼────────┐                     │ │
│  │              │     Nginx     │                     │ │
│  │              │  (SSL/TLS)    │                     │ │
│  │              │  :80, :443    │                     │ │
│  │              └───────────────┘                     │ │
│  └────────────────────┬────────────────────────────────┘ │
└───────────────────────┼──────────────────────────────────┘
                        │ HTTPS
        ┌───────────────┼───────────────┐
        │               │               │
    ┌───▼────┐     ┌───▼────┐     ┌───▼────┐
    │Terminal│     │Terminal│     │Terminal│
    │   #1   │     │   #2   │     │   #3   │
    └────────┘     └────────┘     └────────┘
```

---

## Installation Steps

### Step 1: System Preparation

#### 1.1 Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

#### 1.2 Install Docker

```bash
# Install Docker using official convenience script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (optional, for non-root access)
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker installation
docker --version
```

**Expected output:** `Docker version 24.x.x` or later

#### 1.3 Install Docker Compose

```bash
# Docker Compose v2 is included with Docker Desktop
# Verify installation
docker compose version
```

**Expected output:** `Docker Compose version v2.x.x` or later

#### 1.4 Install Additional Tools

```bash
# Install required utilities
sudo apt install -y curl git openssl

# Verify installations
curl --version
git --version
openssl version
```

### Step 2: Download Server Package

#### Option A: Using Git (Recommended)

```bash
# Clone the repository
cd /opt
sudo git clone https://github.com/agastya71/mysl-pos-project.git pos-system
cd pos-system

# Checkout specific version (recommended for production)
sudo git checkout v1.0.2
```

#### Option B: Using Release Archive

```bash
# Download release archive
cd /opt
sudo curl -L -o pos-system.tar.gz \
  https://github.com/agastya71/mysl-pos-project/archive/refs/tags/v1.0.2.tar.gz

# Extract archive
sudo tar -xzf pos-system.tar.gz
sudo mv mysl-pos-project-1.0.2 pos-system
cd pos-system
```

### Step 3: Configuration Setup

#### 3.1 Create Production Environment File

```bash
# Copy template to production environment file
cp .env.production.template .env.production

# Set secure permissions
chmod 600 .env.production
```

#### 3.2 Generate Secure Secrets

```bash
# Generate JWT secrets
export JWT_ACCESS_SECRET=$(openssl rand -base64 32)
export JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# Generate database password
export DB_PASSWORD=$(openssl rand -base64 24)

# Generate Redis password
export REDIS_PASSWORD=$(openssl rand -base64 24)

echo "Save these values - you'll need them for configuration:"
echo "JWT_ACCESS_SECRET: $JWT_ACCESS_SECRET"
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"
echo "DB_PASSWORD: $DB_PASSWORD"
echo "REDIS_PASSWORD: $REDIS_PASSWORD"
```

⚠️ **IMPORTANT**: Save these secrets securely! You'll need them if you ever need to restore or reconfigure the server.

#### 3.3 Edit Environment Configuration

Open `.env.production` in your preferred text editor:

```bash
sudo nano .env.production
```

Update the following values:

```bash
# Database Configuration
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=pos_production
DATABASE_USER=pos_admin
DATABASE_PASSWORD=<paste DB_PASSWORD here>

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<paste REDIS_PASSWORD here>

# JWT Configuration
JWT_ACCESS_SECRET=<paste JWT_ACCESS_SECRET here>
JWT_REFRESH_SECRET=<paste JWT_REFRESH_SECRET here>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Backend Configuration
NODE_ENV=production
PORT=3000

# Backend Docker Image (use specific version for production)
BACKEND_IMAGE=ghcr.io/agastya71/mysl-pos-project/backend:1.0.2
```

Save and exit (Ctrl+X, Y, Enter in nano).

### Step 4: SSL/TLS Certificate Setup

Choose one of the following options:

#### Option A: Let's Encrypt (Recommended for Production)

```bash
# Install certbot
sudo apt install -y certbot

# Generate certificate (replace with your domain)
sudo certbot certonly --standalone \
  -d pos-server.yourcompany.com \
  --non-interactive \
  --agree-tos \
  -m admin@yourcompany.com

# Copy certificates to nginx directory
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/pos-server.yourcompany.com/fullchain.pem \
  nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/pos-server.yourcompany.com/privkey.pem \
  nginx/ssl/key.pem

# Set secure permissions
sudo chmod 644 nginx/ssl/cert.pem
sudo chmod 600 nginx/ssl/key.pem
```

#### Option B: Self-Signed Certificate (Testing/Internal Networks)

```bash
# Create ssl directory
mkdir -p nginx/ssl

# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Company/OU=IT/CN=pos-server.local"

# Set secure permissions
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem
```

⚠️ **Note**: Self-signed certificates will show security warnings in browsers and may require manual acceptance on terminals.

### Step 5: Deploy Services

#### 5.1 Pull Docker Images

```bash
# Pull latest images
docker compose -f docker-compose.production.yml pull
```

#### 5.2 Start Services

```bash
# Start all services in detached mode
docker compose -f docker-compose.production.yml \
  --env-file .env.production \
  up -d
```

**Expected output:**
```
[+] Running 4/4
 ✔ Container pos-postgres-prod  Started
 ✔ Container pos-redis-prod     Started
 ✔ Container pos-backend-prod   Started
 ✔ Container pos-nginx-prod     Started
```

#### 5.3 Monitor Startup

```bash
# Watch container logs
docker compose -f docker-compose.production.yml logs -f

# Wait for "Database migrations completed" message
# Press Ctrl+C to exit log view
```

**Expected log messages:**
- PostgreSQL: `database system is ready to accept connections`
- Redis: `Ready to accept connections`
- Backend: `Starting migration system...`
- Backend: `✓ All migrations completed successfully`
- Backend: `Server started on port 3000`

### Step 6: Database Initialization

The database is automatically initialized on first startup:

1. **Migrations**: All schema migrations run automatically
2. **Seed Data**: Default data is inserted (admin user, sample data)

#### Default Admin Credentials

```
Username: admin
Password: admin123
```

⚠️ **CRITICAL**: Change the admin password immediately after first login!

### Step 7: Verification

#### 7.1 Check Service Health

```bash
# Check all containers are running
docker compose -f docker-compose.production.yml ps
```

**Expected output:** All services should show "Up" status

#### 7.2 Test Health Endpoint

```bash
# Test via HTTP (internal)
curl http://localhost:3000/health

# Test via HTTPS (external)
curl -k https://localhost/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-15T10:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

#### 7.3 Test Authentication

```bash
# Test login endpoint
curl -k -X POST https://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

#### 7.4 Verify Database

```bash
# Connect to PostgreSQL
docker compose -f docker-compose.production.yml exec postgres \
  psql -U pos_admin -d pos_production

# Check tables
\dt

# Check terminal count
SELECT COUNT(*) FROM terminals;

# Exit psql
\q
```

### Step 8: Firewall Configuration

#### Using UFW (Ubuntu Firewall)

```bash
# Enable UFW if not already enabled
sudo ufw enable

# Allow SSH (IMPORTANT: do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check firewall status
sudo ufw status verbose
```

**Expected output:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

---

## Configuration Reference

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_HOST` | PostgreSQL host | `postgres` | Yes |
| `DATABASE_PORT` | PostgreSQL port | `5432` | Yes |
| `DATABASE_NAME` | Database name | `pos_production` | Yes |
| `DATABASE_USER` | Database user | `pos_admin` | Yes |
| `DATABASE_PASSWORD` | Database password | - | Yes |
| `REDIS_HOST` | Redis host | `redis` | Yes |
| `REDIS_PORT` | Redis port | `6379` | Yes |
| `REDIS_PASSWORD` | Redis password | - | Yes |
| `JWT_ACCESS_SECRET` | JWT signing secret (access tokens) | - | Yes |
| `JWT_REFRESH_SECRET` | JWT signing secret (refresh tokens) | - | Yes |
| `JWT_ACCESS_EXPIRY` | Access token expiry | `15m` | No |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | `7d` | No |
| `NODE_ENV` | Node environment | `production` | Yes |
| `PORT` | Backend port | `3000` | Yes |
| `BACKEND_IMAGE` | Docker image for backend | `ghcr.io/.../backend:main` | Yes |

---

## SSL/TLS Setup

### Let's Encrypt Renewal

Let's Encrypt certificates expire after 90 days. Set up automatic renewal:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Set up automatic renewal via cron
sudo crontab -e
```

Add the following line to renew daily at 2 AM:

```cron
0 2 * * * certbot renew --quiet --deploy-hook "cd /opt/pos-system && cp /etc/letsencrypt/live/pos-server.yourcompany.com/*.pem nginx/ssl/ && docker compose -f docker-compose.production.yml restart nginx"
```

---

## Backup and Restore

### Automated Backups

#### Configure Automated Backups

```bash
# Make backup script executable
chmod +x scripts/backup-database.sh

# Test manual backup
./scripts/backup-database.sh
```

**Expected output:**
```
Starting database backup...
Backup completed: /opt/pos-system/backups/db_backup_20260215_103000.sql.gz
```

#### Set Up Cron Job

```bash
# Edit crontab
crontab -e
```

Add daily backup at 3 AM:

```cron
0 3 * * * cd /opt/pos-system && ./scripts/backup-database.sh >> /var/log/pos-backup.log 2>&1
```

### Restore from Backup

```bash
# Stop backend service
docker compose -f docker-compose.production.yml stop backend

# Restore database
cd /opt/pos-system
./scripts/restore-database.sh backups/db_backup_20260215_103000.sql.gz

# Start backend service
docker compose -f docker-compose.production.yml start backend
```

⚠️ **WARNING**: Restore will overwrite current database!

---

## Monitoring and Maintenance

### Service Status

```bash
# Check all containers
docker compose -f docker-compose.production.yml ps

# View resource usage
docker stats
```

### Log Management

```bash
# View all logs
docker compose -f docker-compose.production.yml logs

# Follow logs in real-time
docker compose -f docker-compose.production.yml logs -f

# View specific service logs
docker compose -f docker-compose.production.yml logs backend
```

### System Updates

```bash
# Pull latest images
docker compose -f docker-compose.production.yml pull

# Restart services with new images
docker compose -f docker-compose.production.yml up -d

# Remove old images
docker image prune -f
```

---

## Troubleshooting

### Service Won't Start

1. Check logs:
   ```bash
   docker compose -f docker-compose.production.yml logs
   ```

2. Check environment file:
   ```bash
   ls -la .env.production
   ```

3. Check port conflicts:
   ```bash
   sudo netstat -tulpn | grep -E ':(80|443|3000|5432|6379)'
   ```

### Database Connection Failed

1. Check PostgreSQL is running:
   ```bash
   docker compose -f docker-compose.production.yml ps postgres
   ```

2. Check PostgreSQL logs:
   ```bash
   docker compose -f docker-compose.production.yml logs postgres
   ```

3. Test connection manually:
   ```bash
   docker compose -f docker-compose.production.yml exec postgres \
     psql -U pos_admin -d pos_production -c "SELECT 1;"
   ```

---

## Security Recommendations

1. **Change Default Credentials** - Change admin password immediately
2. **Secure Environment File** - `chmod 600 .env.production`
3. **Regular Updates** - Update system packages and Docker images
4. **Backup Encryption** - Encrypt sensitive backups with GPG
5. **Network Security** - Use VPN, implement IP whitelisting
6. **Monitoring** - Set up health check alerts

---

## Support and Resources

### Official Documentation

- **GitHub**: https://github.com/agastya71/mysl-pos-project
- **Issues**: https://github.com/agastya71/mysl-pos-project/issues
- **Releases**: https://github.com/agastya71/mysl-pos-project/releases

---

**End of Server Deployment Guide**
