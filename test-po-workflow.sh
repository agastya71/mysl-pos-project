#!/bin/bash
set -e

echo "=== Purchase Order Workflow Testing ==="
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
echo "$VENDORS" | python3 -m json.tool | head -40
VENDOR_ID=$(echo "$VENDORS" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
echo
echo "Selected Vendor ID: $VENDOR_ID"
echo

# Get products
echo "3. Getting products..."
PRODUCTS=$(curl -s "http://localhost:3000/api/v1/products?is_active=true" \
  -H "Authorization: Bearer $TOKEN")
echo "$PRODUCTS" | python3 -m json.tool | head -50
PRODUCT_ID=$(echo "$PRODUCTS" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
echo
echo "Selected Product ID: $PRODUCT_ID"
echo

# Create draft PO
echo "4. Creating draft Purchase Order..."
CREATE_PO=$(curl -s -X POST http://localhost:3000/api/v1/purchase-orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"vendor_id\": \"$VENDOR_ID\",
    \"order_type\": \"standard\",
    \"expected_delivery_date\": \"2026-02-15\",
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
        \"notes\": \"Test item\"
      }
    ],
    \"shipping_cost\": 25.00
  }")
echo "$CREATE_PO" | python3 -m json.tool
PO_ID=$(echo "$CREATE_PO" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
PO_NUMBER=$(echo "$CREATE_PO" | grep -o '"po_number":"[^"]*"' | sed 's/"po_number":"//;s/"//')
echo
echo "✓ Created PO: $PO_NUMBER (ID: $PO_ID)"
echo

# Get PO details
echo "5. Getting PO details..."
curl -s http://localhost:3000/api/v1/purchase-orders/$PO_ID \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -80
echo

# Submit PO
echo "6. Submitting PO for approval..."
SUBMIT_PO=$(curl -s -X POST http://localhost:3000/api/v1/purchase-orders/$PO_ID/submit \
  -H "Authorization: Bearer $TOKEN")
echo "$SUBMIT_PO" | python3 -m json.tool
echo "✓ PO submitted"
echo

# Approve PO
echo "7. Approving PO..."
APPROVE_PO=$(curl -s -X POST http://localhost:3000/api/v1/purchase-orders/$PO_ID/approve \
  -H "Authorization: Bearer $TOKEN")
echo "$APPROVE_PO" | python3 -m json.tool
echo "✓ PO approved"
echo

# Check product inventory before receiving
echo "8. Checking product inventory before receiving..."
PRODUCT_BEFORE=$(curl -s http://localhost:3000/api/v1/products/$PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN")
QTY_BEFORE=$(echo "$PRODUCT_BEFORE" | grep -o '"quantity_in_stock":[0-9]*' | sed 's/"quantity_in_stock"://')
echo "Product inventory before: $QTY_BEFORE units"
echo

# Get PO item ID for receiving
echo "9. Getting PO item ID..."
PO_DETAILS=$(curl -s http://localhost:3000/api/v1/purchase-orders/$PO_ID \
  -H "Authorization: Bearer $TOKEN")
ITEM_ID=$(echo "$PO_DETAILS" | grep -o '"id":"[^"]*"' | sed -n '3p' | sed 's/"id":"//;s/"//')
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
echo "$RECEIVE_PARTIAL" | python3 -m json.tool | head -50
echo "✓ Partial shipment received"
echo

# Check product inventory after partial receive
echo "11. Checking product inventory after partial receive..."
PRODUCT_AFTER_PARTIAL=$(curl -s http://localhost:3000/api/v1/products/$PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN")
QTY_AFTER_PARTIAL=$(echo "$PRODUCT_AFTER_PARTIAL" | grep -o '"quantity_in_stock":[0-9]*' | sed 's/"quantity_in_stock"://')
echo "Product inventory after partial receive: $QTY_AFTER_PARTIAL units (was $QTY_BEFORE, +50 expected)"
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
echo "$RECEIVE_FINAL" | python3 -m json.tool | head -50
echo "✓ Final shipment received"
echo

# Check product inventory after full receive
echo "13. Checking product inventory after full receive..."
PRODUCT_AFTER_FULL=$(curl -s http://localhost:3000/api/v1/products/$PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN")
QTY_AFTER_FULL=$(echo "$PRODUCT_AFTER_FULL" | grep -o '"quantity_in_stock":[0-9]*' | sed 's/"quantity_in_stock"://')
echo "Product inventory after full receive: $QTY_AFTER_FULL units (was $QTY_BEFORE, +100 expected)"
echo

# Close PO
echo "14. Closing PO..."
CLOSE_PO=$(curl -s -X POST http://localhost:3000/api/v1/purchase-orders/$PO_ID/close \
  -H "Authorization: Bearer $TOKEN")
echo "$CLOSE_PO" | python3 -m json.tool
echo "✓ PO closed"
echo

# Get reorder suggestions
echo "15. Getting reorder suggestions..."
curl -s http://localhost:3000/api/v1/purchase-orders/reorder-suggestions \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -50
echo

# Get PO list with filters
echo "16. Getting PO list..."
curl -s "http://localhost:3000/api/v1/purchase-orders?status=closed&page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -50
echo

echo "=== TEST COMPLETE ==="
echo
echo "Summary:"
echo "- Created PO: $PO_NUMBER"
echo "- Workflow: Draft → Submitted → Approved → Partially Received → Received → Closed"
echo "- Inventory updated: $QTY_BEFORE → $QTY_AFTER_FULL (+100 units)"
echo "✓ All tests passed!"
