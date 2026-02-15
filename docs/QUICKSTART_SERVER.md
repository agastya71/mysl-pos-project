# POS Server - Quick Start Guide

**Version:** 1.0.2 | **Time:** 30 minutes | **Difficulty:** Intermediate

---

## Prerequisites

✓ Ubuntu 20.04+ server with 4GB RAM, 50GB disk
✓ Root/sudo access
✓ Domain name pointing to server (optional but recommended)

---

## Installation (7 Steps)

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
docker --version  # Verify: 24.x+
```

### 2. Download POS System

```bash
cd /opt
sudo git clone https://github.com/agastya71/mysl-pos-project.git pos-system
cd pos-system
sudo git checkout v1.0.2
```

### 3. Generate Secrets

```bash
export JWT_ACCESS_SECRET=$(openssl rand -base64 32)
export JWT_REFRESH_SECRET=$(openssl rand -base64 32)
export DB_PASSWORD=$(openssl rand -base64 24)
export REDIS_PASSWORD=$(openssl rand -base64 24)

# ⚠️ SAVE THESE! Print to screen:
echo "JWT_ACCESS_SECRET: $JWT_ACCESS_SECRET"
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"
echo "DB_PASSWORD: $DB_PASSWORD"
echo "REDIS_PASSWORD: $REDIS_PASSWORD"
```

### 4. Configure Environment

```bash
cp .env.production.template .env.production
nano .env.production
```

Update these values (paste secrets from step 3):
```bash
DATABASE_PASSWORD=<your_DB_PASSWORD>
REDIS_PASSWORD=<your_REDIS_PASSWORD>
JWT_ACCESS_SECRET=<your_JWT_ACCESS_SECRET>
JWT_REFRESH_SECRET=<your_JWT_REFRESH_SECRET>
BACKEND_IMAGE=ghcr.io/agastya71/mysl-pos-project/backend:1.0.2
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

### 5. Setup SSL Certificate

**Option A: Let's Encrypt (Production)**
```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d pos-server.yourcompany.com \
  --agree-tos -m admin@yourcompany.com
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/pos-server.yourcompany.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/pos-server.yourcompany.com/privkey.pem nginx/ssl/key.pem
```

**Option B: Self-Signed (Testing)**
```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Company/CN=pos-server.local"
```

Fix permissions:
```bash
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem
```

### 6. Deploy Services

```bash
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

Wait 30 seconds for migrations to complete.

### 7. Verify

```bash
# Check services
docker compose -f docker-compose.production.yml ps
# All should show "Up"

# Test health endpoint
curl -k https://localhost/health
# Expected: {"status":"healthy"...}

# Test login
curl -k -X POST https://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# Expected: {"success":true,"data":{"accessToken":"..."}}
```

✅ **Server is ready!**

---

## Post-Installation

### Configure Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### Setup Automated Backups

```bash
chmod +x scripts/backup-database.sh
crontab -e
# Add: 0 3 * * * cd /opt/pos-system && ./scripts/backup-database.sh
```

### Change Admin Password

**Important:** Change default password immediately!

```bash
# Login to terminal with admin/admin123
# Go to Settings → Change Password
```

Or via database:
```bash
# Generate hash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('NewPassword123', 10, (e,h) => console.log(h));"

# Update (replace <hash> with output above)
docker compose -f docker-compose.production.yml exec postgres \
  psql -U pos_admin -d pos_production \
  -c "UPDATE users SET password_hash = '<hash>' WHERE username = 'admin';"
```

---

## Server Information

| Item | Value |
|------|-------|
| **API URL** | `https://pos-server.yourcompany.com` or `https://<server-ip>` |
| **Health Check** | `https://pos-server.yourcompany.com/health` |
| **Default User** | admin / admin123 |
| **PostgreSQL** | localhost:5432 (internal) |
| **Redis** | localhost:6379 (internal) |

---

## Common Commands

```bash
# Start services
docker compose -f docker-compose.production.yml --env-file .env.production up -d

# Stop services
docker compose -f docker-compose.production.yml down

# Restart services
docker compose -f docker-compose.production.yml restart

# View logs
docker compose -f docker-compose.production.yml logs -f

# Backup database
./scripts/backup-database.sh

# Update to new version
git pull
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
```

---

## Next Steps

1. **Deploy Terminals**: See [QUICKSTART_TERMINAL.md](QUICKSTART_TERMINAL.md)
2. **Configure Users**: Create cashier accounts via database or API
3. **Setup Monitoring**: Configure health check alerts
4. **SSL Renewal**: Setup auto-renewal for Let's Encrypt certificates

---

## Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| Services won't start | Check logs: `docker compose logs` |
| Health check fails | Verify all containers running: `docker compose ps` |
| Can't login | Check credentials, verify backend logs |
| SSL errors | Verify certificate files in `nginx/ssl/` |

**Full troubleshooting:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## Documentation

- **Detailed Guide:** [DEPLOYMENT_SERVER.md](DEPLOYMENT_SERVER.md)
- **Admin Guide:** [ADMIN_GUIDE.md](ADMIN_GUIDE.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

**Support:** https://github.com/agastya71/mysl-pos-project/issues
