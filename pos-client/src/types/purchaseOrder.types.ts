/**
 * Frontend type definitions for Purchase Order management
 * Mirrors backend types with frontend-specific additions
 */

/**
 * Purchase order status states
 */
export type POStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled';

/**
 * Order type classification
 */
export type POOrderType = 'standard' | 'urgent' | 'drop_ship';

/**
 * Main purchase order entity
 */
export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  order_type: POOrderType;
  status: POStatus;
  order_date: string; // ISO date string
  expected_delivery_date: string | null;
  delivery_date: string | null;

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
  approved_at: string | null;

  // Metadata
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Purchase order line item
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
  quantity_pending: number;

  // Costs
  unit_cost: number;
  tax_amount: number;
  line_total: number;

  // Metadata
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * PO with full details
 */
export interface PurchaseOrderWithDetails extends PurchaseOrder {
  items: PurchaseOrderItem[];
  vendor_name: string;
  vendor_contact: string | null;
  created_by_name: string;
  approved_by_name: string | null;
}

/**
 * Draft line item for form editing (before save)
 */
export interface DraftPOItem {
  temp_id: string; // Temporary ID for React key
  product_id: string;
  sku: string;
  product_name: string;
  quantity_ordered: number;
  unit_cost: number;
  tax_amount: number;
  line_total: number;
  notes: string;
}

/**
 * Draft PO state for form editing
 */
export interface DraftPO {
  id?: string; // Present when editing existing draft
  vendor_id: string;
  order_type: POOrderType;
  expected_delivery_date: string;
  shipping_address: string;
  billing_address: string;
  payment_terms: string;
  notes: string;
  items: DraftPOItem[];

  // Calculated totals
  subtotal_amount: number;
  tax_amount: number;
  shipping_cost: number;
  other_charges: number;
  discount_amount: number;
  total_amount: number;
}

/**
 * Request body for creating new PO
 */
export interface CreatePORequest {
  vendor_id: string;
  order_type: POOrderType;
  expected_delivery_date?: string;
  shipping_address?: string;
  billing_address?: string;
  payment_terms?: string;
  notes?: string;
  items: {
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
 * Request body for updating PO
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
    id?: string;
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
 */
export interface ReceiveItemsRequest {
  items: {
    item_id: string;
    quantity_received: number;
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
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Product needing reorder
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
  unit_cost: number | null;
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
  estimated_total: number;
}

/**
 * Vendor entity (subset for PO management)
 */
export interface Vendor {
  id: string;
  vendor_number: string;
  vendor_type: string;
  business_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  payment_terms: string | null;
  is_active: boolean;
}
