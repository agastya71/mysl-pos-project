/**
 * @fileoverview Inventory Reports API Service - Frontend API client for inventory reporting
 *
 * This service provides API methods for inventory reports:
 * - getLowStockReport: Products at or below reorder level (need restocking)
 * - getOutOfStockReport: Products with zero quantity (out of stock)
 * - getValuationReport: Total inventory value and product count
 * - getMovementReport: Inventory changes over date range (sales + adjustments)
 * - getCategorySummary: Stock levels grouped by category
 *
 * Report Types:
 * - Low Stock: Products where quantity_in_stock <= reorder_level
 * - Out of Stock: Products where quantity_in_stock = 0
 * - Valuation: Total value = Σ(base_price × quantity_in_stock) for all products
 * - Movement: Changes from transactions (sales) and adjustments over date range
 * - Category Summary: Stock levels and values aggregated by category
 *
 * Use Cases:
 * - Inventory management: Identify products needing restocking
 * - Purchase planning: Determine reorder quantities
 * - Financial reporting: Calculate inventory asset value
 * - Trend analysis: Track inventory movement over time
 * - Category analysis: Compare stock levels across categories
 *
 * Data Sources:
 * - Product table: quantity_in_stock, reorder_level, base_price
 * - Transaction items: Sales reducing inventory
 * - Inventory adjustments: Manual stock changes
 * - Categories: Product categorization
 *
 * API Endpoints:
 * - GET /api/v1/inventory/reports/low-stock - Products needing restocking
 * - GET /api/v1/inventory/reports/out-of-stock - Products with zero stock
 * - GET /api/v1/inventory/reports/valuation - Total inventory value
 * - GET /api/v1/inventory/reports/movement?start_date={}&end_date={} - Movement by date range
 * - GET /api/v1/inventory/reports/category-summary - Stock by category
 *
 * @module services/api/inventory-reports
 * @requires ./api.client - Configured Axios instance
 * @requires ../../types/inventory-reports.types - Report types
 * @requires ../../types/api.types - API response types
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 3C)
 * @updated 2026-02-08 (Documentation)
 */

import { apiClient } from './api.client';
import {
  LowStockProduct,
  OutOfStockProduct,
  InventoryValuation,
  MovementReportItem,
  CategorySummary,
  MovementReportFilters,
} from '../../types/inventory-reports.types';
import { ApiResponse } from '../../types/api.types';

/**
 * Get low stock products report
 *
 * HTTP: GET /api/v1/inventory/reports/low-stock
 *
 * Retrieves list of products that are at or below their reorder level.
 * Used to identify products that need restocking or purchase orders.
 *
 * Low stock criteria:
 * - quantity_in_stock <= reorder_level
 * - Only active products (is_active = true)
 * - Sorted by urgency (lowest stock first)
 *
 * Each product includes:
 * - id, sku, name: Product identifiers
 * - quantity_in_stock: Current stock level
 * - reorder_level: Minimum stock threshold
 * - reorder_quantity: Suggested reorder amount
 * - category_name: Product category
 * - last_restocked: Date of last inventory increase (if any)
 *
 * Urgency calculation:
 * - Stock ratio = quantity_in_stock / reorder_level
 * - Lower ratio = more urgent
 * - 0% stock = most urgent (out of stock)
 * - ≤50% of reorder level = high priority
 * - ≤100% of reorder level = medium priority
 *
 * Use cases:
 * - Purchase planning: Generate purchase orders
 * - Inventory alerts: Notify managers of low stock
 * - Restocking workflow: Prioritize products to reorder
 * - Dashboard widget: Show critical stock levels
 *
 * @async
 * @function getLowStockReport
 * @returns {Promise<LowStockProduct[]>} Array of low stock products sorted by urgency
 * @throws {Error} If request fails (network error, server error)
 *
 * @example
 * // Get low stock products
 * const lowStockProducts = await getLowStockReport();
 * console.log(`${lowStockProducts.length} products need restocking`);
 * lowStockProducts.forEach(product => {
 *   const urgency = (product.quantity_in_stock / product.reorder_level * 100).toFixed(0);
 *   console.log(`${product.name}: ${product.quantity_in_stock} units (${urgency}% of reorder level)`);
 *   console.log(`  Reorder: ${product.reorder_quantity} units`);
 * });
 *
 * @example
 * // Identify critical stock (out of stock or near zero)
 * const lowStockProducts = await getLowStockReport();
 * const critical = lowStockProducts.filter(p => p.quantity_in_stock === 0 || p.quantity_in_stock < 5);
 * console.log(`${critical.length} critical products need immediate attention`);
 *
 * @example
 * // Calculate total reorder quantity
 * const lowStockProducts = await getLowStockReport();
 * const totalToOrder = lowStockProducts.reduce((sum, p) => sum + p.reorder_quantity, 0);
 * console.log(`Total units to order: ${totalToOrder}`);
 *
 * @example
 * // Group by category for purchase planning
 * const lowStockProducts = await getLowStockReport();
 * const byCategory = lowStockProducts.reduce((acc, p) => {
 *   if (!acc[p.category_name]) acc[p.category_name] = [];
 *   acc[p.category_name].push(p);
 *   return acc;
 * }, {} as Record<string, LowStockProduct[]>);
 * Object.entries(byCategory).forEach(([category, products]) => {
 *   console.log(`${category}: ${products.length} products low`);
 * });
 *
 * @example
 * // Usage in React component
 * const LowStockAlert = () => {
 *   const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
 *
 *   useEffect(() => {
 *     getLowStockReport().then(setLowStock);
 *   }, []);
 *
 *   return (
 *     <div>
 *       <h3>Low Stock Alert ({lowStock.length})</h3>
 *       {lowStock.map(product => (
 *         <div key={product.id}>
 *           {product.name}: {product.quantity_in_stock} units
 *         </div>
 *       ))}
 *     </div>
 *   );
 * };
 *
 * @see LowStockProduct type in ../../types/inventory-reports.types.ts
 * @see InventoryReportsPage component for UI integration
 */
