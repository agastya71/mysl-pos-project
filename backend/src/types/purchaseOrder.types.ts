/**
 * Type definitions for Purchase Order management
 * Covers PO lifecycle: draft → submitted → approved → received → closed
 */

/**
 * Purchase order status states
 * Workflow: draft → submitted → approved → partially_received → received → closed
 * Can be cancelled at any point before closed
 */
export type POStatus =
  | 'draft'              // Initial state, can edit
  | 'submitted'          // Awaiting approval
  | 'approved'           // Approved, ready to receive
  | 'partially_received' // Some items received
  | 'received'           // All items received
  | 'closed'             // Complete, no further action
  | 'cancelled';         // Cancelled with reason

/**
 * Order type classification
 */
export type POOrderType =
  | 'standard'    // Regular inventory replenishment
  | 'urgent'      // Rush order with expedited shipping
  | 'drop_ship';  // Direct ship to customer

/**
 * Main purchase order entity (matches purchase_orders table)
 */
export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  order_type: POOrderType;
  status: POStatus;
  order_date: Date;
  expected_delivery_date: Date | null;
  delivery_date: Date | null;

  // Financial fields
  subtotal_amount: number;
  tax_amount: number;
  shipping_cost: number;
  other_charges: number;
  discount_amount: number;
  total_amount: number;

  // Shipping/billing
  shipping_address: string | null;
  billing_address: string | null;

  // Payment tracking
  payment_terms: string | null;
  payment_status: 'pending' | 'partial' | 'paid' | null;
  amount_paid: number;

  // Workflow tracking
  created_by: string;
  approved_by: string | null;
  approved_at: Date | null;

  // Metadata
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Purchase order line item (matches purchase_order_items table)
 */
export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  sku: string;
  product_name: string;

  // Quantities
  quantity_ordered: number;
  quantity_received: number;
  quantity_pending: number; // Generated column: ordered - received

  // Costs
  unit_cost: number;
  tax_amount: number;
  line_total: number; // Calculated: (unit_cost * qty) + tax

  // Metadata
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * PO with full details including line items and vendor info
 * Used for detailed views and API responses
 */
export interface PurchaseOrderWithDetails extends PurchaseOrder {
  items: PurchaseOrderItem[];
  vendor_name: string;
  vendor_contact: string | null;
  created_by_name: string;
  approved_by_name: string | null;
}

/**
 * Request body for creating new PO
 */
export interface CreatePORequest {
  vendor_id: string;
  order_type: POOrderType;
  expected_delivery_date?: string; // ISO date string
  shipping_address?: string;
  billing_address?: string;
  payment_terms?: string;
  notes?: string;

  // Line items (minimum 1 required)
  items: {
    product_id: string;
    quantity_ordered: number;
    unit_cost: number;
    tax_amount?: number;
    notes?: string;
  }[];

  // Optional financial overrides (calculated if not provided)
  shipping_cost?: number;
  other_charges?: number;
  discount_amount?: number;
}

/**
 * Request body for updating existing PO
 * Only draft POs can be updated
 */
export interface UpdatePORequest {
  vendor_id?: string;
  order_type?: POOrderType;
  expected_delivery_date?: string;
  shipping_address?: string;
  billing_address?: string;
  payment_terms?: string;
  notes?: string;

  items?: {
    id?: string; // If provided, updates existing item; otherwise creates new
    product_id: string;
    quantity_ordered: number;
    unit_cost: number;
    tax_amount?: number;
    notes?: string;
  }[];

  shipping_cost?: number;
  other_charges?: number;
  discount_amount?: number;
}

/**
 * Request body for receiving items
 * Updates quantity_received for specified items
 */
export interface ReceiveItemsRequest {
  items: {
    item_id: string;          // PO item ID
    quantity_received: number; // Quantity to add to existing received (not replacement)
    notes?: string;
  }[];
}

/**
 * Query parameters for listing POs
 */
export interface POListQuery {
  vendor_id?: string;
  status?: POStatus;
  order_type?: POOrderType;
  start_date?: string; // ISO date
  end_date?: string;   // ISO date
  search?: string;     // Search PO number
  page?: number;
  limit?: number;
}

/**
 * Product needing reorder (qty <= reorder_level)
 */
export interface ReorderSuggestion {
  product_id: string;
  sku: string;
  product_name: string;
  quantity_in_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  vendor_id: string;
  vendor_name: string;
  unit_cost: number | null; // Last purchase cost if available
}

/**
 * Reorder suggestions grouped by vendor
 */
export interface ReorderSuggestionsByVendor {
  vendor_id: string;
  vendor_name: string;
  vendor_contact: string | null;
  products: ReorderSuggestion[];
  total_items: number;
  estimated_total: number; // Sum of (reorder_quantity * unit_cost)
}
