#!/bin/bash

# Test Phase 3C Report APIs
# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing Phase 3C Report APIs"
echo "================================"
echo ""

# Get auth token
echo "📝 Getting auth token..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to get auth token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Got auth token${NC}"
echo ""

# Test 1: Low Stock Report
echo "1️⃣  Testing Low Stock Report"
echo "   GET /api/v1/inventory/reports/low-stock"
RESPONSE=$(curl -s http://localhost:3000/api/v1/inventory/reports/low-stock \
  -H "Authorization: Bearer $TOKEN")
SUCCESS=$(echo $RESPONSE | grep -o '"success":true')
if [ -n "$SUCCESS" ]; then
  COUNT=$(echo $RESPONSE | grep -o '"data":\[' | wc -l)
  echo -e "   ${GREEN}✅ Success${NC}"
  echo "   Response: $(echo $RESPONSE | jq -c '.data | length') products"
else
  echo -e "   ${RED}❌ Failed${NC}"
  echo "   Error: $(echo $RESPONSE | jq -r '.error.message')"
fi
echo ""

# Test 2: Out of Stock Report
echo "2️⃣  Testing Out of Stock Report"
echo "   GET /api/v1/inventory/reports/out-of-stock"
RESPONSE=$(curl -s http://localhost:3000/api/v1/inventory/reports/out-of-stock \
  -H "Authorization: Bearer $TOKEN")
SUCCESS=$(echo $RESPONSE | grep -o '"success":true')
if [ -n "$SUCCESS" ]; then
  echo -e "   ${GREEN}✅ Success${NC}"
  echo "   Response: $(echo $RESPONSE | jq -c '.data | length') products"
else
  echo -e "   ${RED}❌ Failed${NC}"
  echo "   Error: $(echo $RESPONSE | jq -r '.error.message')"
fi
echo ""

# Test 3: Valuation Report
echo "3️⃣  Testing Valuation Report"
echo "   GET /api/v1/inventory/reports/valuation"
RESPONSE=$(curl -s http://localhost:3000/api/v1/inventory/reports/valuation \
  -H "Authorization: Bearer $TOKEN")
SUCCESS=$(echo $RESPONSE | grep -o '"success":true')
if [ -n "$SUCCESS" ]; then
  echo -e "   ${GREEN}✅ Success${NC}"
  TOTAL=$(echo $RESPONSE | jq -r '.data.total_value')
  echo "   Total Value: \$$TOTAL"
else
  echo -e "   ${RED}❌ Failed${NC}"
  echo "   Error: $(echo $RESPONSE | jq -r '.error.message')"
fi
echo ""

# Test 4: Movement Report
echo "4️⃣  Testing Movement Report"
echo "   GET /api/v1/inventory/reports/movement?start_date=2026-02-01&end_date=2026-02-08"
RESPONSE=$(curl -s "http://localhost:3000/api/v1/inventory/reports/movement?start_date=2026-02-01&end_date=2026-02-08" \
  -H "Authorization: Bearer $TOKEN")
SUCCESS=$(echo $RESPONSE | grep -o '"success":true')
if [ -n "$SUCCESS" ]; then
  echo -e "   ${GREEN}✅ Success${NC}"
  echo "   Response: $(echo $RESPONSE | jq -c '.data | length') products with movements"
else
  echo -e "   ${RED}❌ Failed${NC}"
  echo "   Error: $(echo $RESPONSE | jq -r '.error.message')"
fi
echo ""

# Test 5: Category Summary Report
echo "5️⃣  Testing Category Summary Report"
echo "   GET /api/v1/inventory/reports/category-summary"
RESPONSE=$(curl -s http://localhost:3000/api/v1/inventory/reports/category-summary \
  -H "Authorization: Bearer $TOKEN")
SUCCESS=$(echo $RESPONSE | grep -o '"success":true')
if [ -n "$SUCCESS" ]; then
  echo -e "   ${GREEN}✅ Success${NC}"
  echo "   Response: $(echo $RESPONSE | jq -c '.data | length') categories"
else
  echo -e "   ${RED}❌ Failed${NC}"
  echo "   Error: $(echo $RESPONSE | jq -r '.error.message')"
fi
echo ""

echo "================================"
echo "✅ Testing complete!"
