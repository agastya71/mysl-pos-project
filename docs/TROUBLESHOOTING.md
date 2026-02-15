# POS System - Troubleshooting Guide

**Version:** 1.0.2
**Last Updated:** February 15, 2026

---

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Server Issues](#server-issues)
3. [Terminal Issues](#terminal-issues)
4. [Database Issues](#database-issues)
5. [Network Issues](#network-issues)
6. [Authentication Issues](#authentication-issues)
7. [Performance Issues](#performance-issues)
8. [Emergency Procedures](#emergency-procedures)
9. [Diagnostic Commands Reference](#diagnostic-commands-reference)
10. [Log File Locations](#log-file-locations)

---

## Quick Diagnostics

### Is the Problem Server or Terminal?

**Test server health:**
```bash
curl -k https://pos-server.yourcompany.com/health
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

If this works → **Terminal problem**
If this fails → **Server problem**

### Quick Health Check Commands

```bash
# On server
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs --tail=50

# From terminal machine
ping pos-server.yourcompany.com
curl -I https://pos-server.yourcompany.com
nslookup pos-server.yourcompany.com
```

---

## Server Issues

### Issue: Docker Containers Won't Start

**Symptoms:**
- Services fail to start
- `docker compose ps` shows containers as "Exited"
- Error messages in logs

**Diagnosis:**

```bash
# Check service status
docker compose -f docker-compose.production.yml ps

# Check logs for errors
docker compose -f docker-compose.production.yml logs

# Check specific service
docker compose -f docker-compose.production.yml logs backend
docker compose -f docker-compose.production.yml logs postgres
```

**Common Causes and Solutions:**

#### 1. Port Already in Use

**Error message:** `bind: address already in use`

```bash
# Find what's using the port
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :5432
sudo netstat -tulpn | grep :6379
sudo netstat -tulpn | grep :443

# Kill the process
sudo kill -9 <PID>

# Or stop conflicting service
sudo systemctl stop nginx  # if nginx is running outside Docker
sudo systemctl stop postgresql  # if PostgreSQL is running outside Docker
```

#### 2. Insufficient Disk Space

**Error message:** `no space left on device`

```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Clean up
docker system prune -a  # Remove unused images, containers, volumes
docker volume prune     # Remove unused volumes
```

#### 3. Permission Issues

**Error message:** `permission denied`

```bash
# Fix ownership
sudo chown -R $USER:$USER /opt/pos-system

# Fix permissions on environment file
chmod 600 /opt/pos-system/.env.production

# Fix SSL certificate permissions
chmod 644 /opt/pos-system/nginx/ssl/cert.pem
chmod 600 /opt/pos-system/nginx/ssl/key.pem
```

#### 4. Environment Variables Not Set

**Error message:** `Environment variable not found`

```bash
# Verify .env.production exists
ls -la /opt/pos-system/.env.production

# Check required variables are set
grep -v '^#' /opt/pos-system/.env.production | grep -v '^$'

# Ensure you're using --env-file flag
docker compose -f docker-compose.production.yml \
  --env-file .env.production up -d
```

### Issue: Backend Container Crashes Immediately

**Symptoms:**
- Backend container starts then exits
- `docker ps` doesn't show backend running
- Health endpoint unreachable

**Diagnosis:**

```bash
# Check exit code and error
docker compose -f docker-compose.production.yml ps backend
docker compose -f docker-compose.production.yml logs backend

# Try starting in foreground to see errors
docker compose -f docker-compose.production.yml up backend
```

**Common Causes:**

#### 1. Database Connection Failed

**Error message:** `Error: connect ECONNREFUSED` or `Connection refused`

**Solution:**
```bash
# Check PostgreSQL is running
docker compose -f docker-compose.production.yml ps postgres

# Check PostgreSQL logs
docker compose -f docker-compose.production.yml logs postgres

# Verify database credentials
docker compose -f docker-compose.production.yml exec postgres \
  psql -U pos_admin -d pos_production -c "SELECT 1;"

# If credentials wrong, update .env.production and restart
nano .env.production
docker compose -f docker-compose.production.yml restart backend
```

#### 2. Migration Failures

**Error message:** `Migration failed` or `Database schema error`

**Solution:**
```bash
# Check migration logs
docker compose -f docker-compose.production.yml logs backend | grep -i migration

# Check which migrations have run
docker compose -f docker-compose.production.yml exec postgres \
  psql -U pos_admin -d pos_production \
  -c "SELECT * FROM schema_migrations ORDER BY executed_at DESC LIMIT 10;"

# Try manual migration
docker compose -f docker-compose.production.yml exec backend npm run migrate

# If still failing, check for syntax errors in migration files
ls -la schema/migrations/

# Last resort: Reset database (⚠️ DATA LOSS!)
docker compose -f docker-compose.production.yml down -v
docker compose -f docker-compose.production.yml up -d
```

#### 3. Missing Dependencies

**Error message:** `Cannot find module` or `MODULE_NOT_FOUND`

**Solution:**
```bash
# Rebuild backend container
docker compose -f docker-compose.production.yml build --no-cache backend
docker compose -f docker-compose.production.yml up -d backend
```

### Issue: PostgreSQL Won't Start

**Symptoms:**
- PostgreSQL container exits immediately
- Backend cannot connect to database
- Error: `database system was not properly shut down`

**Diagnosis:**

```bash
docker compose -f docker-compose.production.yml logs postgres
```

**Common Causes:**

#### 1. Corrupted Data Directory

**Error message:** `data directory was initialized with incompatible version`

**Solution:**
```bash
# ⚠️ WARNING: This will delete all data!
# Only do this if you have backups!

# Stop all services
docker compose -f docker-compose.production.yml down

# Remove PostgreSQL volume
docker volume rm pos-system_postgres_data

# Restore from backup
docker compose -f docker-compose.production.yml up -d postgres
# Wait 10 seconds
./scripts/restore-database.sh backups/db_backup_YYYYMMDD_HHMMSS.sql.gz

# Start remaining services
docker compose -f docker-compose.production.yml up -d
```

#### 2. Insufficient Shared Memory

**Error message:** `could not resize shared memory segment`

**Solution:**
```bash
# Increase Docker memory allocation
# Docker Desktop → Settings → Resources → Memory: 4GB+

# Or add to docker-compose.production.yml:
# services:
#   postgres:
#     shm_size: 256mb
```

### Issue: Redis Connection Failed

**Symptoms:**
- Backend logs show Redis errors
- Sessions not persisting
- Error: `Error connecting to Redis`

**Diagnosis:**

```bash
# Check Redis is running
docker compose -f docker-compose.production.yml ps redis

# Check Redis logs
docker compose -f docker-compose.production.yml logs redis

# Test Redis connection
docker compose -f docker-compose.production.yml exec redis \
  redis-cli -a <REDIS_PASSWORD> ping
```

**Solutions:**

```bash
# Restart Redis
docker compose -f docker-compose.production.yml restart redis

# Check Redis password matches .env.production
grep REDIS_PASSWORD .env.production

# Test manual connection
docker compose -f docker-compose.production.yml exec redis \
  redis-cli -a <REDIS_PASSWORD>
# Inside redis-cli:
PING  # Should return PONG
```

### Issue: Nginx/SSL Certificate Errors

**Symptoms:**
- HTTPS not working
- Browser shows "Certificate error" or "Connection not secure"
- Terminals cannot connect

**Diagnosis:**

```bash
# Check Nginx is running
docker compose -f docker-compose.production.yml ps nginx

# Check Nginx logs
docker compose -f docker-compose.production.yml logs nginx

# Verify certificates exist
ls -la nginx/ssl/

# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -noout -dates
openssl x509 -in nginx/ssl/cert.pem -noout -subject
```

**Common Causes:**

#### 1. Certificate Expired

**Solution:**
```bash
# For Let's Encrypt
sudo certbot renew
sudo cp /etc/letsencrypt/live/pos-server.yourcompany.com/*.pem nginx/ssl/
docker compose -f docker-compose.production.yml restart nginx

# For self-signed (generate new)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Company/CN=pos-server.yourcompany.com"
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem
docker compose -f docker-compose.production.yml restart nginx
```

#### 2. Certificate Files Missing or Wrong Permissions

**Solution:**
```bash
# Check permissions
ls -la nginx/ssl/

# Fix permissions
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

# Restart Nginx
docker compose -f docker-compose.production.yml restart nginx
```

#### 3. Certificate Name Mismatch

**Error:** `Certificate name mismatch`

**Solution:**
- Certificate CN/SAN must match the domain name
- If using IP address, generate certificate with IP in SAN field
- Or use domain name instead of IP

---

## Terminal Issues

### Issue: Terminal Cannot Connect to Server

**Symptoms:**
- "Connection failed" error on login screen
- "Cannot reach server" message
- Red X icon next to server URL

**Diagnosis:**

```bash
# From terminal machine, test connectivity
ping pos-server.yourcompany.com
curl -I https://pos-server.yourcompany.com
curl -k https://pos-server.yourcompany.com/health

# Check DNS resolution
nslookup pos-server.yourcompany.com

# Test with IP if DNS fails
curl -k https://192.168.1.100/health
```

**Common Causes:**

#### 1. Network Connectivity Issues

**Solution:**
```bash
# Windows
ping pos-server.yourcompany.com
tracert pos-server.yourcompany.com
ipconfig /all

# macOS/Linux
ping pos-server.yourcompany.com
traceroute pos-server.yourcompany.com
ifconfig  # or ip addr
```

Check:
- Can terminal reach internet?
- Is firewall blocking outbound port 443?
- Is VPN required but not connected?
- Is server on same network or routable?

#### 2. Wrong API URL

**Solution:**
1. Open terminal application
2. Go to Settings → Server Configuration
3. Verify URL format:
   - ✓ Correct: `https://pos-server.yourcompany.com`
   - ✓ Correct: `https://192.168.1.100`
   - ✗ Wrong: `http://pos-server.yourcompany.com` (http not https)
   - ✗ Wrong: `pos-server.yourcompany.com` (missing https://)
   - ✗ Wrong: `https://pos-server.yourcompany.com:3000` (don't include :3000)
4. Test Connection
5. Save

#### 3. SSL Certificate Issues

**Error:** `SSL certificate verification failed`

**For self-signed certificates:**
- Accept certificate in terminal settings
- Or import certificate into OS trust store

**Windows:**
```powershell
# Import certificate to Trusted Root
certutil -addstore "Root" C:\path\to\cert.pem
```

**macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain cert.pem
```

**Linux:**
```bash
sudo cp cert.pem /usr/local/share/ca-certificates/pos-server.crt
sudo update-ca-certificates
```

#### 4. Firewall Blocking Connection

**Solution:**

```bash
# Windows - Allow outbound HTTPS
netsh advfirewall firewall add rule name="POS Terminal HTTPS" dir=out action=allow protocol=TCP remoteport=443

# Linux - Allow outbound HTTPS
sudo ufw allow out 443/tcp

# Test with firewall temporarily disabled
# Windows: Turn off Windows Defender Firewall
# Linux: sudo ufw disable
# If works, firewall is the issue
```

### Issue: Terminal Login Fails

**Symptoms:**
- "Invalid username or password" error
- "Authentication failed" message
- Login button disabled

**Diagnosis:**

```bash
# Test authentication via API
curl -k -X POST https://pos-server.yourcompany.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Check user in database
docker compose -f docker-compose.production.yml exec postgres \
  psql -U pos_admin -d pos_production \
  -c "SELECT username, is_active FROM users WHERE username='admin';"
```

**Common Causes:**

#### 1. Wrong Credentials

- Verify username (case-sensitive)
- Verify password
- Try default credentials: admin/admin123 (if not changed)

#### 2. User Inactive

**Solution:**
```sql
-- Activate user
UPDATE users SET is_active = true WHERE username = 'cashier1';
```

#### 3. User Not Assigned to Terminal

**Solution:**
```sql
-- Assign user to terminal
UPDATE users 
SET assigned_terminal_id = (
  SELECT id FROM terminals WHERE terminal_number = 'TERM-000001'
)
WHERE username = 'cashier1';
```

### Issue: Terminal Crashes or Freezes

**Symptoms:**
- Application becomes unresponsive
- Application closes unexpectedly
- White screen or blank window

**Diagnosis:**

1. **Check system resources:**
   - Windows: Task Manager → Performance
   - macOS: Activity Monitor
   - Linux: `top` or `htop`

2. **Check application logs:**
   - Windows: `%APPDATA%\pos-terminal\logs\`
   - macOS: `~/Library/Logs/pos-terminal/`
   - Linux: `~/.config/pos-terminal/logs/`

**Solutions:**

#### 1. Insufficient Memory

- Close other applications
- Ensure system has 4GB+ RAM
- Restart computer

#### 2. Corrupted Configuration

```bash
# Windows
del %APPDATA%\pos-terminal\config.json

# macOS
rm ~/Library/Application\ Support/pos-terminal/config.json

# Linux
rm ~/.config/pos-terminal/config.json

# Restart application and reconfigure
```

#### 3. Application Bug

- Check GitHub Issues: https://github.com/agastya71/mysl-pos-project/issues
- Update to latest version
- Report issue with logs attached

### Issue: Transaction Fails to Complete

**Symptoms:**
- "Transaction failed" error
- Cart clears but no transaction recorded
- Payment processed but receipt doesn't print

**Diagnosis:**

```sql
-- Check recent transactions
SELECT 
  transaction_number,
  created_at,
  total_amount,
  status,
  terminal_id
FROM transactions
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- Check for specific transaction
SELECT * FROM transactions 
WHERE transaction_number = 'TXN-20260215-000123';
```

**Solutions:**

#### 1. Network Interruption During Transaction

- Check network connectivity
- Verify transaction wasn't actually created (check database)
- If duplicate, void one transaction

#### 2. Inventory Insufficient

**Error:** `Insufficient inventory`

- Check product stock:
```sql
SELECT sku, product_name, quantity_in_stock 
FROM products 
WHERE sku = 'PROD-001';
```
- Receive inventory or adjust stock levels

#### 3. Database Constraint Violation

- Check backend logs for SQL errors
- May need to fix data integrity issues

---

## Database Issues

### Issue: Database Connection Pool Exhausted

**Symptoms:**
- Error: `connection pool exhausted`
- Slow API responses
- Terminals unable to complete transactions

**Diagnosis:**

```sql
-- Check active connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE datname = 'pos_production';

-- Check max connections
SHOW max_connections;

-- See who's connected
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  query
FROM pg_stat_activity
WHERE datname = 'pos_production';
```

**Solutions:**

```sql
-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'pos_production'
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';

-- Restart backend to reset connections
docker compose -f docker-compose.production.yml restart backend
```

### Issue: Database Growing Too Large

**Symptoms:**
- Disk space running out
- Slow query performance
- Backup taking too long

**Diagnosis:**

```sql
-- Check database size
SELECT pg_database_size('pos_production') / 1024 / 1024 as size_mb;

-- Check table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

**Solutions:**

```sql
-- Vacuum to reclaim space
VACUUM FULL;

-- Archive old data (transactions older than 1 year)
-- See ADMIN_GUIDE.md for archival procedures

-- Delete old logs if table exists
DELETE FROM application_logs 
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Issue: Slow Queries

**Symptoms:**
- Terminal operations slow
- Checkout taking 5+ seconds
- Reports timing out

**Diagnosis:**

```sql
-- Enable query stats (if not already enabled)
-- Requires pg_stat_statements extension

-- Find slow queries
SELECT 
  query,
  calls,
  mean_time,
  max_time,
  stddev_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC
LIMIT 10;

-- Check for missing indexes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
ORDER BY n_distinct DESC;
```

**Solutions:**

```sql
-- Analyze tables
ANALYZE;

-- Reindex database
REINDEX DATABASE pos_production;

-- Vacuum and analyze
VACUUM ANALYZE;

-- Consider adding indexes (consult developer)
```

---

## Network Issues

### Issue: High Latency Between Terminal and Server

**Symptoms:**
- Operations slow (3+ seconds)
- Frequent timeouts
- Inconsistent performance

**Diagnosis:**

```bash
# Test latency
ping -c 10 pos-server.yourcompany.com

# Continuous ping to monitor
ping pos-server.yourcompany.com

# Check route
traceroute pos-server.yourcompany.com  # Linux/Mac
tracert pos-server.yourcompany.com     # Windows
```

**Solutions:**

- Check network congestion
- Verify bandwidth capacity
- Consider QoS for POS traffic
- Move server closer to terminals (same network)
- Use wired connection instead of WiFi

### Issue: Intermittent Connection Drops

**Symptoms:**
- Terminal randomly disconnects
- "Server unavailable" errors
- Transactions fail mid-process

**Diagnosis:**

```bash
# Monitor connection stability
ping -c 1000 pos-server.yourcompany.com | grep -E 'transmitted|loss'

# Check server logs for connection resets
docker compose -f docker-compose.production.yml logs backend | grep -i 'connection reset'
```

**Solutions:**

- Check WiFi signal strength (if wireless)
- Replace network cable (if wired)
- Update network drivers
- Check router/switch for issues
- Consider network redundancy

---

## Authentication Issues

### Issue: JWT Token Expired

**Symptoms:**
- Error: "Token expired"
- Forced logout during session
- Must login frequently

**Diagnosis:**

```bash
# Check token expiry settings
grep JWT_ .env.production
```

**Solutions:**

```bash
# Increase token expiry (if too short)
# Edit .env.production
JWT_ACCESS_EXPIRY=1h    # Increase from 15m to 1h
JWT_REFRESH_EXPIRY=30d  # Increase from 7d to 30d

# Restart backend
docker compose -f docker-compose.production.yml restart backend
```

### Issue: All Users Logged Out After Server Restart

**Symptoms:**
- All terminals show login screen after server restart
- Sessions don't persist

**Expected Behavior:**
- This is normal after server restart
- JWT secrets change on restart if not persisted
- Users must re-login

**Solution:**
- This is by design for security
- To persist sessions, ensure JWT secrets are in .env.production
- Users simply need to log back in

---

## Performance Issues

### Issue: Server Running Slow

**Diagnosis:**

```bash
# Check resource usage
docker stats

# Check system resources
free -h      # Memory
df -h        # Disk
top          # CPU

# Check Docker volumes
docker system df
```

**Solutions:**

#### High CPU Usage
```bash
# Check which container
docker stats

# Check PostgreSQL queries
# See "Slow Queries" section above

# Check backend logs for errors
docker compose -f docker-compose.production.yml logs backend | grep ERROR
```

#### High Memory Usage
```bash
# Restart services to clear memory
docker compose -f docker-compose.production.yml restart

# Increase server RAM if consistently high
```

#### High Disk Usage
```bash
# Clean Docker
docker system prune -a

# Clean old backups
find backups/ -name "*.sql.gz" -mtime +30 -delete

# Archive old transactions
# See Database Administration section
```

---

## Emergency Procedures

### Server Completely Down

**Step 1: Assess the situation**
```bash
# Can you SSH in?
ssh admin@pos-server.yourcompany.com

# If yes, check Docker
docker ps

# If no SSH, check if server is powered on
# Physical access or remote console (IPMI/iLO) may be required
```

**Step 2: Quick recovery**
```bash
# Restart all services
cd /opt/pos-system
docker compose -f docker-compose.production.yml restart

# If that doesn't work
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d

# Check logs
docker compose -f docker-compose.production.yml logs -f
```

**Step 3: If server won't boot**
- Boot from recovery media
- Check disk health
- Restore from backup on new server

### Database Corruption

**Symptoms:**
- PostgreSQL won't start
- Data inconsistencies
- Foreign key violations

**Recovery:**
```bash
# Stop all services
docker compose -f docker-compose.production.yml down

# Restore from latest backup
./scripts/restore-database.sh backups/db_backup_YYYYMMDD_HHMMSS.sql.gz

# Start services
docker compose -f docker-compose.production.yml up -d

# Verify
curl http://localhost:3000/health
```

### Lost Admin Password

**Recovery:**
```bash
# Generate new password hash
node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('NewAdminPassword123', 10, (err, hash) => {
  if (err) throw err;
  console.log(hash);
});
"

# Update in database
docker compose -f docker-compose.production.yml exec postgres \
  psql -U pos_admin -d pos_production \
  -c "UPDATE users SET password_hash = '<hash-from-above>' WHERE username = 'admin';"

# Login with new password
```

---

## Diagnostic Commands Reference

### Server Health

```bash
# Quick health check
curl -k https://localhost/health

# Service status
docker compose -f docker-compose.production.yml ps

# Resource usage
docker stats --no-stream

# Disk space
df -h /opt/pos-system

# Recent logs
docker compose -f docker-compose.production.yml logs --tail=100
```

### Database Health

```sql
-- Connection count
SELECT count(*) FROM pg_stat_activity;

-- Database size
SELECT pg_database_size('pos_production') / 1024 / 1024 as size_mb;

-- Table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

-- Recent transactions
SELECT COUNT(*) FROM transactions WHERE created_at > NOW() - INTERVAL '24 hours';

-- Active terminals
SELECT COUNT(*) FROM terminals WHERE last_seen > NOW() - INTERVAL '5 minutes';
```

### Network Testing

```bash
# Test connectivity
ping -c 5 pos-server.yourcompany.com
curl -I https://pos-server.yourcompany.com
nslookup pos-server.yourcompany.com

# Test from terminal to server
curl -k https://pos-server.yourcompany.com/health

# Test authentication
curl -k -X POST https://pos-server.yourcompany.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## Log File Locations

### Server Logs

```bash
# Docker compose logs (all services)
docker compose -f docker-compose.production.yml logs

# Specific service logs
docker compose -f docker-compose.production.yml logs backend
docker compose -f docker-compose.production.yml logs postgres
docker compose -f docker-compose.production.yml logs redis
docker compose -f docker-compose.production.yml logs nginx

# Follow logs in real-time
docker compose -f docker-compose.production.yml logs -f backend

# Export logs to file
docker compose -f docker-compose.production.yml logs > /tmp/pos-logs.txt
```

### Terminal Logs

**Windows:**
- Application logs: `%APPDATA%\pos-terminal\logs\`
- Configuration: `%APPDATA%\pos-terminal\config.json`

**macOS:**
- Application logs: `~/Library/Logs/pos-terminal/`
- Configuration: `~/Library/Application Support/pos-terminal/config.json`

**Linux:**
- Application logs: `~/.config/pos-terminal/logs/`
- Configuration: `~/.config/pos-terminal/config.json`

### System Logs

**Ubuntu/Debian:**
```bash
# System logs
journalctl -u docker
journalctl -xe

# Auth logs
/var/log/auth.log

# Kernel logs
dmesg
```

---

## Getting Help

### Before Requesting Support

Gather the following information:

1. **System Information:**
   - Server OS and version
   - Docker version
   - POS System version
   - Terminal OS and version

2. **Error Information:**
   - Exact error message
   - When it started occurring
   - Steps to reproduce
   - Recent changes (if any)

3. **Diagnostic Output:**
   ```bash
   # Server health
   curl -k https://localhost/health
   docker compose -f docker-compose.production.yml ps
   
   # Recent logs
   docker compose -f docker-compose.production.yml logs --tail=100 > logs.txt
   ```

### Support Resources

1. **Documentation:**
   - [Server Deployment Guide](DEPLOYMENT_SERVER.md)
   - [Terminal Deployment Guide](DEPLOYMENT_TERMINAL.md)
   - [Administrator Guide](ADMIN_GUIDE.md)

2. **GitHub Issues:**
   - Search existing issues: https://github.com/agastya71/mysl-pos-project/issues
   - Create new issue with template

3. **Community:**
   - GitHub Discussions (if available)
   - Internal IT support team

---

**End of Troubleshooting Guide**
