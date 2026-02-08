/**
 * @fileoverview Inventory API Service - Frontend API client for inventory adjustment operations
 *
 * This service provides API methods for inventory adjustments:
 * - createAdjustment: Create new inventory adjustment (updates product quantity)
 * - getAdjustments: List adjustments with filters and pagination
 * - getAdjustmentById: Get complete adjustment details by ID
 * - getProductHistory: Get adjustment history for specific product
 *
 * Inventory Adjustments:
 * - Manual stock changes (damage, theft, found, correction, initial)
 * - Auto-generated adjustment_number (ADJ-XXXXXX format)
 * - Automatic product quantity updates via database trigger
 * - Audit trail with reason and notes
 * - Prevents negative inventory (validation before adjustment)
 * - Tracks old_quantity → new_quantity for each adjustment
 *
 * Adjustment Types:
 * - damage: Stock damaged or broken (decreases inventory)
 * - theft: Stock stolen or missing (decreases inventory)
 * - found: Stock found or recovered (increases inventory)
 * - correction: Correction from physical count (increases or decreases)
 * - initial: Initial stock count when adding product (increases inventory)
 *
 * Database Trigger Behavior:
 * - apply_inventory_adjustment() trigger fires after INSERT
 * - Automatically updates product.quantity_in_stock
 * - Calculates new_quantity = old_quantity + quantity_change
 * - Validates new_quantity >= 0 (prevents negative inventory)
 * - Raises exception if adjustment would cause negative stock
 *
 * Use Cases:
 * - Inventory management: Record stock changes for audit trail
 * - Physical counts: Correct inventory based on actual counts
 * - Damage/theft tracking: Record losses with reasons
 * - Initial setup: Set starting inventory levels
 * - Stock reconciliation: Fix inventory discrepancies
 *
 * API Endpoints:
 * - POST /api/v1/inventory/adjustments - Create adjustment
 * - GET /api/v1/inventory/adjustments - List adjustments (with filters)
 * - GET /api/v1/inventory/adjustments/:id - Get adjustment by ID
 * - GET /api/v1/inventory/products/:productId/history - Product adjustment history
 *
 * @module services/api/inventory
 * @requires ./api.client - Configured Axios instance
 * @requires ../../types/api.types - API response types
 * @requires ../../types/inventory.types - Inventory adjustment types
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 3B)
 * @updated 2026-02-08 (Documentation)
 */

import { apiClient } from './api.client';
import { ApiResponse } from '../../types/api.types';
import {
  InventoryAdjustment,
  CreateAdjustmentRequest,
  GetAdjustmentsQuery,
  InventoryAdjustmentsResponse,
} from '../../types/inventory.types';

const BASE_URL = '/inventory';

/**
 * Inventory API Service
 *
 * Provides methods for inventory adjustment operations in POS system.
 * All methods use apiClient for HTTP requests with consistent error handling.
 *
 * Methods:
 * - createAdjustment: Create new adjustment (auto-updates product quantity)
 * - getAdjustments: List adjustments with filters and pagination
 * - getAdjustmentById: Get specific adjustment details
 * - getProductHistory: Get all adjustments for a product (audit trail)
 *
 * Automatic Quantity Updates:
 * - Database trigger apply_inventory_adjustment() fires after insert
 * - Automatically updates product.quantity_in_stock
 * - Frontend doesn't need to update product quantity manually
 * - Backend validates and prevents negative inventory
 *
 * Usage in Redux:
 * - Called from inventory.slice.ts async thunks
 * - Responses stored in Redux inventory state
 * - Errors handled by Redux thunk rejection
 *
 * @constant
 * @type {object}
 */
