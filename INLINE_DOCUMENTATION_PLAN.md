# Inline Documentation Plan

**Goal:** Add comprehensive inline documentation to all source code files to improve developer experience and code maintainability.

---

## Documentation Standards

### TypeScript/JavaScript Files

**File-level Documentation:**
```typescript
/**
 * @fileoverview Brief description of what this file does
 * @module path/to/module
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created YYYY-MM-DD
 */
```

**Function Documentation (JSDoc):**
```typescript
/**
 * Brief one-line description of what the function does
 *
 * Longer description explaining the purpose, behavior, and any important details.
 * Can span multiple lines.
 *
 * @param {Type} paramName - Description of parameter
 * @param {Type} optionalParam - Description (optional)
 * @returns {Type} Description of return value
 * @throws {ErrorType} Description of when/why it throws
 *
 * @example
 * const result = functionName(arg1, arg2);
 * console.log(result); // Expected output
 */
```

**Interface/Type Documentation:**
```typescript
/**
 * Description of the interface/type purpose
 *
 * @interface InterfaceName
 * @property {Type} propertyName - Description of property
 */
```

**Component Documentation (React):**
```typescript
/**
 * ComponentName - Brief description
 *
 * Longer description of component purpose, behavior, and usage.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Type} props.propName - Description of prop
 * @returns {JSX.Element} Rendered component
 *
 * @example
 * <ComponentName propName="value" />
 */
```

**Redux Slice Documentation:**
```typescript
/**
 * Description of what state this slice manages
 *
 * @slice sliceName
 * @state StateInterface - Description of state structure
 */
```

---

## Files Requiring Documentation

### Phase 3C: Inventory Reports

#### Backend Files (5 files)

1. **`backend/src/types/inventory.types.ts`**
   - [ ] File-level overview
   - [ ] Document each interface (6 report interfaces)
   - [ ] Explain property purposes
   - [ ] Add usage examples

2. **`backend/src/services/inventory.service.ts`**
   - [ ] File-level overview
   - [ ] Document 5 report methods:
     - `getLowStockProducts()` - Query logic, return format
     - `getOutOfStockProducts()` - Query logic, return format
     - `getInventoryValuation()` - Calculation method
     - `getInventoryMovementReport()` - CTE logic, date range handling
     - `getCategorySummary()` - Aggregation logic
   - [ ] Document existing methods (createAdjustment, etc.)
   - [ ] Explain SQL query logic for complex queries
   - [ ] Add error handling documentation

3. **`backend/src/controllers/inventory.controller.ts`**
   - [ ] File-level overview
   - [ ] Document 5 report handlers
   - [ ] Explain validation logic
   - [ ] Document error responses
   - [ ] Add request/response examples

4. **`backend/src/routes/inventory.routes.ts`**
   - [ ] File-level overview
   - [ ] Document each route with HTTP method, path, auth requirements
   - [ ] Add API endpoint examples

#### Frontend Files (9 files)

5. **`pos-client/src/types/inventory-reports.types.ts`**
   - [ ] File-level overview
   - [ ] Document each interface/type
   - [ ] Explain frontend-specific differences from backend types

6. **`pos-client/src/services/api/inventory-reports.api.ts`**
   - [ ] File-level overview
   - [ ] Document 5 API methods
   - [ ] Explain request/response handling
   - [ ] Document error handling
   - [ ] Add usage examples

7. **`pos-client/src/store/slices/inventory-reports.slice.ts`**
   - [ ] File-level overview
   - [ ] Document state structure
   - [ ] Document 5 async thunks
   - [ ] Document reducers and actions
   - [ ] Explain loading/error state management
   - [ ] Add usage examples with useAppDispatch

8. **`pos-client/src/pages/InventoryReportsPage.tsx`**
   - [ ] Component-level overview
   - [ ] Document props (if any)
   - [ ] Explain tab navigation logic
   - [ ] Document state management
   - [ ] Explain useEffect data loading
   - [ ] Add usage/routing example