export const getLowStockReport = async (): Promise<LowStockProduct[]> => {
  const response = await apiClient.get<ApiResponse<LowStockProduct[]>>(
    '/inventory/reports/low-stock'
  );
  return response.data.data || [];
};

/**
 * Get out of stock products report
 *
 * HTTP: GET /api/v1/inventory/reports/out-of-stock
 *
 * Retrieves list of products with zero inventory (out of stock).
 * Used to identify products that cannot be sold and need immediate restocking.
 *
 * Out of stock criteria:
 * - quantity_in_stock = 0
 * - Only active products (is_active = true)
 * - Sorted by last sale date (recently sold first)
 *
 * Each product includes:
 * - id, sku, name: Product identifiers
 * - category_name: Product category
 * - reorder_level: Minimum stock threshold
 * - reorder_quantity: Suggested reorder amount
 * - last_sold: Date of last sale (if any)
 * - days_out_of_stock: Days since stock reached zero
 *
 * Priority calculation:
 * - Recently sold products = high priority (active demand)
 * - Long-time out of stock = lower priority (less demand)
 * - Products with recent sales should be restocked first
 *
 * Use cases:
 * - Urgent restocking: Prioritize products with active demand
 * - Lost sales prevention: Identify stockout impact
 * - Dashboard alerts: Show critical out of stock items
 * - Purchase orders: Generate emergency orders
 *
 * @async
 * @function getOutOfStockReport
 * @returns {Promise<OutOfStockProduct[]>} Array of out of stock products sorted by priority
 * @throws {Error} If request fails (network error, server error)
 *
 * @example
 * // Get out of stock products
 * const outOfStock = await getOutOfStockReport();
 * console.log(`${outOfStock.length} products are out of stock`);
 * outOfStock.forEach(product => {
 *   console.log(`${product.name} (${product.sku})`);
 *   console.log(`  Category: ${product.category_name}`);
 *   console.log(`  Last sold: ${product.last_sold || 'Never'}`);
 *   console.log(`  Out of stock for: ${product.days_out_of_stock} days`);
 *   console.log(`  Reorder: ${product.reorder_quantity} units`);
 * });
 *
 * @example
 * // Identify high-priority stockouts (recently sold)
 * const outOfStock = await getOutOfStockReport();
 * const highPriority = outOfStock.filter(p =>
 *   p.last_sold && new Date(p.last_sold) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
 * );
 * console.log(`${highPriority.length} high-priority stockouts (sold in last 7 days)`);
 *
 * @example
 * // Calculate lost sales opportunity
 * const outOfStock = await getOutOfStockReport();
 * const recentStockouts = outOfStock.filter(p => p.days_out_of_stock < 30);
 * console.log(`${recentStockouts.length} products out of stock < 30 days`);
 * console.log('Potential lost sales - expedite restocking');
 *
 * @example
 * // Group by category
 * const outOfStock = await getOutOfStockReport();
 * const byCategory = outOfStock.reduce((acc, p) => {
 *   acc[p.category_name] = (acc[p.category_name] || 0) + 1;
 *   return acc;
 * }, {} as Record<string, number>);
 * console.log('Out of stock by category:', byCategory);
 *
 * @example
 * // Usage in dashboard widget
 * const OutOfStockWidget = () => {
 *   const [count, setCount] = useState(0);
 *
 *   useEffect(() => {
 *     getOutOfStockReport().then(data => setCount(data.length));
 *   }, []);
 *
 *   return (
 *     <div className={count > 0 ? 'alert-danger' : 'alert-success'}>
 *       <h4>Out of Stock: {count}</h4>
 *       {count > 0 && <p>Urgent restocking needed</p>}
 *     </div>
 *   );
 * };
 *
 * @see OutOfStockProduct type in ../../types/inventory-reports.types.ts
 * @see InventoryReportsPage component for UI integration
 */
