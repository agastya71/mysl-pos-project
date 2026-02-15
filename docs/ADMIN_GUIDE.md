# POS System - Administrator Guide

**Version:** 1.0.2
**Last Updated:** February 15, 2026
**Audience:** System Administrators, IT Managers

---

## Table of Contents

1. [Overview](#overview)
2. [Administrator Responsibilities](#administrator-responsibilities)
3. [Terminal Management](#terminal-management)
4. [Deploying a New Terminal](#deploying-a-new-terminal)
5. [Terminal Configuration](#terminal-configuration)
6. [User Management](#user-management)
7. [Monitoring Terminals](#monitoring-terminals)
8. [Terminal Updates](#terminal-updates)
9. [Troubleshooting](#troubleshooting)
10. [Database Administration](#database-administration)
11. [Security Management](#security-management)
12. [Backup and Recovery](#backup-and-recovery)

---

## Overview

This guide provides comprehensive procedures for administrators to manage the POS System infrastructure, including server maintenance, terminal deployment, user management, and system monitoring.

### System Architecture

```
┌─────────────────────────────────────────┐
│         Administrator Workstation        │
│  • SSH access to server                 │
│  • Database management tools            │
│  • Terminal deployment tools            │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│           POS Server (Central)          │
│  • PostgreSQL Database                  │
│  • Redis Cache                          │
│  • Backend API                          │
│  • Nginx (SSL/TLS)                      │
└───────────────┬─────────────────────────┘
                │ HTTPS
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐   ┌───▼───┐   ┌───▼───┐
│Term #1│   │Term #2│   │Term #3│
│Store A│   │Store A│   │Store B│
└───────┘   └───────┘   └───────┘
```

### Key Concepts

- **Server**: Centralized backend providing API, database, and cache services
- **Terminal**: Desktop application (Electron) running on Windows/macOS/Linux
- **Terminal Registration**: Automatic assignment of terminal ID on first login
- **Terminal Tracking**: Last seen timestamps for monitoring terminal health
- **User Assignment**: Each user assigned to a specific terminal
- **Role-Based Access Control (RBAC)**: Permissions controlled by user roles

---

## Administrator Responsibilities

### Daily Tasks

- [ ] Monitor server health and resource usage
- [ ] Review terminal connection status (last_seen timestamps)
- [ ] Check for failed transactions or errors in logs
- [ ] Verify backup completion

### Weekly Tasks

- [ ] Review user activity logs
- [ ] Check disk space on server and terminals
- [ ] Review and rotate old logs
- [ ] Verify all terminals are up-to-date

### Monthly Tasks

- [ ] Review and update user permissions
- [ ] Rotate JWT secrets (every 90 days recommended)
- [ ] Test disaster recovery procedures
- [ ] Review and archive old transaction data
- [ ] Update system documentation

### As Needed

- Deploy new terminals
- Decommission old terminals
- Create/modify user accounts
- Update terminal software
- Troubleshoot terminal issues
- Restore from backups

---

## Terminal Management

### Terminal Lifecycle

```
1. Registration → 2. Deployment → 3. Configuration → 4. Monitoring → 5. Decommissioning
     (DB)           (Physical)      (API URL)        (Health)        (Cleanup)
```

### Terminal States

| State | Description | Action Required |
|-------|-------------|-----------------|
| **Not Registered** | Terminal not in database | Register via SQL/API |
| **Registered** | In database, never connected | Deploy terminal app |
| **Active** | Connected within last 5 minutes | None (healthy) |
| **Idle** | Last seen 5-60 minutes ago | Monitor |
| **Offline** | Last seen > 60 minutes ago | Investigate |
| **Decommissioned** | Marked inactive | Archive data |

### Terminal Information

Each terminal has the following attributes:

```sql
-- Terminal table structure
terminals (
  id UUID PRIMARY KEY,
  terminal_number VARCHAR(20) UNIQUE,  -- e.g., TERM-000001
  location_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

## Deploying a New Terminal

### Prerequisites

- Server deployed and accessible via HTTPS
- Physical computer meeting terminal requirements
- Network connectivity to server
- Valid user account for initial login

### Step 1: Register Terminal in Database (Optional)

Terminals auto-register on first login, but you can pre-register them:

#### Option A: Via Database

```bash
# Connect to PostgreSQL
docker compose -f docker-compose.production.yml exec postgres \
  psql -U pos_admin -d pos_production

# Insert new terminal
INSERT INTO terminals (id, location_name, is_active)
VALUES (
  gen_random_uuid(),
  'Store A - Register 1',
  true
);

# Verify
SELECT terminal_number, location_name, is_active 
FROM terminals 
ORDER BY created_at DESC 
LIMIT 1;

# Exit
\q
```

#### Option B: Via API (Future Enhancement)

```bash
# Note: Terminal registration API not yet implemented
# Terminals currently auto-register on first login
```

### Step 2: Prepare Physical Terminal

1. **Install Operating System**:
   - Windows 10 or later (recommended: Windows 11)
   - macOS 11 or later (Big Sur or newer)
   - Ubuntu 20.04 or later

2. **Update System**:
   ```bash
   # Windows
   # Settings → Windows Update → Check for updates
   
   # macOS
   # System Preferences → Software Update
   
   # Linux
   sudo apt update && sudo apt upgrade -y
   ```

3. **Install Required Software**:
   - No additional software required (terminal is self-contained)

4. **Configure Network**:
   - Static IP recommended (or DHCP with reservation)
   - DNS configured correctly
   - Firewall allows outbound HTTPS (port 443)

### Step 3: Install Terminal Application

#### Download Installer

**From GitHub Releases:**

Visit: https://github.com/agastya71/mysl-pos-project/releases/latest

**Choose the correct installer:**

- **Windows**: `POS Terminal-Setup-1.0.2.exe` (recommended) or `POS Terminal-Portable-1.0.2.exe`
- **macOS Intel**: `POS Terminal-1.0.2.dmg`
- **macOS Apple Silicon**: `POS Terminal-1.0.2-arm64.dmg`
- **Linux**: `POS Terminal-1.0.2.AppImage` or `pos-client_1.0.2_amd64.deb`

#### Install Application

**Windows:**
```powershell
# Run installer with administrator privileges
.\POS-Terminal-Setup-1.0.2.exe

# Follow installation wizard
# Accept default installation path: C:\Program Files\POS Terminal
# Create desktop shortcut: Yes
# Launch on startup: Optional (recommended for dedicated terminals)
```

**macOS:**
```bash
# Mount DMG
open POS-Terminal-1.0.2.dmg

# Drag "POS Terminal" to Applications folder
# Eject DMG

# Launch application
open /Applications/POS\ Terminal.app

# Allow security exception if needed
# System Preferences → Security & Privacy → Open Anyway
```

**Linux (Ubuntu/Debian):**
```bash
# Option A: AppImage (universal)
chmod +x POS-Terminal-1.0.2.AppImage
./POS-Terminal-1.0.2.AppImage

# Option B: Debian package
sudo dpkg -i pos-client_1.0.2_amd64.deb
sudo apt-get install -f  # Fix dependencies if needed

# Launch
pos-terminal
```

### Step 4: Configure Terminal

1. **Launch Application**:
   - On first launch, application will prompt for server URL

2. **Enter Server URL**:
   ```
   https://pos-server.yourcompany.com
   ```
   
   Or use IP address:
   ```
   https://192.168.1.100
   ```

3. **Test Connection**:
   - Click "Test Connection" button
   - Should show green checkmark ✓
   - If fails, verify:
     - URL is correct (include https://)
     - Server is accessible from terminal network
     - Firewall allows outbound port 443
     - SSL certificate is valid (or accepted if self-signed)

4. **Save Configuration**:
   - Click "Save" to persist server URL

### Step 5: First Login

1. **Login with User Credentials**:
   ```
   Username: cashier1
   Password: <provided by admin>
   ```

2. **Automatic Terminal Assignment**:
   - On first successful login, terminal automatically registers
   - Terminal receives unique ID (e.g., TERM-000001)
   - Terminal ID displayed in bottom-right corner

3. **Update Terminal Location** (Optional):
   ```sql
   -- Update location name in database
   UPDATE terminals 
   SET location_name = 'Store A - Register 1' 
   WHERE terminal_number = 'TERM-000001';
   ```

### Step 6: Verify Operation

1. **Check Terminal Status in Database**:
   ```sql
   SELECT 
     terminal_number,
     location_name,
     is_active,
     last_seen,
     created_at
   FROM terminals
   WHERE terminal_number = 'TERM-000001';
   ```

2. **Test Core Functions**:
   - [ ] Product search works
   - [ ] Add items to cart
   - [ ] Complete cash transaction
   - [ ] Print receipt (if printer configured)
   - [ ] Verify transaction in database

3. **Configure Hardware** (if applicable):
   - Receipt printer
   - Barcode scanner
   - Cash drawer
   - Customer display

---

## Terminal Configuration

### Configuration Architecture

```
┌─────────────────────────────────────────┐
│          Server (Database)              │
│  • User assignments                     │
│  • Terminal registration                │
│  • Permissions (RBAC)                   │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│        Terminal (Local Config)          │
│  • API URL (config.json)                │
│  • Terminal ID (auto-assigned)          │
│  • Application settings                 │
└─────────────────────────────────────────┘
```

### Server-Side Configuration

Managed via PostgreSQL database:

```sql
-- View all terminals
SELECT 
  terminal_number,
  location_name,
  is_active,
  last_seen,
  AGE(NOW(), last_seen) as offline_duration
FROM terminals
ORDER BY last_seen DESC;

-- Update terminal location
UPDATE terminals 
SET location_name = 'Store B - Register 2'
WHERE terminal_number = 'TERM-000005';

-- Deactivate terminal
UPDATE terminals 
SET is_active = false
WHERE terminal_number = 'TERM-000005';

-- Reactivate terminal
UPDATE terminals 
SET is_active = true
WHERE terminal_number = 'TERM-000005';
```

### Client-Side Configuration

#### Configuration File Location

- **Windows**: `C:\Users\<username>\AppData\Roaming\pos-terminal\config.json`
- **macOS**: `~/Library/Application Support/pos-terminal/config.json`
- **Linux**: `~/.config/pos-terminal/config.json`

#### Configuration Format

```json
{
  "apiUrl": "https://pos-server.yourcompany.com",
  "terminalId": "TERM-000001",
  "autoUpdate": true,
  "updateCheckInterval": 3600000
}
```

#### Modify Configuration

**Option 1: Via Application** (Recommended)
- Settings → Server Configuration
- Enter new API URL
- Test connection
- Save

**Option 2: Manually Edit File**
```bash
# Windows
notepad %APPDATA%\pos-terminal\config.json

# macOS
nano ~/Library/Application\ Support/pos-terminal/config.json

# Linux
nano ~/.config/pos-terminal/config.json
```

After manual changes, restart the application.

---

## User Management

### User Roles and Permissions

The system supports role-based access control (RBAC):

| Role | Permissions | Use Case |
|------|-------------|----------|
| **Admin** | All permissions (35 total) | System administrators |
| **Manager** | 25 permissions | Store managers |
| **Supervisor** | 15 permissions | Shift supervisors |
| **Cashier** | 10 permissions | Front-line staff |

### Creating Users

#### Via Database

```sql
-- Connect to database
docker compose -f docker-compose.production.yml exec postgres \
  psql -U pos_admin -d pos_production

-- Create new user (password will be hashed)
INSERT INTO users (username, password_hash, first_name, last_name, email, role_id, is_active)
VALUES (
  'cashier2',
  -- Password: 'password123' (use bcrypt hash in production)
  '$2b$10$rQx8pBzYxkx5QLXK2K5xzOQ3xqH0xKF0xQxK0xKxQxK',
  'Jane',
  'Doe',
  'jane.doe@company.com',
  (SELECT id FROM roles WHERE name = 'cashier'),
  true
);

-- Assign user to terminal
UPDATE users
SET assigned_terminal_id = (
  SELECT id FROM terminals WHERE terminal_number = 'TERM-000001'
)
WHERE username = 'cashier2';
```

#### Via Web Interface (Future Enhancement)

User management UI planned for future release.

### Managing User Permissions

```sql
-- View user permissions
SELECT 
  u.username,
  r.name as role,
  p.resource,
  p.action
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.username = 'cashier1'
ORDER BY p.resource, p.action;

-- Change user role
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'supervisor')
WHERE username = 'cashier1';

-- Deactivate user
UPDATE users
SET is_active = false
WHERE username = 'cashier1';
```

### Resetting User Passwords

```bash
# Generate new password hash
node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('NewPassword123', 10, (err, hash) => {
  if (err) throw err;
  console.log(hash);
});
"

# Update in database
# Copy the hash output and use it in the SQL command:
```

```sql
UPDATE users
SET password_hash = '<bcrypt-hash-from-above>'
WHERE username = 'cashier1';
```

---

## Monitoring Terminals

### Real-Time Status Dashboard

#### Query All Terminals

```sql
SELECT 
  terminal_number,
  location_name,
  CASE 
    WHEN last_seen > NOW() - INTERVAL '5 minutes' THEN 'Active'
    WHEN last_seen > NOW() - INTERVAL '1 hour' THEN 'Idle'
    WHEN last_seen IS NULL THEN 'Never Connected'
    ELSE 'Offline'
  END as status,
  last_seen,
  AGE(NOW(), last_seen) as offline_duration,
  is_active
FROM terminals
ORDER BY 
  CASE 
    WHEN last_seen > NOW() - INTERVAL '5 minutes' THEN 1
    WHEN last_seen > NOW() - INTERVAL '1 hour' THEN 2
    WHEN last_seen IS NULL THEN 4
    ELSE 3
  END,
  terminal_number;
```

#### Find Offline Terminals

```sql
SELECT 
  terminal_number,
  location_name,
  last_seen,
  AGE(NOW(), last_seen) as offline_duration
FROM terminals
WHERE last_seen < NOW() - INTERVAL '1 hour'
  AND is_active = true
ORDER BY last_seen ASC;
```

#### Terminal Activity Summary

```sql
SELECT 
  DATE(t.created_at) as transaction_date,
  ter.terminal_number,
  ter.location_name,
  COUNT(t.id) as transaction_count,
  SUM(t.total_amount) as total_sales
FROM transactions t
JOIN terminals ter ON t.terminal_id = ter.id
WHERE t.created_at > NOW() - INTERVAL '7 days'
  AND t.status = 'completed'
GROUP BY DATE(t.created_at), ter.terminal_number, ter.location_name
ORDER BY transaction_date DESC, total_sales DESC;
```

### Monitoring Alerts

Set up automated alerts for offline terminals:

```bash
# Create monitoring script
cat > /opt/pos-system/scripts/check-terminals.sh << 'SCRIPT'
#!/bin/bash

OFFLINE_TERMINALS=$(docker compose -f /opt/pos-system/docker-compose.production.yml exec -T postgres \
  psql -U pos_admin -d pos_production -t -c \
  "SELECT terminal_number FROM terminals 
   WHERE last_seen < NOW() - INTERVAL '1 hour' 
   AND is_active = true;")

if [ -n "$OFFLINE_TERMINALS" ]; then
  echo "ALERT: Offline terminals detected:"
  echo "$OFFLINE_TERMINALS"
  # Send email alert
  echo "$OFFLINE_TERMINALS" | mail -s "POS Alert: Offline Terminals" admin@company.com
fi
SCRIPT

chmod +x /opt/pos-system/scripts/check-terminals.sh

# Schedule with cron (every 15 minutes)
crontab -e
# Add: */15 * * * * /opt/pos-system/scripts/check-terminals.sh
```

---

## Terminal Updates

### Update Strategy

#### Automatic Updates (Recommended)

- **Current Status**: Not yet implemented
- **Planned**: electron-updater integration
- **When Available**:
  - Terminals check for updates on startup
  - Updates download in background
  - User prompted to restart and apply update
  - Staged rollout to prevent mass disruption

#### Manual Updates (Current Method)

Update terminals by deploying new installer versions.

### Manual Update Procedure

#### Step 1: Test Update

1. Deploy update to test terminal first
2. Verify all functions work correctly
3. Test for 24-48 hours
4. If successful, proceed to production rollout

#### Step 2: Schedule Update Window

- **Best Time**: After business hours or during slow periods
- **Duration**: 10-15 minutes per terminal
- **Notify Users**: Inform staff of scheduled downtime

#### Step 3: Deploy Update

**Option A: Remote Update (if remote access available)**

```bash
# Download new installer to terminal
# Via PowerShell (Windows):
Invoke-WebRequest -Uri "https://github.com/.../POS-Terminal-Setup-1.0.3.exe" -OutFile "C:\Temp\POS-Terminal-Setup-1.0.3.exe"

# Close application
Stop-Process -Name "pos-terminal" -Force

# Run installer silently
Start-Process -FilePath "C:\Temp\POS-Terminal-Setup-1.0.3.exe" -ArgumentList "/S" -Wait

# Restart application
Start-Process "C:\Program Files\POS Terminal\pos-terminal.exe"
```

**Option B: On-Site Update**

1. Visit terminal location with USB drive containing new installer
2. Close POS Terminal application
3. Run new installer (will upgrade existing installation)
4. Launch application
5. Verify version in Help → About

#### Step 4: Verify Update

```sql
-- Query terminal activity to confirm reconnection
SELECT 
  terminal_number,
  location_name,
  last_seen,
  AGE(NOW(), last_seen) as since_last_seen
FROM terminals
WHERE terminal_number IN ('TERM-000001', 'TERM-000002', 'TERM-000003')
ORDER BY terminal_number;
```

### Staged Rollout Strategy

For large deployments (10+ terminals):

1. **Week 1**: Update 1-2 test terminals
2. **Week 2**: Update 20% of production terminals
3. **Week 3**: Update another 40% of terminals
4. **Week 4**: Update remaining 40% of terminals

This minimizes risk of widespread issues.

---

## Troubleshooting

### Terminal Cannot Connect to Server

**Symptoms**: "Connection failed" error, unable to login

**Diagnosis**:

1. **Check network connectivity**:
   ```bash
   # From terminal machine
   ping pos-server.yourcompany.com
   curl -I https://pos-server.yourcompany.com
   ```

2. **Verify server is running**:
   ```bash
   # On server
   docker compose -f docker-compose.production.yml ps
   curl http://localhost:3000/health
   ```

3. **Check API URL configuration**:
   - Settings → Server Configuration
   - Verify URL is correct (include https://)

**Solutions**:

- Fix network connectivity (firewall, DNS, routing)
- Restart server if down
- Correct API URL in terminal configuration
- Accept SSL certificate if self-signed

### Terminal Shows "Offline" in Database

**Symptoms**: Terminal works but last_seen timestamp not updating

**Diagnosis**:

This usually means the heartbeat mechanism is not yet implemented.

**Current Behavior**:
- Terminals update last_seen on login only
- No periodic heartbeat (planned for future release)

**Workaround**:
- Check recent transaction activity:
  ```sql
  SELECT 
    ter.terminal_number,
    MAX(t.created_at) as last_transaction
  FROM terminals ter
  LEFT JOIN transactions t ON ter.id = t.terminal_id
  WHERE ter.terminal_number = 'TERM-000001'
  GROUP BY ter.terminal_number;
  ```

### User Cannot Login

**Symptoms**: "Invalid credentials" or "User not found"

**Diagnosis**:

```sql
-- Check if user exists and is active
SELECT 
  username,
  is_active,
  role_id,
  assigned_terminal_id
FROM users
WHERE username = 'cashier1';
```

**Solutions**:

- Verify username is correct (case-sensitive)
- Check user is active: `UPDATE users SET is_active = true WHERE username = 'cashier1';`
- Reset password if forgotten (see User Management section)
- Verify user is assigned to a terminal

### Terminal Crashes or Freezes

**Symptoms**: Application unresponsive, frequent crashes

**Diagnosis**:

1. **Check system resources**:
   ```bash
   # Windows
   Task Manager → Performance
   
   # macOS
   Activity Monitor
   
   # Linux
   top
   htop
   ```

2. **Check application logs**:
   - **Windows**: `%APPDATA%\pos-terminal\logs\`
   - **macOS**: `~/Library/Logs/pos-terminal/`
   - **Linux**: `~/.config/pos-terminal/logs/`

**Solutions**:

- Ensure system meets minimum requirements (4GB RAM, modern CPU)
- Close other applications consuming resources
- Reinstall terminal application
- Update operating system
- Check for hardware issues (RAM, disk errors)

### Transactions Not Syncing

**Symptoms**: Transactions created but not appearing in database

**Diagnosis**:

```sql
-- Check recent transactions from terminal
SELECT 
  transaction_number,
  created_at,
  total_amount,
  status
FROM transactions
WHERE terminal_id = (SELECT id FROM terminals WHERE terminal_number = 'TERM-000001')
ORDER BY created_at DESC
LIMIT 10;
```

**Solutions**:

- Verify network connectivity
- Check backend logs for errors:
  ```bash
  docker compose -f docker-compose.production.yml logs backend | grep ERROR
  ```
- Verify database is not full:
  ```sql
  SELECT pg_database_size('pos_production') / 1024 / 1024 as size_mb;
  ```

---

## Database Administration

### Common Database Tasks

#### Vacuum Database (Monthly)

```sql
-- Reclaim storage and optimize
VACUUM ANALYZE;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Archive Old Transactions (Quarterly)

```sql
-- Create archive table
CREATE TABLE IF NOT EXISTS transactions_archive (
  LIKE transactions INCLUDING ALL
);

-- Move old transactions (older than 1 year)
WITH moved AS (
  DELETE FROM transactions
  WHERE created_at < NOW() - INTERVAL '1 year'
  RETURNING *
)
INSERT INTO transactions_archive SELECT * FROM moved;

-- Verify
SELECT COUNT(*) FROM transactions_archive;
```

#### Database Performance Tuning

```sql
-- Check slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Reindex if needed
REINDEX DATABASE pos_production;
```

---

## Security Management

### Security Checklist

- [ ] Change default admin password
- [ ] Rotate JWT secrets every 90 days
- [ ] Review user permissions monthly
- [ ] Monitor failed login attempts
- [ ] Keep server OS and Docker updated
- [ ] Use strong SSL certificates (not self-signed in production)
- [ ] Restrict SSH access (key-based only)
- [ ] Enable firewall on server
- [ ] Encrypt database backups
- [ ] Use VPN for remote administration

### Rotate JWT Secrets

```bash
# Generate new secrets
JWT_ACCESS_NEW=$(openssl rand -base64 32)
JWT_REFRESH_NEW=$(openssl rand -base64 32)

# Update .env.production
nano /opt/pos-system/.env.production
# Update JWT_ACCESS_SECRET and JWT_REFRESH_SECRET

# Restart backend
docker compose -f docker-compose.production.yml restart backend

# Important: All users must re-login after JWT rotation
```

### Monitor Security Events

```sql
-- Failed login attempts (requires audit logging)
-- Note: Audit logging not yet implemented

-- Active user sessions
SELECT 
  u.username,
  u.role_id,
  t.terminal_number,
  t.last_seen
FROM users u
JOIN terminals t ON u.assigned_terminal_id = t.id
WHERE t.last_seen > NOW() - INTERVAL '1 hour'
ORDER BY t.last_seen DESC;
```

---

## Backup and Recovery

### Backup Strategy

- **Database**: Daily automated backups at 3 AM
- **Retention**: 30 days on server, 90 days offsite
- **Offsite**: Weekly copy to remote storage (S3, SFTP)
- **Testing**: Monthly restore test to verify backups

### Manual Backup

```bash
# Full backup
cd /opt/pos-system
./scripts/backup-database.sh

# Verify backup
ls -lh backups/
```

### Restore Procedures

#### Restore Latest Backup

```bash
# Stop backend
docker compose -f docker-compose.production.yml stop backend

# Restore
cd /opt/pos-system
./scripts/restore-database.sh backups/db_backup_YYYYMMDD_HHMMSS.sql.gz

# Start backend
docker compose -f docker-compose.production.yml start backend

# Verify
curl http://localhost:3000/health
```

#### Point-in-Time Recovery

For critical data recovery, use PostgreSQL WAL archives (requires setup).

### Disaster Recovery

1. **Server Failure**:
   - Deploy new server following DEPLOYMENT_SERVER.md
   - Restore latest backup
   - Update DNS/IP for terminals
   - Verify all terminals reconnect

2. **Data Corruption**:
   - Restore from last known good backup
   - May lose recent transactions (since last backup)
   - Review and manually re-enter lost transactions

3. **Terminal Failure**:
   - Replace hardware
   - Install terminal application
   - Configure with same API URL
   - User logs in (terminal auto-registers or reuses existing)

---

## Support and Escalation

### Support Levels

**Level 1: Self-Service**
- Check this guide
- Review server logs
- Check terminal configuration
- Verify network connectivity

**Level 2: Database/System Admin**
- Database issues
- Server configuration
- User management
- Backup/restore

**Level 3: Developer Support**
- Application bugs
- Feature requests
- Complex troubleshooting
- GitHub Issues: https://github.com/agastya71/mysl-pos-project/issues

### Documentation

- **Server Deployment**: [DEPLOYMENT_SERVER.md](DEPLOYMENT_SERVER.md)
- **Terminal Deployment**: [DEPLOYMENT_TERMINAL.md](DEPLOYMENT_TERMINAL.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **User Guide**: [USER_GUIDE.md](USER_GUIDE.md)

---

**End of Administrator Guide**
