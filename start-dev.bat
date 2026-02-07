@echo off
REM POS System Development Startup Script for Windows
REM Run: start-dev.bat

echo 🚀 Starting POS System Development Environment...
echo.

REM Start PostgreSQL
echo 📊 Starting PostgreSQL...
net start postgresql-x64-14 >nul 2>&1
if errorlevel 1 (
  echo    PostgreSQL may already be running or failed to start
) else (
  echo    PostgreSQL started successfully
)
timeout /t 2 /nobreak > NUL

REM Start Redis
echo 🔴 Starting Redis...
net start Redis >nul 2>&1
if errorlevel 1 (
  echo    Redis may already be running or failed to start
) else (
  echo    Redis started successfully
)
timeout /t 2 /nobreak > NUL

REM Verify PostgreSQL
echo ✓ Checking PostgreSQL...
pg_isready -h localhost -p 5432 >nul 2>&1
if errorlevel 1 (
  echo    ❌ PostgreSQL is not responding
  goto :error
)
echo    PostgreSQL is ready

REM Verify Redis
echo ✓ Checking Redis...
redis-cli ping >nul 2>&1
if errorlevel 1 (
  echo    ❌ Redis is not responding
  goto :error
)
echo    Redis is ready

echo.
echo 🔧 Starting Backend API...
start "POS Backend API" cmd /k "cd backend && npm run dev"

echo ⏳ Waiting for backend to start...
timeout /t 10 /nobreak > NUL

echo 💻 Starting POS Client...
start "POS Client Webpack" cmd /k "cd pos-client && npm run dev:webpack"

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
echo 📖 Documentation: See DEVELOPMENT.md for more info
echo.
echo Press any key to exit this window (services will keep running)...
pause > NUL
exit /b 0

:error
echo.
echo ❌ Failed to start some services
echo 📖 See DEVELOPMENT.md for troubleshooting
echo.
pause
exit /b 1