export const getOutOfStockReport = async (): Promise<OutOfStockProduct[]> => {
  const response = await apiClient.get<ApiResponse<OutOfStockProduct[]>>(
    '/inventory/reports/out-of-stock'
  );
  return response.data.data || [];
};

/**
 * Get inventory valuation report
 *
 * HTTP: GET /api/v1/inventory/reports/valuation
 *
 * Calculates total inventory value and provides summary statistics.
 * Used for financial reporting, balance sheet, and asset tracking.
 *
 * Valuation calculation:
 * - Total value = Σ(base_price × quantity_in_stock) for all active products
 * - Based on current base_price (retail value)
 * - Only counts products with quantity_in_stock > 0
 * - Excludes inactive products
 *
 * Report includes:
 * - total_value: Total inventory value (sum of all products)
 * - total_products: Count of unique active products
 * - total_quantity: Sum of all product quantities
 * - average_value_per_product: total_value / total_products
 * - categories_count: Number of categories represented
 *
 * Use cases:
 * - Financial reports: Balance sheet inventory asset value
 * - Business metrics: Track inventory investment
 * - Insurance: Calculate coverage amounts
 * - Trend analysis: Monitor inventory value over time
 * - Budget planning: Understand capital tied up in inventory
 *
 * @async
 * @function getValuationReport
 * @returns {Promise<InventoryValuation>} Inventory valuation summary with total value and statistics
 * @throws {Error} If request fails (network error, server error)
 *
 * @example
 * // Get inventory valuation
 * const valuation = await getValuationReport();
 * console.log(`Total inventory value: $${valuation.total_value.toFixed(2)}`);
 * console.log(`Total products: ${valuation.total_products}`);
 * console.log(`Total units: ${valuation.total_quantity}`);
 * console.log(`Average value per product: $${valuation.average_value_per_product.toFixed(2)}`);
 * console.log(`Categories: ${valuation.categories_count}`);
 *
 * @example
 * // Format for financial report
 * const valuation = await getValuationReport();
 * const formatted = new Intl.NumberFormat('en-US', {
 *   style: 'currency',
 *   currency: 'USD'
 * }).format(valuation.total_value);
 * console.log(`Inventory Asset Value: ${formatted}`);
 *
 * @example
 * // Calculate inventory turnover context
 * const valuation = await getValuationReport();
 * const monthlyRevenue = 50000; // Example monthly revenue
 * const monthsOfInventory = valuation.total_value / monthlyRevenue;
 * console.log(`Current inventory: ${monthsOfInventory.toFixed(1)} months of revenue`);
 *
 * @example
 * // Track valuation trend
 * const current = await getValuationReport();
 * const lastMonth = 125000; // Previous month's valuation
 * const change = ((current.total_value - lastMonth) / lastMonth * 100).toFixed(1);
 * console.log(`Inventory value ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(Number(change))}%`);
 *
 * @example
 * // Usage in financial dashboard
 * const ValuationCard = () => {
 *   const [valuation, setValuation] = useState<InventoryValuation | null>(null);
 *
 *   useEffect(() => {
 *     getValuationReport().then(setValuation);
 *   }, []);
 *
 *   if (!valuation) return <div>Loading...</div>;
 *
 *   return (
 *     <div className="card">
 *       <h3>Inventory Valuation</h3>
 *       <div className="value">${valuation.total_value.toFixed(2)}</div>
 *       <div className="details">
 *         {valuation.total_products} products, {valuation.total_quantity} units
 *       </div>
 *     </div>
 *   );
 * };
 *
 * @see InventoryValuation type in ../../types/inventory-reports.types.ts
 * @see InventoryReportsPage component for UI integration
 */