9. **`pos-client/src/components/Inventory/LowStockReport.tsx`**
   - [ ] Component overview
   - [ ] Document props
   - [ ] Explain badge color logic
   - [ ] Document empty state handling
   - [ ] Add usage example

10. **`pos-client/src/components/Inventory/OutOfStockReport.tsx`**
    - [ ] Component overview
    - [ ] Document props
    - [ ] Explain urgency display
    - [ ] Document empty state
    - [ ] Add usage example

11. **`pos-client/src/components/Inventory/ValuationReport.tsx`**
    - [ ] Component overview
    - [ ] Document props
    - [ ] Explain valuation calculation display
    - [ ] Document percentage calculation
    - [ ] Add usage example

12. **`pos-client/src/components/Inventory/MovementReport.tsx`**
    - [ ] Component overview
    - [ ] Document props
    - [ ] Explain date filter logic
    - [ ] Document color coding for changes
    - [ ] Explain CTE query results display
    - [ ] Add usage example

13. **`pos-client/src/components/Inventory/CategorySummaryReport.tsx`**
    - [ ] Component overview
    - [ ] Document props
    - [ ] Explain health indicator logic
    - [ ] Document summary calculations
    - [ ] Add usage example

---

## Documentation Priorities

### Priority 1: High-Impact Files (Implement First)
Core business logic and complex functionality:
1. `backend/src/services/inventory.service.ts` - Complex SQL queries
2. `pos-client/src/store/slices/inventory-reports.slice.ts` - State management
3. `backend/src/services/transaction.service.ts` - Transaction logic
4. `backend/src/services/customer.service.ts` - Customer logic
5. `backend/src/services/category.service.ts` - Tree building algorithm

### Priority 2: Medium-Impact Files
Controllers and API layers:
1. All controller files (`*controller.ts`)
2. All API service files (`pos-client/src/services/api/*.ts`)
3. Route files (`*routes.ts`)

### Priority 3: Lower-Impact Files
UI components and types:
1. All React components
2. Type definition files
3. Redux slices

---

## Implementation Approach

### Option A: Comprehensive (Recommended)
Document all files in phases:
- Phase 1: Backend services (highest complexity)
- Phase 2: Frontend state management
- Phase 3: Backend controllers and routes
- Phase 4: Frontend API services
- Phase 5: React components
- Phase 6: Type definitions

**Estimated Time:** 4-6 hours total

### Option B: Critical Path Only
Document only the most complex/important files:
- Backend services with complex queries
- Redux slices with state management
- Controllers with validation logic

**Estimated Time:** 2-3 hours

### Option C: As-Needed
Add documentation when working on specific features/bugs

**Estimated Time:** Ongoing

---

## Documentation Quality Checklist

For each file, ensure:
- [ ] File-level overview explaining purpose
- [ ] All public functions/methods documented with JSDoc
- [ ] All parameters explained with types
- [ ] Return values documented
- [ ] Complex logic has inline comments
- [ ] Error handling documented
- [ ] At least one usage example provided
- [ ] Related files cross-referenced
- [ ] Any gotchas or edge cases noted

---

## Example: Before vs After

### Before (No Documentation)
```typescript
export const getLowStockProducts = async (): Promise<LowStockProduct[]> => {
  const result = await pool.query(
    `SELECT p.id, p.sku, p.name, p.quantity_in_stock, p.reorder_level,
            p.reorder_quantity, c.name as category_name,
            (p.base_price * p.quantity_in_stock) as stock_value
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.quantity_in_stock <= p.reorder_level AND p.is_active = true
     ORDER BY p.quantity_in_stock ASC, p.name ASC`
  );
  return result.rows.map(row => ({
    ...row,
    stock_value: parseFloat(row.stock_value) || 0
  }));
};
```

