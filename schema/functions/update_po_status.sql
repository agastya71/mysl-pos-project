/**
 * Auto-updates purchase order status based on received quantities
 * Triggered when any item's quantity_received changes
 *
 * Status Logic:
 *   - approved: No items received yet (total_received = 0)
 *   - partially_received: Some items received (0 < total_received < total_ordered)
 *   - received: All items fully received (total_received = total_ordered)
 *
 * Also sets delivery_date when PO reaches "received" status
 */
CREATE OR REPLACE FUNCTION update_po_status()
RETURNS TRIGGER AS $$
DECLARE
  total_ordered INTEGER;
  total_received INTEGER;
  po_status VARCHAR(20);
BEGIN
  -- Calculate totals across all line items for this PO
  SELECT SUM(quantity_ordered), SUM(quantity_received)
  INTO total_ordered, total_received
  FROM purchase_order_items
  WHERE purchase_order_id = NEW.purchase_order_id;

  -- Determine new status based on quantities
  IF total_received = 0 THEN
    po_status := 'approved';
  ELSIF total_received < total_ordered THEN
    po_status := 'partially_received';
  ELSE
    po_status := 'received';
  END IF;

  -- Update PO status and set delivery_date if fully received
  UPDATE purchase_orders
  SET status = po_status,
      delivery_date = CASE
        WHEN po_status = 'received' THEN CURRENT_DATE
        ELSE delivery_date
      END,
      updated_at = NOW()
  WHERE id = NEW.purchase_order_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
