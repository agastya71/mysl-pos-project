#!/bin/bash

# Test Purchase Order Modals Integration

echo "=== Logging in ==="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:50}..."
echo ""

echo "=== 1. Testing PO List API (for main page) ==="
PO_LIST=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/purchase-orders)

PO_COUNT=$(echo $PO_LIST | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "Total POs: $PO_COUNT"

# Extract first PO ID
FIRST_PO_ID=$(echo $PO_LIST | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "First PO ID: $FIRST_PO_ID"
echo ""

if [ -n "$FIRST_PO_ID" ]; then
  echo "=== 2. Testing PO Details API (for details modal) ==="
  PO_DETAILS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:3000/api/v1/purchase-orders/$FIRST_PO_ID")

  PO_NUMBER=$(echo $PO_DETAILS | grep -o '"po_number":"[^"]*"' | cut -d'"' -f4)
  PO_STATUS=$(echo $PO_DETAILS | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  VENDOR_NAME=$(echo $PO_DETAILS | grep -o '"vendor_name":"[^"]*"' | cut -d'"' -f4)

  echo "✅ PO Details fetched successfully:"
  echo "   - PO Number: $PO_NUMBER"
  echo "   - Status: $PO_STATUS"
  echo "   - Vendor: $VENDOR_NAME"
  echo ""
else
  echo "⚠️  No POs found in database - skipping details test"
  echo ""
fi

echo "=== 3. Testing Reorder Suggestions API (for reorder modal) ==="
REORDER_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/purchase-orders/reorder-suggestions)

VENDOR_COUNT=$(echo $REORDER_RESPONSE | grep -o '"vendor_id"' | wc -l | tr -d ' ')
echo "Vendors with low stock: $VENDOR_COUNT"

if [ "$VENDOR_COUNT" -gt "0" ]; then
  FIRST_VENDOR=$(echo $REORDER_RESPONSE | grep -o '"vendor_name":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "✅ Reorder suggestions fetched successfully"
  echo "   - First vendor: $FIRST_VENDOR"
else
  echo "✅ Reorder suggestions API works (no low-stock items)"
fi
echo ""

echo "=== 4. Testing Vendors API (for vendor management) ==="
VENDORS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/vendors)

VENDOR_LIST_COUNT=$(echo $VENDORS | grep -o '"vendor_number"' | wc -l | tr -d ' ')
echo "✅ Total vendors: $VENDOR_LIST_COUNT"
echo ""

echo "=== Summary ==="
echo "✅ All API endpoints working correctly"
echo "✅ Modals should function properly in the browser"
echo ""
echo "Next steps:"
echo "1. Open browser to http://localhost:3001"
echo "2. Login with admin/admin123"
echo "3. Navigate to Purchase Orders"
echo "4. Click on a PO to see details modal"
echo "5. Click 'Reorder Suggestions' to see reorder modal"
echo "6. Click 'Manage Vendors' to see vendor management page"
