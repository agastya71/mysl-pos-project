#!/bin/bash
# POS System Development Startup Script
# Run: chmod +x start-dev.sh && ./start-dev.sh

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
pg_isready -h localhost -p 5432 || {
  echo "❌ PostgreSQL failed to start"
  exit 1
}

echo "✓ Checking Redis..."
redis-cli ping || {
  echo "❌ Redis failed to start"
  exit 1
}

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
  if [ $i -eq 30 ]; then
    echo "❌ Backend failed to start after 30 seconds"
    kill $BACKEND_PID 2>/dev/null
    exit 1
  fi
done

# Start POS Client
echo "💻 Starting POS Client..."
cd pos-client
npm run dev:webpack &
POS_PID=$!
cd ..

# Wait for webpack
echo "⏳ Waiting for webpack to compile..."
sleep 8

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
echo "📖 Documentation: See DEVELOPMENT.md for more info"
echo ""
echo "Press Ctrl+C to stop all services"

# Trap Ctrl+C
trap "echo 'Stopping services...'; kill $BACKEND_PID $POS_PID 2>/dev/null; exit" INT

# Wait for user interrupt
wait
