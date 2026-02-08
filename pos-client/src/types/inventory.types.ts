/**
 * @fileoverview Inventory Type Definitions - Inventory adjustment data structures
 *
 * Defines inventory adjustment entity, adjustment types, query parameters, and paginated responses.
 * Used for manual inventory adjustments, stock tracking, and audit trail.
 *
 * @module types/inventory.types
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 3B)
 * @updated 2026-02-08 (Documentation)
 */

/**
 * Adjustment type enumeration
 *
 * Type of inventory adjustment for audit trail categorization.
 * Each type represents a different reason for inventory quantity changes.
 *
 * @typedef {('damage' | 'theft' | 'found' | 'correction' | 'initial')} AdjustmentType
 *
 * @property {'damage'} damage - Product damaged/unsellable (negative adjustment)
 * @property {'theft'} theft - Product stolen/missing (negative adjustment)
 * @property {'found'} found - Product found during count (positive adjustment)
 * @property {'correction'} correction - Correction of previous error (positive or negative)
 * @property {'initial'} initial - Initial stock entry (positive adjustment)
 *
 * @example
 * const type: AdjustmentType = 'damage';
 */
export type AdjustmentType = 'damage' | 'theft' | 'found' | 'correction' | 'initial';

/**
 * Inventory adjustment entity
 *
 * Complete inventory adjustment record from database with audit trail.
 * Auto-generated adjustment_number (ADJ-XXXXXX). Tracks quantity changes with
 * before/after snapshots. Automatically updates product.quantity_in_stock via trigger.
 *
 * @interface InventoryAdjustment
 * @property {string} id - UUID primary key
 * @property {string} adjustment_number - Auto-generated (ADJ-000001, ADJ-000002, ...)
 * @property {string} product_id - Foreign key to products table
 * @property {AdjustmentType} adjustment_type - Type of adjustment (damage, theft, found, correction, initial)
 * @property {number} quantity_change - Change amount (positive for increase, negative for decrease)
 * @property {number} old_quantity - Quantity before adjustment (for audit trail)
 * @property {number} new_quantity - Quantity after adjustment (for audit trail)
 * @property {string} reason - Required reason for adjustment (max 200 chars)
 * @property {string} [notes] - Optional detailed notes (max 1000 chars)
 * @property {string} adjusted_by - User ID who performed adjustment
 * @property {string} adjustment_date - ISO timestamp of adjustment
 * @property {string} created_at - ISO timestamp
 * @property {string} [product_name] - Product name (joined from products table)
 * @property {string} [product_sku] - Product SKU (joined from products table)
 * @property {string} [adjuster_name] - User name (joined from users table)
 *
 * @example
 * const adjustment: InventoryAdjustment = {
 *   id: "123e4567-e89b-12d3-a456-426614174000",
 *   adjustment_number: "ADJ-000042",
 *   product_id: "789e4567-e89b-12d3-a456-426614174001",
 *   adjustment_type: "damage",
 *   quantity_change: -5,
 *   old_quantity: 100,
 *   new_quantity: 95,
 *   reason: "Water damage during shipping",
 *   notes: "5 units damaged in shipping. Discarded.",
 *   adjusted_by: "user123",
 *   adjustment_date: "2024-02-08T14:30:00Z",
 *   created_at: "2024-02-08T14:30:00Z",
 *   product_name: "iPhone 15 Pro",
 *   product_sku: "APPLE-IPHONE-15-PRO",
 *   adjuster_name: "John Smith"
 * };
 */
export interface InventoryAdjustment {
  id: string;
  adjustment_number: string;
  product_id: string;
  adjustment_type: AdjustmentType;
  quantity_change: number;
  old_quantity: number;
  new_quantity: number;
  reason: string;
  notes?: string;
  adjusted_by: string;
  adjustment_date: string;
  created_at: string;
  // Joined fields
  product_name?: string;
  product_sku?: string;
  adjuster_name?: string;
}

