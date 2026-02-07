# Development Guide

Complete guide for setting up and running the POS system for development.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Starting Services](#starting-services)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Development Workflow](#development-workflow)

---

## Prerequisites

### All Platforms

**Required Software:**
- Node.js 18+ and npm 9+
- PostgreSQL 14+
- Redis 7+
- Git

**Verify installations:**
```bash
node --version    # Should be 18+
npm --version     # Should be 9+
psql --version    # Should be 14+
redis-cli --version  # Should be 7+
```

### Platform-Specific Installation

#### macOS

```bash
# Using Homebrew
brew install node
brew install postgresql@14
brew install redis
brew install git

# Verify installations
brew services list
```

#### Windows

**Option 1: Using Chocolatey**
```powershell
# Run PowerShell as Administrator
choco install nodejs
choco install postgresql14
choco install redis
choco install git

# Verify installations
choco list --local-only
```

**Option 2: Manual Installation**
- Node.js: https://nodejs.org/
- PostgreSQL: https://www.postgresql.org/download/windows/
- Redis: https://github.com/microsoftarchive/redis/releases (or use WSL)
- Git: https://git-scm.com/download/win

#### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 14
sudo apt install -y postgresql-14 postgresql-contrib-14

# Install Redis
sudo apt install -y redis-server

# Install Git
sudo apt install -y git

# Verify installations
node --version
psql --version
redis-cli --version
```

#### Linux (Fedora/RHEL/CentOS)

```bash
# Install Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Install PostgreSQL 14
sudo dnf install -y postgresql14-server postgresql14-contrib

# Install Redis
sudo dnf install -y redis

# Install Git
sudo dnf install -y git
```

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd pos-system
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install --legacy-peer-deps

# Install backend dependencies
cd backend
npm install

# Install POS client dependencies
cd ../pos-client
npm install

# Install admin dashboard dependencies (optional)
cd ../admin-dashboard
npm install

# Return to root
cd ..
```

### 3. Database Setup

#### macOS
```bash
# Start PostgreSQL
brew services start postgresql@14

# Wait 3 seconds for startup
sleep 3

# Create database and user
psql postgres << EOF
CREATE DATABASE pos_db;
CREATE USER pos_user WITH ENCRYPTED PASSWORD 'pos_password_dev';
GRANT ALL PRIVILEGES ON DATABASE pos_db TO pos_user;
ALTER DATABASE pos_db OWNER TO pos_user;
\q
EOF
```

#### Windows
```powershell
# Start PostgreSQL service
net start postgresql-x64-14

# Or using pg_ctl
pg_ctl -D "C:\Program Files\PostgreSQL\14\data" start

# Create database and user
psql -U postgres << EOF
CREATE DATABASE pos_db;
CREATE USER pos_user WITH ENCRYPTED PASSWORD 'pos_password_dev';
GRANT ALL PRIVILEGES ON DATABASE pos_db TO pos_user;
ALTER DATABASE pos_db OWNER TO pos_user;
\q
EOF
```

#### Linux
```bash
# Start PostgreSQL
sudo systemctl start postgresql
# Or for older systems
sudo service postgresql start

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE pos_db;
CREATE USER pos_user WITH ENCRYPTED PASSWORD 'pos_password_dev';
GRANT ALL PRIVILEGES ON DATABASE pos_db TO pos_user;
ALTER DATABASE pos_db OWNER TO pos_user;
\q
EOF
```

### 4. Apply Database Schema

```bash
cd pos-system

# Apply table schemas (3 passes for dependencies)
for i in {1..3}; do
  for file in schema/tables/*.sql; do
    psql -U pos_user -d pos_db -f "$file" 2>/dev/null
  done
done

# Apply functions
for file in schema/functions/*.sql; do
  psql -U pos_user -d pos_db -f "$file"
done

# Apply triggers
for file in schema/triggers/*.sql; do
  psql -U pos_user -d pos_db -f "$file"
done

# Mark migrations as complete
psql -U pos_user -d pos_db << 'EOF'
INSERT INTO schema_migrations (migration_name) VALUES
('table_categories'), ('table_terminals'),
('table_users'), ('table_vendors'), ('table_customers'),
('table_products'), ('table_sessions'), ('table_system_settings'),
('table_transactions'), ('table_purchase_orders'), ('table_inventory_count_sessions'), ('table_price_history'),
('table_transaction_items'), ('table_payments'), ('table_purchase_order_items'), ('table_inventory_receiving'), ('table_donations'), ('table_accounts_payable'), ('table_inventory_counts'),
('table_payment_details'), ('table_refunds'), ('table_receiving_items'), ('table_vendor_payments'), ('table_inventory_reconciliations'), ('table_inventory_adjustments'),
('table_payment_allocations'), ('table_import_batches'), ('table_import_batch_items'), ('table_inventory_snapshots'), ('table_audit_log'),
('function_generate_transaction_number'), ('function_update_inventory_on_transaction'), ('function_update_updated_at'),
('trigger_update_inventory'), ('trigger_update_timestamps')
ON CONFLICT (migration_name) DO NOTHING;
EOF
```

### 5. Seed Database

```bash
cd backend
npx ts-node src/database/seed.ts
```

**Default credentials created:**
- Username: `admin`
- Password: `admin123`

### 6. Configure Environment

```bash
# Backend environment
cd backend
cp .env.example .env

# POS Client environment (optional)
cd ../pos-client
# No .env needed for development (uses localhost:3000)

# Return to root
cd ..
```

---

## Starting Services

### Quick Start (All Services)

Create a startup script for your platform:

#### macOS/Linux: `start-dev.sh`

```bash
#!/bin/bash
# Save this as start-dev.sh and run: chmod +x start-dev.sh && ./start-dev.sh

echo "🚀 Starting POS System Development Environment..."

# Start PostgreSQL
echo "📊 Starting PostgreSQL..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  brew services start postgresql@14
else
  sudo systemctl start postgresql
fi
sleep 2

# Start Redis
echo "🔴 Starting Redis..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  brew services start redis
else
  sudo systemctl start redis
fi
sleep 2

# Verify services
echo "✓ Checking PostgreSQL..."
pg_isready -h localhost -p 5432

echo "✓ Checking Redis..."
redis-cli ping

# Start Backend API
echo "🔧 Starting Backend API..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ Backend API ready!"
    break
  fi
  sleep 1
done

# Start POS Client
echo "💻 Starting POS Client..."
cd pos-client
npm run dev:webpack &
POS_PID=$!
cd ..

# Wait for webpack
sleep 5

echo ""
echo "✅ All services started!"
echo ""
echo "📋 Service URLs:"
echo "   Backend API:  http://localhost:3000"
echo "   Health Check: http://localhost:3000/health"
echo "   POS Client:   http://localhost:3001"
echo ""
echo "🔐 Login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
wait
```

#### Windows: `start-dev.bat`

```batch
@echo off
REM Save this as start-dev.bat and run it

echo 🚀 Starting POS System Development Environment...

REM Start PostgreSQL
echo 📊 Starting PostgreSQL...
net start postgresql-x64-14
timeout /t 2 /nobreak > NUL

REM Start Redis
echo 🔴 Starting Redis...
net start Redis
timeout /t 2 /nobreak > NUL

REM Verify services
echo ✓ Checking PostgreSQL...
pg_isready -h localhost -p 5432

echo ✓ Checking Redis...
redis-cli ping

REM Start Backend API in new window
echo 🔧 Starting Backend API...
start "Backend API" cmd /k "cd backend && npm run dev"

REM Wait for backend
echo ⏳ Waiting for backend to start...
timeout /t 10 /nobreak > NUL

REM Start POS Client in new window
echo 💻 Starting POS Client...
start "POS Client" cmd /k "cd pos-client && npm run dev:webpack"

echo.
echo ✅ All services started!
echo.
echo 📋 Service URLs:
echo    Backend API:  http://localhost:3000
echo    Health Check: http://localhost:3000/health
echo    POS Client:   http://localhost:3001
echo.
echo 🔐 Login credentials:
echo    Username: admin
echo    Password: admin123
echo.
echo Press any key to exit...
pause > NUL
```

#### Windows PowerShell: `start-dev.ps1`

```powershell
# Save this as start-dev.ps1 and run: .\start-dev.ps1

Write-Host "🚀 Starting POS System Development Environment..." -ForegroundColor Green

# Start PostgreSQL
Write-Host "📊 Starting PostgreSQL..." -ForegroundColor Cyan
Start-Service -Name postgresql-x64-14
Start-Sleep -Seconds 2

# Start Redis
Write-Host "🔴 Starting Redis..." -ForegroundColor Red
Start-Service -Name Redis
Start-Sleep -Seconds 2

# Verify services
Write-Host "✓ Checking PostgreSQL..." -ForegroundColor Green
& pg_isready -h localhost -p 5432

Write-Host "✓ Checking Redis..." -ForegroundColor Green
& redis-cli ping

# Start Backend API
Write-Host "🔧 Starting Backend API..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Wait for backend
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Start POS Client
Write-Host "💻 Starting POS Client..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd pos-client; npm run dev:webpack"

Write-Host ""
Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Service URLs:"
Write-Host "   Backend API:  http://localhost:3000"
Write-Host "   Health Check: http://localhost:3000/health"
Write-Host "   POS Client:   http://localhost:3001"
Write-Host ""
Write-Host "🔐 Login credentials:"
Write-Host "   Username: admin"
Write-Host "   Password: admin123"
Write-Host ""
Write-Host "Close the terminal windows to stop services"
```

### Manual Service Startup

#### 1. Start PostgreSQL

**macOS:**
```bash
brew services start postgresql@14
# Or manually:
pg_ctl -D /opt/homebrew/var/postgresql@14 start
```

**Windows:**
```powershell
net start postgresql-x64-14
# Or:
pg_ctl -D "C:\Program Files\PostgreSQL\14\data" start
```

**Linux:**
```bash
sudo systemctl start postgresql
# Or:
sudo service postgresql start
```

#### 2. Start Redis

**macOS:**
```bash
brew services start redis
# Or manually:
redis-server /opt/homebrew/etc/redis.conf
```

**Windows:**
```powershell
net start Redis
# Or manually:
redis-server "C:\Program Files\Redis\redis.windows.conf"
```

**Linux:**
```bash
sudo systemctl start redis
# Or:
sudo service redis-server start
```

#### 3. Start Backend API

```bash
cd backend
npm run dev
```

**Expected output:**
```
[INFO] Starting POS Backend Server...
[INFO] Database connection established
[INFO] Redis client connected
[INFO] Database migrations completed successfully
[INFO] Server is running on port 3000
[INFO] Health check: http://localhost:3000/health
```

#### 4. Start POS Client

```bash
# In a new terminal
cd pos-client
npm run dev:webpack
```

**Expected output:**
```
webpack 5.105.0 compiled successfully in 1150 ms
```

---

## Verification

### Check All Services

```bash
# PostgreSQL
pg_isready -h localhost -p 5432
# Expected: localhost:5432 - accepting connections

# Redis
redis-cli ping
# Expected: PONG

# Backend API
curl http://localhost:3000/health
# Expected: {"success":true,"data":{"status":"healthy",...}}

# POS Client
curl -I http://localhost:3001
# Expected: HTTP/1.1 200 OK
```

### Service Status Commands

**macOS:**
```bash
brew services list | grep -E "postgresql|redis"
```

**Windows:**
```powershell
Get-Service | Where-Object {$_.Name -like "*postgres*" -or $_.Name -like "*redis*"}
```

**Linux:**
```bash
systemctl status postgresql redis
```

---

## Troubleshooting

### PostgreSQL Issues

**Problem: Port 5432 already in use**
```bash
# Find process using port
lsof -ti:5432  # macOS/Linux
netstat -ano | findstr :5432  # Windows

# Kill stale postgres
pkill -9 postgres  # macOS/Linux

# Remove stale PID file
rm /opt/homebrew/var/postgresql@14/postmaster.pid  # macOS
```

**Problem: Can't connect to database**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Restart PostgreSQL
brew services restart postgresql@14  # macOS
sudo systemctl restart postgresql    # Linux
net stop postgresql-x64-14 && net start postgresql-x64-14  # Windows
```

**Problem: Database doesn't exist**
```bash
# Recreate database
psql postgres -c "CREATE DATABASE pos_db;"
psql postgres -c "CREATE USER pos_user WITH PASSWORD 'pos_password_dev';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE pos_db TO pos_user;"
```

### Redis Issues

**Problem: Redis connection refused**
```bash
# Check if Redis is running
redis-cli ping

# Restart Redis
brew services restart redis  # macOS
sudo systemctl restart redis # Linux
net stop Redis && net start Redis  # Windows
```

### Backend Issues

**Problem: Port 3000 already in use**
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows (note PID, then: taskkill /PID <pid> /F)
```

**Problem: Database connection failed**
```bash
# Verify .env file exists
cat backend/.env

# Test database connection
psql -U pos_user -d pos_db -c "SELECT 1;"
```

### Frontend Issues

**Problem: Webpack compilation errors**
```bash
# Clear cache and reinstall
cd pos-client
rm -rf node_modules package-lock.json dist
npm install
npm run dev:webpack
```

**Problem: Blank page in browser**
```bash
# Clear browser cache (Ctrl+Shift+Delete)
# Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
# Check browser console for errors (F12)
```

---

## Development Workflow

### Daily Startup Checklist

1. ✅ Start PostgreSQL
2. ✅ Start Redis
3. ✅ Start Backend API (wait for "Server is running")
4. ✅ Start POS Client
5. ✅ Verify http://localhost:3001 loads
6. ✅ Login with admin/admin123

### Before Starting New Phase

Run the verification script:

```bash
#!/bin/bash
# verify-services.sh

echo "🔍 Verifying all services..."

# Check PostgreSQL
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
  echo "✅ PostgreSQL is running"
else
  echo "❌ PostgreSQL is not running"
  exit 1
fi

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
  echo "✅ Redis is running"
else
  echo "❌ Redis is not running"
  exit 1
fi

# Check Backend
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Backend API is running"
else
  echo "❌ Backend API is not running"
  exit 1
fi

# Check Frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
  echo "✅ POS Client is running"
else
  echo "❌ POS Client is not running"
  exit 1
fi

echo ""
echo "✅ All services are running!"
echo ""
echo "📋 URLs:"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:3001"
```

### Stopping Services

**macOS:**
```bash
# Stop services
brew services stop postgresql@14
brew services stop redis

# Stop running terminals (Ctrl+C in each)
```

**Windows:**
```powershell
# Stop services
net stop postgresql-x64-14
net stop Redis

# Close terminal windows running backend/frontend
```

**Linux:**
```bash
# Stop services
sudo systemctl stop postgresql
sudo systemctl stop redis

# Stop running terminals (Ctrl+C in each)
```

---

## Testing Services

### Quick Test Script

```bash
#!/bin/bash
# test-services.sh

echo "Testing POS System..."

# Get auth token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.tokens.accessToken')

echo "✅ Authentication: $TOKEN"

# List products
PRODUCTS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/products)
echo "✅ Products API: $(echo $PRODUCTS | jq '.data.products | length') products found"

# List transactions
TRANSACTIONS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/transactions)
echo "✅ Transactions API: $(echo $TRANSACTIONS | jq '.data | length') transactions found"

echo ""
echo "✅ All API endpoints working!"
```

---

## Additional Resources

- **PostgreSQL Documentation**: https://www.postgresql.org/docs/14/
- **Redis Documentation**: https://redis.io/docs/
- **Node.js Documentation**: https://nodejs.org/docs/
- **Webpack Documentation**: https://webpack.js.org/

---

**Last Updated:** 2026-02-07
