-- Trigger to update customer totals when transactions are created or updated

DROP TRIGGER IF EXISTS update_customer_totals_on_transaction ON transactions;

CREATE TRIGGER update_customer_totals_on_transaction
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_totals();
