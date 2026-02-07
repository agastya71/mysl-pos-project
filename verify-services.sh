#!/bin/bash
# POS System Service Verification Script
# Run: chmod +x verify-services.sh && ./verify-services.sh

echo "🔍 Verifying all services..."
echo ""

ALL_OK=true

# Check PostgreSQL
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
  echo "✅ PostgreSQL is running on port 5432"
else
  echo "❌ PostgreSQL is not running"
  echo "   Start with: brew services start postgresql@14 (macOS)"
  echo "            or: sudo systemctl start postgresql (Linux)"
  ALL_OK=false
fi

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
  echo "✅ Redis is running"
else
  echo "❌ Redis is not running"
  echo "   Start with: brew services start redis (macOS)"
  echo "            or: sudo systemctl start redis (Linux)"
  ALL_OK=false
fi

# Check Backend
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Backend API is running on port 3000"
  HEALTH=$(curl -s http://localhost:3000/health | jq -r '.data.status')
  echo "   Status: $HEALTH"
else
  echo "❌ Backend API is not running"
  echo "   Start with: cd backend && npm run dev"
  ALL_OK=false
fi

# Check Frontend
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ POS Client is running on port 3001"
else
  echo "❌ POS Client is not running (HTTP $HTTP_CODE)"
  echo "   Start with: cd pos-client && npm run dev:webpack"
  ALL_OK=false
fi

echo ""
if [ "$ALL_OK" = true ]; then
  echo "✅ All services are running!"
  echo ""
  echo "📋 URLs:"
  echo "   Backend:  http://localhost:3000"
  echo "   Frontend: http://localhost:3001"
  echo ""
  echo "🔐 Login: admin / admin123"
  exit 0
else
  echo "❌ Some services are not running"
  echo ""
  echo "📖 See DEVELOPMENT.md for detailed setup instructions"
  exit 1
fi
