-- Function to update customer total_spent and total_transactions
-- Called automatically when a transaction is created or voided

CREATE OR REPLACE FUNCTION update_customer_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT (new transaction completed)
  IF TG_OP = 'INSERT' THEN
    IF NEW.customer_id IS NOT NULL AND NEW.status = 'completed' THEN
      UPDATE customers
      SET
        total_spent = total_spent + NEW.total_amount,
        total_transactions = total_transactions + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE (transaction status changed)
  IF TG_OP = 'UPDATE' THEN
    -- Transaction voided: subtract from customer totals
    IF OLD.customer_id IS NOT NULL AND OLD.status = 'completed' AND NEW.status = 'voided' THEN
      UPDATE customers
      SET
        total_spent = total_spent - OLD.total_amount,
        total_transactions = total_transactions - 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.customer_id;
    END IF;

    -- Transaction completed (from draft): add to customer totals
    IF NEW.customer_id IS NOT NULL AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
      UPDATE customers
      SET
        total_spent = total_spent + NEW.total_amount,
        total_transactions = total_transactions + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.customer_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