export const getValuationReport = async (): Promise<InventoryValuation> => {
  const response = await apiClient.get<ApiResponse<InventoryValuation>>(
    '/inventory/reports/valuation'
  );
  return response.data.data!;
};

/**
 * Get inventory movement report
 *
 * HTTP: GET /api/v1/inventory/reports/movement?start_date={}&end_date={}
 *
 * Retrieves inventory changes (sales and adjustments) over a date range.
 * Used for trend analysis, forecasting, and inventory planning.
 *
 * Movement sources:
 * - Sales: Quantity sold from transactions (negative movement)
 * - Adjustments: Manual inventory changes (positive or negative)
 * - Net change: sum(adjustments) - sum(sales)
 *
 * Query parameters:
 * - start_date: Date range start (YYYY-MM-DD format, required)
 * - end_date: Date range end (YYYY-MM-DD format, required)
 *
 * Each product includes:
 * - product_id, sku, name: Product identifiers
 * - category_name: Product category
 * - starting_quantity: Stock at start_date
 * - ending_quantity: Stock at end_date
 * - quantity_sold: Units sold during period (from transactions)
 * - quantity_adjusted: Net adjustments during period
 * - net_change: Total change (adjustments - sold)
 *
 * Movement calculation:
 * - Starting quantity: Product quantity at start_date 00:00:00
 * - Ending quantity: Product quantity at end_date 23:59:59
 * - Net change = ending_quantity - starting_quantity
 * - Verify: net_change = quantity_adjusted - quantity_sold
 *
 * Use cases:
 * - Trend analysis: Identify fast-moving products
 * - Forecasting: Predict future inventory needs
 * - Purchase planning: Determine reorder quantities
 * - Performance metrics: Calculate inventory turnover
 * - Category comparison: Compare movement across categories
 *
 * @async
 * @function getMovementReport
 * @param {MovementReportFilters} filters - Date range filters (start_date, end_date)
 * @returns {Promise<MovementReportItem[]>} Array of product movements sorted by activity
 * @throws {Error} If request fails or invalid date range
 *
 * @example
 * // Get movement for last 30 days
 * const endDate = new Date().toISOString().split('T')[0];
 * const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
 * const movement = await getMovementReport({ start_date: startDate, end_date: endDate });
 * console.log(`${movement.length} products with activity in last 30 days`);
 * movement.forEach(item => {
 *   console.log(`${item.name}:`);
 *   console.log(`  Start: ${item.starting_quantity}, End: ${item.ending_quantity}`);
 *   console.log(`  Sold: ${item.quantity_sold}, Adjusted: ${item.quantity_adjusted}`);
 *   console.log(`  Net change: ${item.net_change >= 0 ? '+' : ''}${item.net_change}`);
 * });
 *
 * @example
 * // Identify fast-moving products
 * const movement = await getMovementReport({
 *   start_date: '2026-01-01',
 *   end_date: '2026-01-31'
 * });
 * const fastMoving = movement
 *   .filter(item => item.quantity_sold > 50)
 *   .sort((a, b) => b.quantity_sold - a.quantity_sold)
 *   .slice(0, 10);
 * console.log('Top 10 fast-moving products:');
 * fastMoving.forEach((item, i) => {
 *   console.log(`${i + 1}. ${item.name}: ${item.quantity_sold} sold`);
 * });
 *
 * @example
 * // Calculate inventory turnover
 * const movement = await getMovementReport({
 *   start_date: '2026-01-01',
 *   end_date: '2026-01-31'
 * });
 * movement.forEach(item => {
 *   const avgInventory = (item.starting_quantity + item.ending_quantity) / 2;
 *   const turnover = avgInventory > 0 ? item.quantity_sold / avgInventory : 0;
 *   console.log(`${item.name}: ${turnover.toFixed(2)}x turnover`);
 * });
 *
 * @example
 * // Identify slow-moving products (candidates for clearance)
 * const movement = await getMovementReport({
 *   start_date: '2026-01-01',
 *   end_date: '2026-02-08'
 * });
 * const slowMoving = movement.filter(item =>
 *   item.quantity_sold < 5 && item.ending_quantity > 50
 * );
 * console.log(`${slowMoving.length} slow-moving products with high inventory`);
 *
 * @example
 * // Forecast reorder needs
 * const movement = await getMovementReport({
 *   start_date: '2026-01-01',
 *   end_date: '2026-01-31'
 * });
 * movement.forEach(item => {
 *   const dailySales = item.quantity_sold / 31; // 31 days in January
 *   const daysOfStock = dailySales > 0 ? item.ending_quantity / dailySales : Infinity;
 *   if (daysOfStock < 14) {
 *     console.log(`${item.name}: Only ${daysOfStock.toFixed(0)} days of stock remaining`);
 *   }
 * });
 *
 * @example
 * // Usage in reporting component
 * const MovementReport = () => {
 *   const [movement, setMovement] = useState<MovementReportItem[]>([]);
 *   const [dateRange, setDateRange] = useState({
 *     start_date: '2026-02-01',
 *     end_date: '2026-02-08'
 *   });
 *
 *   useEffect(() => {
 *     getMovementReport(dateRange).then(setMovement);
 *   }, [dateRange]);
 *
 *   return (
 *     <div>
 *       <h3>Inventory Movement Report</h3>
 *       <DateRangePicker onChange={setDateRange} />
 *       <table>
 *         <thead>
 *           <tr>
 *             <th>Product</th>
 *             <th>Start</th>
 *             <th>Sold</th>
 *             <th>Adjusted</th>
 *             <th>End</th>
 *             <th>Net Change</th>
 *           </tr>
 *         </thead>
 *         <tbody>
 *           {movement.map(item => (
 *             <tr key={item.product_id}>
 *               <td>{item.name}</td>
 *               <td>{item.starting_quantity}</td>
 *               <td>{item.quantity_sold}</td>
 *               <td>{item.quantity_adjusted}</td>
 *               <td>{item.ending_quantity}</td>
 *               <td>{item.net_change}</td>
 *             </tr>
 *           ))}
 *         </tbody>
 *       </table>
 *     </div>
 *   );
 * };
 *
 * @see MovementReportFilters type in ../../types/inventory-reports.types.ts
 * @see MovementReportItem type in ../../types/inventory-reports.types.ts
 * @see InventoryReportsPage component for UI integration
 */