export const inventoryApi = {
  /**
   * Create a new inventory adjustment
   *
   * HTTP: POST /api/v1/inventory/adjustments
   *
   * Creates new inventory adjustment and automatically updates product quantity.
   * Backend validates adjustment won't cause negative inventory before creating.
   *
   * Request data (CreateAdjustmentRequest):
   * - product_id: Product UUID (required)
   * - adjustment_type: Type of adjustment (required)
   *   - 'damage': Stock damaged or broken
   *   - 'theft': Stock stolen or missing
   *   - 'found': Stock found or recovered
   *   - 'correction': Correction from physical count
   *   - 'initial': Initial stock count
   * - quantity_change: Change in quantity (required, can be positive or negative)
   * - reason: Adjustment reason (required, 1-500 characters)
   * - notes: Additional notes (optional, max 1000 characters)
   *
   * Quantity change:
   * - Positive: Increases inventory (found, correction up, initial)
   * - Negative: Decreases inventory (damage, theft, correction down)
   * - Zero: Not allowed (validation error)
   *
   * Automatic processing:
   * 1. Backend validates product exists and has sufficient quantity
   * 2. Backend creates adjustment record with adjustment_number (ADJ-XXXXXX)
   * 3. Database trigger automatically updates product.quantity_in_stock
   * 4. Backend returns created adjustment with old_quantity and new_quantity
   *
   * Validation:
   * - product_id must reference existing product
   * - quantity_change cannot be zero
   * - new_quantity cannot be negative (old_quantity + quantity_change >= 0)
   * - reason required and non-empty
   * - adjustment_type must be valid enum value
   *
   * @async
   * @function createAdjustment
   * @param {CreateAdjustmentRequest} data - Adjustment data (product, type, quantity, reason)
   * @returns {Promise<InventoryAdjustment>} Created adjustment with adjustment_number
   * @throws {Error} If validation fails or would cause negative inventory
   *
   * @example
   * // Record damaged inventory
   * const adjustment = await inventoryApi.createAdjustment({
   *   product_id: 'product-uuid',
   *   adjustment_type: 'damage',
   *   quantity_change: -5,
   *   reason: 'Water damage during shipment',
   *   notes: 'Box 3 from shipment S-12345'
   * });
   * console.log('Adjustment:', adjustment.adjustment_number);
   * console.log('Old quantity:', adjustment.old_quantity);
   * console.log('New quantity:', adjustment.new_quantity);
   *
   * @example
   * // Record found inventory
   * const adjustment = await inventoryApi.createAdjustment({
   *   product_id: 'product-uuid',
   *   adjustment_type: 'found',
   *   quantity_change: 10,
   *   reason: 'Found additional units in back room',
   *   notes: 'Discovered during monthly count'
   * });
   *
   * @example
   * // Initial stock count for new product
   * const adjustment = await inventoryApi.createAdjustment({
   *   product_id: 'new-product-uuid',
   *   adjustment_type: 'initial',
   *   quantity_change: 100,
   *   reason: 'Initial inventory count',
   *   notes: 'Opening stock for new product'
   * });
   *
   * @example
   * // Correction from physical count
   * const adjustment = await inventoryApi.createAdjustment({
   *   product_id: 'product-uuid',
   *   adjustment_type: 'correction',
   *   quantity_change: -3,
   *   reason: 'Physical count shows 47 units, system shows 50',
   *   notes: 'Annual inventory audit'
   * });
   *
   * @example
   * // Handle negative inventory error
   * try {
   *   await inventoryApi.createAdjustment({
   *     product_id: 'product-uuid',
   *     adjustment_type: 'damage',
   *     quantity_change: -100,
   *     reason: 'Damaged units'
   *   });
   * } catch (error) {
   *   console.error('Adjustment failed:', error.message);
   *   // Error: "Adjustment would result in negative inventory"
   * }
   *
   * @example
   * // Usage in Redux thunk (inventory.slice.ts)
   * export const createAdjustment = createAsyncThunk(
   *   'inventory/createAdjustment',
   *   async (data: CreateAdjustmentRequest) => {
   *     return await inventoryApi.createAdjustment(data);
   *   }
   * );
   *
   * @see CreateAdjustmentRequest type in ../../types/inventory.types.ts
   * @see InventoryAdjustment type in ../../types/inventory.types.ts
   * @see inventory.slice.ts for Redux integration
   * @see apply_inventory_adjustment trigger in schema/functions/
   */
  createAdjustment: async (
    data: CreateAdjustmentRequest
  ): Promise<InventoryAdjustment> => {
    const response = await apiClient.post<ApiResponse<InventoryAdjustment>>(
      `${BASE_URL}/adjustments`,
      data
    );
    return response.data.data!;
  },

  /**
   * Get all adjustments with filters and pagination
   *
   * HTTP: GET /api/v1/inventory/adjustments (with query parameters)
   *
   * Retrieves paginated list of inventory adjustments with optional filtering.
   * Used for inventory history page and audit reports.
   *
   * Available filters (GetAdjustmentsQuery):
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20)
   * - adjustment_type: Filter by type (damage, theft, found, correction, initial)
   * - start_date: Date range start (YYYY-MM-DD)
   * - end_date: Date range end (YYYY-MM-DD)
   * - product_id: Filter by specific product
   *
   * Returns adjustments with:
   * - id, adjustment_number (ADJ-XXXXXX)
   * - product_id, product_name, product_sku
   * - adjustment_type, quantity_change
   * - old_quantity, new_quantity (before and after adjustment)
   * - reason, notes
   * - adjusted_by (user_id and username)
   * - created_at timestamp
   *
   * Pagination:
   * - adjustments: Array of adjustment records
   * - pagination: Page metadata (page, limit, total, totalPages)
   *
   * Sort order:
   * - Sorted by created_at DESC (newest first)
   * - Most recent adjustments appear first
   *
   * Use cases:
   * - Inventory history page (view all adjustments)
   * - Audit reports (filter by date range, type)
   * - Product-specific history (filter by product_id)
   * - Damage/theft tracking (filter by adjustment_type)
   *
   * @async
   * @function getAdjustments
   * @param {GetAdjustmentsQuery} [query] - Filter and pagination parameters
   * @returns {Promise<InventoryAdjustmentsResponse>} Adjustment list with pagination
   * @throws {Error} If request fails (network error, server error)
   *
   * @example
   * // Get first page of all adjustments
   * const result = await inventoryApi.getAdjustments({ page: 1, limit: 20 });
   * console.log('Total adjustments:', result.pagination.total);
   * console.log('Adjustments:', result.adjustments);
   *
   * @example
   * // Filter by adjustment type
   * const result = await inventoryApi.getAdjustments({
   *   adjustment_type: 'damage',
   *   page: 1,
   *   limit: 20
   * });
   * console.log('Damage adjustments:', result.adjustments);
   *
   * @example
   * // Filter by date range
   * const result = await inventoryApi.getAdjustments({
   *   start_date: '2026-02-01',
   *   end_date: '2026-02-08',
   *   page: 1,
   *   limit: 50
   * });
   * console.log('Adjustments this week:', result.adjustments.length);
   *
   * @example
   * // Filter by product
   * const result = await inventoryApi.getAdjustments({
   *   product_id: 'product-uuid',
   *   page: 1,
   *   limit: 100
   * });
   * console.log('Product adjustment history:', result.adjustments);
   *
   * @example
   * // Usage in Redux thunk (inventory.slice.ts)
   * export const fetchAdjustments = createAsyncThunk(
   *   'inventory/fetchAdjustments',
   *   async (query: GetAdjustmentsQuery) => {
   *     return await inventoryApi.getAdjustments(query);
   *   }
   * );
   *
   * @see GetAdjustmentsQuery type in ../../types/inventory.types.ts
   * @see InventoryAdjustmentsResponse type in ../../types/inventory.types.ts
   * @see inventory.slice.ts for Redux integration
   */
  getAdjustments: async (
    query?: GetAdjustmentsQuery
  ): Promise<InventoryAdjustmentsResponse> => {
    const response = await apiClient.get<ApiResponse<InventoryAdjustmentsResponse>>(
      `${BASE_URL}/adjustments`,
      { params: query }
    );
    return response.data.data!;
  },

  /**
   * Get adjustment by ID
   *
   * HTTP: GET /api/v1/inventory/adjustments/:id
   *
   * Retrieves complete adjustment details by ID.
   * Used for adjustment detail view and audit trail verification.
   *
   * Returns adjustment with:
   * - id, adjustment_number (ADJ-XXXXXX)
   * - product_id, product_name, product_sku
   * - adjustment_type: Type of adjustment
   * - quantity_change: Change amount (positive or negative)
   * - old_quantity: Quantity before adjustment
   * - new_quantity: Quantity after adjustment
   * - reason: Adjustment reason
   * - notes: Additional notes (if provided)
   * - adjusted_by: User ID who created adjustment
   * - created_at: Timestamp when adjustment created
   *
   * Use cases:
   * - Adjustment detail modal (show full adjustment info)
   * - Audit trail verification (confirm adjustment details)
   * - Dispute resolution (review adjustment history)
   *
   * @async
   * @function getAdjustmentById
   * @param {string} id - Adjustment UUID
   * @returns {Promise<InventoryAdjustment>} Complete adjustment details
   * @throws {Error} If adjustment not found (404) or request fails
   *
   * @example
   * // Get adjustment details
   * const adjustment = await inventoryApi.getAdjustmentById('adjustment-uuid');
   * console.log('Adjustment:', adjustment.adjustment_number);
   * console.log('Type:', adjustment.adjustment_type);
   * console.log('Change:', adjustment.quantity_change);
   * console.log('Reason:', adjustment.reason);
   *
   * @example
   * // Display adjustment in detail modal
   * const adjustment = await inventoryApi.getAdjustmentById('adjustment-uuid');
   * console.log(`${adjustment.product_name} (${adjustment.product_sku})`);
   * console.log(`${adjustment.old_quantity} → ${adjustment.new_quantity}`);
   * console.log(`Reason: ${adjustment.reason}`);
   * if (adjustment.notes) {
   *   console.log(`Notes: ${adjustment.notes}`);
   * }
   *
   * @example
   * // Usage in Redux thunk (inventory.slice.ts)
   * export const fetchAdjustmentById = createAsyncThunk(
   *   'inventory/fetchAdjustmentById',
   *   async (id: string) => {
   *     return await inventoryApi.getAdjustmentById(id);
   *   }
   * );
   *
   * @see InventoryAdjustment type in ../../types/inventory.types.ts
   * @see inventory.slice.ts for Redux integration
   */
  getAdjustmentById: async (id: string): Promise<InventoryAdjustment> => {
    const response = await apiClient.get<ApiResponse<InventoryAdjustment>>(
      `${BASE_URL}/adjustments/${id}`
    );
    return response.data.data!;
  },

  /**
   * Get adjustment history for a product
   *
   * HTTP: GET /api/v1/inventory/products/:productId/history
   *
   * Retrieves all adjustments for a specific product, sorted by date (newest first).
   * Used for product-specific audit trail and inventory reconciliation.
   *
   * Returns array of adjustments:
   * - All adjustments for specified product
   * - Sorted by created_at DESC (newest first)
   * - No pagination (returns all records)
   * - Each adjustment includes full details
   *
   * Each adjustment includes:
   * - id, adjustment_number (ADJ-XXXXXX)
   * - adjustment_type, quantity_change
   * - old_quantity, new_quantity
   * - reason, notes
   * - adjusted_by (user_id and username)
   * - created_at timestamp
   *
   * Use cases:
   * - Product detail page (show adjustment history)
   * - Inventory reconciliation (review all changes for product)
   * - Audit trail (track all quantity changes)
   * - Dispute resolution (investigate discrepancies)
   * - Stock count verification (compare adjustments to physical count)
   *
   * History analysis:
   * - Trace quantity changes over time
   * - Identify patterns (frequent damage, theft)
   * - Verify adjustment accuracy
   * - Support variance investigation
   *
   * @async
   * @function getProductHistory
   * @param {string} productId - Product UUID
   * @returns {Promise<InventoryAdjustment[]>} Array of adjustments for product (sorted by date DESC)
   * @throws {Error} If product not found (404) or request fails
   *
   * @example
   * // Get adjustment history for product
   * const history = await inventoryApi.getProductHistory('product-uuid');
   * console.log('Total adjustments:', history.length);
   * history.forEach(adj => {
   *   console.log(`${adj.adjustment_number}: ${adj.adjustment_type}`);
   *   console.log(`  ${adj.old_quantity} → ${adj.new_quantity} (${adj.quantity_change >= 0 ? '+' : ''}${adj.quantity_change})`);
   *   console.log(`  Reason: ${adj.reason}`);
   *   console.log(`  Date: ${adj.created_at}`);
   * });
   *
   * @example
   * // Calculate total quantity changes
   * const history = await inventoryApi.getProductHistory('product-uuid');
   * const totalChange = history.reduce((sum, adj) => sum + adj.quantity_change, 0);
   * console.log('Total quantity change:', totalChange);
   *
   * @example
   * // Group adjustments by type
   * const history = await inventoryApi.getProductHistory('product-uuid');
   * const byType = history.reduce((acc, adj) => {
   *   acc[adj.adjustment_type] = (acc[adj.adjustment_type] || 0) + 1;
   *   return acc;
   * }, {} as Record<string, number>);
   * console.log('Adjustments by type:', byType);
   * // { damage: 5, found: 2, correction: 3 }
   *
   * @example
   * // Find most recent adjustment
   * const history = await inventoryApi.getProductHistory('product-uuid');
   * const latest = history[0]; // Already sorted DESC
   * console.log('Latest adjustment:', latest.adjustment_number);
   * console.log('Date:', latest.created_at);
   *
   * @example
   * // Usage in Redux thunk (inventory.slice.ts)
   * export const fetchProductHistory = createAsyncThunk(
   *   'inventory/fetchProductHistory',
   *   async (productId: string) => {
   *     return await inventoryApi.getProductHistory(productId);
   *   }
   * );
   *
   * @see InventoryAdjustment type in ../../types/inventory.types.ts
   * @see inventory.slice.ts for Redux integration
   */
  getProductHistory: async (productId: string): Promise<InventoryAdjustment[]> => {
    const response = await apiClient.get<ApiResponse<InventoryAdjustment[]>>(
      `${BASE_URL}/products/${productId}/history`
    );
    return response.data.data || [];
  },
};