/**
 * Create adjustment request
 *
 * Request body for POST /api/v1/inventory/adjustments endpoint.
 * Creates new inventory adjustment and automatically updates product quantity.
 * Backend validates that adjustment won't result in negative inventory.
 *
 * @interface CreateAdjustmentRequest
 * @property {string} product_id - Product UUID to adjust
 * @property {AdjustmentType} adjustment_type - Type of adjustment
 * @property {number} quantity_change - Change amount (positive for increase, negative for decrease)
 * @property {string} reason - Required reason (max 200 chars)
 * @property {string} [notes] - Optional detailed notes (max 1000 chars)
 *
 * @example
 * const request: CreateAdjustmentRequest = {
 *   product_id: "123e4567-e89b-12d3-a456-426614174000",
 *   adjustment_type: "found",
 *   quantity_change: 3,
 *   reason: "Found during physical count",
 *   notes: "3 units found in back storage area"
 * };
 *
 * @example
 * // Negative adjustment
 * const damageRequest: CreateAdjustmentRequest = {
 *   product_id: "789e4567-e89b-12d3-a456-426614174001",
 *   adjustment_type: "damage",
 *   quantity_change: -10,
 *   reason: "Damaged during shipment"
 * };
 */
export interface CreateAdjustmentRequest {
  product_id: string;
  adjustment_type: AdjustmentType;
  quantity_change: number;
  reason: string;
  notes?: string;
}

/**
 * Get adjustments query parameters
 *
 * Optional filters and pagination for adjustment list endpoint.
 * All fields optional - defaults applied server-side.
 *
 * @interface GetAdjustmentsQuery
 * @property {string} [product_id] - Filter by specific product UUID
 * @property {AdjustmentType} [adjustment_type] - Filter by adjustment type
 * @property {string} [start_date] - Filter by date range start (ISO date)
 * @property {string} [end_date] - Filter by date range end (ISO date)
 * @property {number} [page] - Page number (1-indexed, default: 1)
 * @property {number} [limit] - Items per page (default: 50, max: 100)
 *
 * @example
 * const query: GetAdjustmentsQuery = {
 *   adjustment_type: "damage",
 *   start_date: "2024-01-01",
 *   end_date: "2024-01-31",
 *   page: 1,
 *   limit: 20
 * };
 *
 * @example
 * // Product-specific history
 * const productQuery: GetAdjustmentsQuery = {
 *   product_id: "123e4567-e89b-12d3-a456-426614174000"
 * };
 */
export interface GetAdjustmentsQuery {
  product_id?: string;
  adjustment_type?: AdjustmentType;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

/**
 * Inventory pagination metadata
 *
 * Standardized pagination metadata for inventory adjustment list responses.
 *
 * @interface InventoryPagination
 * @property {number} page - Current page number (1-indexed)
 * @property {number} limit - Items per page
 * @property {number} total - Total number of matching adjustments
 * @property {number} totalPages - Total number of pages
 *
 * @example
 * const pagination: InventoryPagination = {
 *   page: 1,
 *   limit: 20,
 *   total: 150,
 *   totalPages: 8
 * };
 */
export interface InventoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Inventory adjustments paginated response
 *
 * Standardized paginated response for adjustment list endpoint.
 * Includes adjustments array and pagination metadata.
 *
 * @interface InventoryAdjustmentsResponse
 * @property {InventoryAdjustment[]} data - Array of adjustment records
 * @property {InventoryPagination} pagination - Pagination metadata
 *
 * @example
 * const response: InventoryAdjustmentsResponse = {
 *   data: [
 *     {
 *       id: "123",
 *       adjustment_number: "ADJ-000001",
 *       product_id: "456",
 *       adjustment_type: "damage",
 *       quantity_change: -5,
 *       old_quantity: 100,
 *       new_quantity: 95,
 *       reason: "Water damage",
 *       adjusted_by: "user123",
 *       adjustment_date: "2024-02-08T14:30:00Z",
 *       created_at: "2024-02-08T14:30:00Z",
 *       product_name: "iPhone 15 Pro",
 *       product_sku: "APPLE-IPHONE-15-PRO",
 *       adjuster_name: "John Smith"
 *     }
 *   ],
 *   pagination: {
 *     page: 1,
 *     limit: 20,
 *     total: 150,
 *     totalPages: 8
 *   }
 * };
 */
export interface InventoryAdjustmentsResponse {
  data: InventoryAdjustment[];
  pagination: InventoryPagination;
}