export const getMovementReport = async (
  filters: MovementReportFilters
): Promise<MovementReportItem[]> => {
  const response = await apiClient.get<ApiResponse<MovementReportItem[]>>(
    '/inventory/reports/movement',
    {
      params: {
        start_date: filters.start_date,
        end_date: filters.end_date,
      },
    }
  );
  return response.data.data || [];
};

/**
 * Get category summary report
 *
 * HTTP: GET /api/v1/inventory/reports/category-summary
 *
 * Aggregates inventory data by category, providing overview of stock levels
 * and values across all product categories.
 *
 * Aggregation:
 * - Groups products by category
 * - Calculates totals for each category
 * - Only includes active products (is_active = true)
 * - Sorted by total value (highest first)
 *
 * Each category includes:
 * - category_id, category_name: Category identifiers
 * - product_count: Number of products in category
 * - total_quantity: Sum of all product quantities
 * - total_value: Sum of (base_price × quantity_in_stock) for all products
 * - average_value_per_product: total_value / product_count
 * - low_stock_count: Products at or below reorder level
 * - out_of_stock_count: Products with zero quantity
 *
 * Value calculation:
 * - total_value = Σ(base_price × quantity_in_stock) for all products in category
 * - Based on current base_price (retail value)
 * - Only counts products with quantity_in_stock > 0
 *
 * Use cases:
 * - Category comparison: Compare inventory across categories
 * - Investment analysis: Identify categories with most capital
 * - Restocking priorities: Focus on categories with high low_stock_count
 * - Performance metrics: Compare category turnover rates
 * - Budget allocation: Plan purchasing by category needs
 *
 * @async
 * @function getCategorySummary
 * @returns {Promise<CategorySummary[]>} Array of category summaries sorted by total value
 * @throws {Error} If request fails (network error, server error)
 *
 * @example
 * // Get category summary
 * const summary = await getCategorySummary();
 * console.log(`${summary.length} categories with inventory`);
 * summary.forEach(cat => {
 *   console.log(`${cat.category_name}:`);
 *   console.log(`  Products: ${cat.product_count}`);
 *   console.log(`  Total quantity: ${cat.total_quantity} units`);
 *   console.log(`  Total value: $${cat.total_value.toFixed(2)}`);
 *   console.log(`  Low stock: ${cat.low_stock_count}, Out of stock: ${cat.out_of_stock_count}`);
 * });
 *
 * @example
 * // Identify categories needing attention
 * const summary = await getCategorySummary();
 * const needsAttention = summary.filter(cat =>
 *   cat.low_stock_count > 5 || cat.out_of_stock_count > 2
 * );
 * console.log(`${needsAttention.length} categories need restocking attention`);
 * needsAttention.forEach(cat => {
 *   console.log(`${cat.category_name}: ${cat.low_stock_count} low, ${cat.out_of_stock_count} out`);
 * });
 *
 * @example
 * // Calculate category distribution
 * const summary = await getCategorySummary();
 * const totalValue = summary.reduce((sum, cat) => sum + cat.total_value, 0);
 * summary.forEach(cat => {
 *   const percentage = (cat.total_value / totalValue * 100).toFixed(1);
 *   console.log(`${cat.category_name}: ${percentage}% of total inventory value`);
 * });
 *
 * @example
 * // Compare categories by average product value
 * const summary = await getCategorySummary();
 * const sortedByAvg = [...summary].sort((a, b) =>
 *   b.average_value_per_product - a.average_value_per_product
 * );
 * console.log('Categories by average product value:');
 * sortedByAvg.forEach(cat => {
 *   console.log(`${cat.category_name}: $${cat.average_value_per_product.toFixed(2)} avg`);
 * });
 *
 * @example
 * // Identify overstocked categories
 * const summary = await getCategorySummary();
 * const avgQuantityPerProduct = summary.map(cat => ({
 *   category: cat.category_name,
 *   avgQty: cat.total_quantity / cat.product_count
 * }));
 * const highStock = avgQuantityPerProduct.filter(cat => cat.avgQty > 100);
 * console.log('Potentially overstocked categories:');
 * highStock.forEach(cat => {
 *   console.log(`${cat.category}: ${cat.avgQty.toFixed(0)} avg units per product`);
 * });
 *
 * @example
 * // Usage in dashboard component
 * const CategorySummaryDashboard = () => {
 *   const [summary, setSummary] = useState<CategorySummary[]>([]);
 *
 *   useEffect(() => {
 *     getCategorySummary().then(setSummary);
 *   }, []);
 *
 *   return (
 *     <div>
 *       <h3>Inventory by Category</h3>
 *       <div className="category-grid">
 *         {summary.map(cat => (
 *           <div key={cat.category_id} className="category-card">
 *             <h4>{cat.category_name}</h4>
 *             <div className="stats">
 *               <div>{cat.product_count} products</div>
 *               <div>{cat.total_quantity} units</div>
 *               <div>${cat.total_value.toFixed(2)}</div>
 *             </div>
 *             {(cat.low_stock_count > 0 || cat.out_of_stock_count > 0) && (
 *               <div className="alerts">
 *                 {cat.low_stock_count > 0 && (
 *                   <span className="warning">{cat.low_stock_count} low</span>
 *                 )}
 *                 {cat.out_of_stock_count > 0 && (
 *                   <span className="danger">{cat.out_of_stock_count} out</span>
 *                 )}
 *               </div>
 *             )}
 *           </div>
 *         ))}
 *       </div>
 *     </div>
 *   );
 * };
 *
 * @see CategorySummary type in ../../types/inventory-reports.types.ts
 * @see InventoryReportsPage component for UI integration
 */
export const getCategorySummary = async (): Promise<CategorySummary[]> => {
  const response = await apiClient.get<ApiResponse<CategorySummary[]>>(
    '/inventory/reports/category-summary'
  );
  return response.data.data || [];
};
