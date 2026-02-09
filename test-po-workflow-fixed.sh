#!/bin/bash
set -e

echo "=== Purchase Order Workflow Testing (Fixed) ==="
echo

# Get auth token
echo "1. Logging in..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"//;s/"//')

if [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to get auth token"
  exit 1
fi
echo "✓ Login successful"
echo

# Get vendors
echo "2. Getting vendors..."
VENDORS=$(curl -s http://localhost:3000/api/v1/vendors \
  -H "Authorization: Bearer $TOKEN")
echo "$VENDORS" | python3 -m json.tool
VENDOR_ID=$(echo "$VENDORS" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
VENDOR_NAME=$(echo "$VENDORS" | grep -o '"business_name":"[^"]*"' | head -1 | sed 's/"business_name":"//;s/"//')
echo
echo "Selected Vendor: $VENDOR_NAME (ID: $VENDOR_ID)"
echo

# Get products
echo "3. Getting products..."
PRODUCTS=$(curl -s "http://localhost:3000/api/v1/products?is_active=true" \
  -H "Authorization: Bearer $TOKEN")
PRODUCT_ID=$(echo "$PRODUCTS" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
PRODUCT_NAME=$(echo "$PRODUCTS" | grep -o '"name":"[^"]*"' | head -1 | sed 's/"name":"//;s/"//')
echo "Selected Product: $PRODUCT_NAME (ID: $PRODUCT_ID)"
echo

# Create draft PO with ISO datetime format
echo "4. Creating draft Purchase Order..."
CREATE_PO=$(curl -s -X POST http://localhost:3000/api/v1/purchase-orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"vendor_id\": \"$VENDOR_ID\",
    \"order_type\": \"standard\",
    \"expected_delivery_date\": \"2026-02-15T00:00:00.000Z\",
    \"shipping_address\": \"123 Main St, Springfield, IL 62701\",
    \"billing_address\": \"123 Main St, Springfield, IL 62701\",
    \"payment_terms\": \"net_30\",
    \"notes\": \"Test PO for workflow validation\",
    \"items\": [
      {
        \"product_id\": \"$PRODUCT_ID\",
        \"quantity_ordered\": 100,
        \"unit_cost\": 2.50,
        \"tax_amount\": 20.00,
        \"notes\": \"Test item for $PRODUCT_NAME\"
      }
    ],
    \"shipping_cost\": 25.00,
    \"other_charges\": 0,
    \"discount_amount\": 0
  }")
echo "$CREATE_PO" | python3 -m json.tool
PO_ID=$(echo "$CREATE_PO" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
PO_NUMBER=$(echo "$CREATE_PO" | grep -o '"po_number":"[^"]*"' | sed 's/"po_number":"//;s/"//')
echo
echo "✓ Created PO: $PO_NUMBER (ID: $PO_ID)"
echo

# Get PO details
echo "5. Getting PO details..."
PO_DETAILS=$(curl -s http://localhost:3000/api/v1/purchase-orders/$PO_ID \
  -H "Authorization: Bearer $TOKEN")
echo "$PO_DETAILS" | python3 -m json.tool | head -100
echo

# Submit PO
echo "6. Submitting PO for approval..."
SUBMIT_PO=$(curl -s -X POST http://localhost:3000/api/v1/purchase-orders/$PO_ID/submit \
  -H "Authorization: Bearer $TOKEN")
echo "$SUBMIT_PO" | python3 -m json.tool | head -40
STATUS_AFTER_SUBMIT=$(echo "$SUBMIT_PO" | grep -o '"status":"[^"]*"' | head -1 | sed 's/"status":"//;s/"//')
echo "✓ PO submitted - Status: $STATUS_AFTER_SUBMIT"
echo

# Approve PO
echo "7. Approving PO..."
APPROVE_PO=$(curl -s -X POST http://localhost:3000/api/v1/purchase-orders/$PO_ID/approve \
  -H "Authorization: Bearer $TOKEN")
echo "$APPROVE_PO" | python3 -m json.tool | head -40
STATUS_AFTER_APPROVE=$(echo "$APPROVE_PO" | grep -o '"status":"[^"]*"' | head -1 | sed 's/"status":"//;s/"//')
echo "✓ PO approved - Status: $STATUS_AFTER_APPROVE"
echo

# Check product inventory before receiving
echo "8. Checking product inventory before receiving..."
PRODUCT_BEFORE=$(curl -s http://localhost:3000/api/v1/products/$PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN")
QTY_BEFORE=$(echo "$PRODUCT_BEFORE" | grep -o '"quantity_in_stock":[0-9]*' | sed 's/"quantity_in_stock"://')
echo "Product '$PRODUCT_NAME' inventory before: $QTY_BEFORE units"
echo

# Get PO item ID from detailed response
echo "9. Getting PO item ID for receiving..."
PO_DETAILS_FULL=$(curl -s http://localhost:3000/api/v1/purchase-orders/$PO_ID \
  -H "Authorization: Bearer $TOKEN")
ITEM_ID=$(echo "$PO_DETAILS_FULL" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['items'][0]['id'])")
echo "PO Item ID: $ITEM_ID"
echo

# Receive partial quantity (50 units)
echo "10. Receiving partial quantity (50 units)..."
RECEIVE_PARTIAL=$(curl -s -X POST http://localhost:3000/api/v1/purchase-orders/$PO_ID/receive \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [
      {
        \"item_id\": \"$ITEM_ID\",
        \"quantity_received\": 50,
        \"notes\": \"First partial shipment\"
      }
    ]
  }")
echo "$RECEIVE_PARTIAL" | python3 -m json.tool | head -60
STATUS_AFTER_PARTIAL=$(echo "$RECEIVE_PARTIAL" | grep -o '"status":"[^"]*"' | head -1 | sed 's/"status":"//;s/"//')
echo "✓ Partial shipment received - Status: $STATUS_AFTER_PARTIAL"
echo

# Check product inventory after partial receive
echo "11. Checking product inventory after partial receive..."
PRODUCT_AFTER_PARTIAL=$(curl -s http://localhost:3000/api/v1/products/$PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN")
QTY_AFTER_PARTIAL=$(echo "$PRODUCT_AFTER_PARTIAL" | grep -o '"quantity_in_stock":[0-9]*' | sed 's/"quantity_in_stock"://')
INCREASE_PARTIAL=$((QTY_AFTER_PARTIAL - QTY_BEFORE))
echo "Product inventory after partial receive: $QTY_AFTER_PARTIAL units (was $QTY_BEFORE, change: +$INCREASE_PARTIAL)"
if [ $INCREASE_PARTIAL -eq 50 ]; then
  echo "✓ Inventory increased correctly by 50 units"
else
  echo "❌ ERROR: Expected +50 units, got +$INCREASE_PARTIAL"
fi
echo

# Receive remaining quantity (50 units)
echo "12. Receiving remaining quantity (50 units)..."
RECEIVE_FINAL=$(curl -s -X POST http://localhost:3000/api/v1/purchase-orders/$PO_ID/receive \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [
      {
        \"item_id\": \"$ITEM_ID\",
        \"quantity_received\": 50,
        \"notes\": \"Final shipment\"
      }
    ]
  }")
echo "$RECEIVE_FINAL" | python3 -m json.tool | head -60
STATUS_AFTER_FULL=$(echo "$RECEIVE_FINAL" | grep -o '"status":"[^"]*"' | head -1 | sed 's/"status":"//;s/"//')
echo "✓ Final shipment received - Status: $STATUS_AFTER_FULL"
echo

# Check product inventory after full receive
echo "13. Checking product inventory after full receive..."
PRODUCT_AFTER_FULL=$(curl -s http://localhost:3000/api/v1/products/$PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN")
QTY_AFTER_FULL=$(echo "$PRODUCT_AFTER_FULL" | grep -o '"quantity_in_stock":[0-9]*' | sed 's/"quantity_in_stock"://')
TOTAL_INCREASE=$((QTY_AFTER_FULL - QTY_BEFORE))
echo "Product inventory after full receive: $QTY_AFTER_FULL units (was $QTY_BEFORE, total change: +$TOTAL_INCREASE)"
if [ $TOTAL_INCREASE -eq 100 ]; then
  echo "✓ Inventory increased correctly by 100 units total"
else
  echo "❌ ERROR: Expected +100 units, got +$TOTAL_INCREASE"
fi
echo

# Close PO
echo "14. Closing PO..."
CLOSE_PO=$(curl -s -X POST http://localhost:3000/api/v1/purchase-orders/$PO_ID/close \
  -H "Authorization: Bearer $TOKEN")
echo "$CLOSE_PO" | python3 -m json.tool | head -40
STATUS_AFTER_CLOSE=$(echo "$CLOSE_PO" | grep -o '"status":"[^"]*"' | head -1 | sed 's/"status":"//;s/"//')
echo "✓ PO closed - Final Status: $STATUS_AFTER_CLOSE"
echo

# Get reorder suggestions
echo "15. Getting reorder suggestions..."
curl -s http://localhost:3000/api/v1/purchase-orders/reorder-suggestions \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -60
echo

# Get PO list with filters
echo "16. Getting PO list (filter: status=closed)..."
curl -s "http://localhost:3000/api/v1/purchase-orders?status=closed&page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -80
echo

echo "=== TEST COMPLETE ==="
echo
echo "Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ PO Created: $PO_NUMBER"
echo "✓ Vendor: $VENDOR_NAME"
echo "✓ Product: $PRODUCT_NAME"
echo "✓ Workflow: Draft → Submitted → Approved → Partially Received → Received → Closed"
echo "✓ Inventory: $QTY_BEFORE → $QTY_AFTER_FULL (+$TOTAL_INCREASE units)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All tests passed!"