### After (Well Documented)
```typescript
/**
 * Retrieves all active products that are at or below their reorder level
 *
 * This function queries the database for products where the current stock quantity
 * is less than or equal to the configured reorder level. Results include category
 * information and calculated stock value (base_price * quantity).
 *
 * The query performs a LEFT JOIN with categories to include category names, and
 * filters for only active products. Results are sorted by quantity (lowest first)
 * and then alphabetically by name.
 *
 * @returns {Promise<LowStockProduct[]>} Array of products needing reorder
 * @throws {Error} If database query fails
 *
 * @example
 * const lowStock = await getLowStockProducts();
 * // Returns: [
 * //   {
 * //     id: "uuid",
 * //     sku: "PROD-001",
 * //     name: "Product Name",
 * //     quantity_in_stock: 5,
 * //     reorder_level: 10,
 * //     reorder_quantity: 50,
 * //     category_name: "Electronics",
 * //     stock_value: 125.50
 * //   }
 * // ]
 *
 * @see LowStockProduct interface in types/inventory.types.ts
 * @see Low Stock Report component in pos-client/src/components/Inventory/LowStockReport.tsx
 */
export const getLowStockProducts = async (): Promise<LowStockProduct[]> => {
  const result = await pool.query(
    // Query products where quantity <= reorder level
    // Include category name via LEFT JOIN (products may not have categories)
    // Calculate stock value = base_price * quantity_in_stock
    `SELECT p.id, p.sku, p.name, p.quantity_in_stock, p.reorder_level,
            p.reorder_quantity, c.name as category_name,
            (p.base_price * p.quantity_in_stock) as stock_value
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.quantity_in_stock <= p.reorder_level AND p.is_active = true
     ORDER BY p.quantity_in_stock ASC, p.name ASC`
  );

  // Parse stock_value to float (DB returns as string)
  // Default to 0 if null/invalid
  return result.rows.map(row => ({
    ...row,
    stock_value: parseFloat(row.stock_value) || 0
  }));
};
```

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Choose implementation option** (A, B, or C)
3. **Start with Priority 1 files** - Backend services first
4. **Create feature branch** - `docs/inline-documentation`
5. **Implement documentation** - File by file
6. **Review and commit** - Ensure quality before merging
7. **Update documentation standards** - Add to CONTRIBUTING.md

---

## Benefits

### For New Developers
- Faster onboarding
- Understand code without reading implementation
- Clear examples of usage
- Less need to ask questions

### For Existing Developers
- Quick refresher when returning to old code
- Understand intent vs just implementation
- Easier code reviews
- Better IDE autocomplete and hints

### For Maintenance
- Easier debugging (understand expected behavior)
- Safer refactoring (know what functions do)
- Better error handling (documented edge cases)
- Clearer testing requirements

---

## Tools to Help

### VSCode Extensions
- **Document This** - Auto-generate JSDoc templates
- **Better Comments** - Color-coded comment highlighting
- **TypeDoc** - Generate HTML docs from JSDoc comments

### Linting
- **ESLint rules** for JSDoc:
  - `require-jsdoc` - Enforce JSDoc comments
  - `valid-jsdoc` - Validate JSDoc syntax
  - `jsdoc/require-description` - Require descriptions

### Documentation Generation
- **TypeDoc** - Generate static documentation site from JSDoc
- **Compodoc** - Angular/TypeScript documentation tool
- **JSDoc** - Classic JavaScript documentation generator

---

## Maintenance Plan

### Going Forward
1. **Add JSDoc to all new functions** before committing
2. **Update docs when changing behavior** (keep in sync)
3. **Review documentation in code reviews** (as important as code)
4. **Run TypeDoc monthly** to generate updated docs site
5. **Add to Definition of Done**: "Function is documented with JSDoc"

---

**Ready to implement?** Let me know which option you prefer:
- **Option A**: Comprehensive documentation (all files, all phases)
- **Option B**: Critical path only (high-priority files)
- **Option C**: Start with Phase 3C files only (most recent work)
