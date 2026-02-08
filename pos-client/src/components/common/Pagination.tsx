/**
 * @fileoverview Pagination Component - Reusable pagination controls for list views
 *
 * This component provides standard pagination UI with Previous/Next buttons
 * and current page indicator. Used across all paginated list views in the application.
 *
 * Features:
 * - Previous/Next navigation buttons
 * - Current page and total pages display
 * - Automatic button disable at boundaries (page 1 / last page)
 * - Consistent styling across all list views
 * - Callback-based page change handling
 *
 * Used In:
 * - TransactionHistoryPage (transaction list pagination)
 * - CustomersPage (customer list pagination)
 * - InventoryHistoryPage (adjustment list pagination)
 * - Any other paginated list views
 *
 * Styling:
 * - Inline styles for consistency
 * - Gray border with white background
 * - Disabled state: gray background, not-allowed cursor
 * - Hover effects via CSS transition
 * - Centered layout with flexbox
 *
 * @module components/common/Pagination
 * @requires react - React library for component rendering
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1D)
 * @updated 2026-02-08 (Documentation)
 */

import React from 'react';

/**
 * Pagination component props interface
 *
 * Defines the required props for the Pagination component.
 * All props are required for proper pagination functionality.
 *
 * @interface PaginationProps
 * @property {number} currentPage - Current active page number (1-indexed)
 * @property {number} totalPages - Total number of pages available
 * @property {function} onPageChange - Callback fired when page changes
 */
interface PaginationProps {
  /** Current active page number (1-indexed, minimum: 1) */
  currentPage: number;
  /** Total number of pages available (minimum: 1) */
  totalPages: number;
  /** Callback fired when user navigates to different page */
  onPageChange: (page: number) => void;
}

/**
 * Pagination Component
 *
 * Reusable pagination control for navigating through paginated lists.
 * Provides Previous/Next buttons and displays current page information.
 *
 * Behavior:
 * - Previous button: Disabled on first page (currentPage === 1)
 * - Next button: Disabled on last page (currentPage === totalPages)
 * - Page info: Shows "Page X of Y" format
 * - Navigation: Calls onPageChange with new page number
 *
 * Button states:
 * - Enabled: White background, pointer cursor, hover effect
 * - Disabled: Gray background, not-allowed cursor, gray text
 *
 * Page change handling:
 * - Previous: Decrements page by 1 (if not on first page)
 * - Next: Increments page by 1 (if not on last page)
 * - Parent component receives new page number via onPageChange
 * - Parent component responsible for fetching new data
 *
 * Styling approach:
 * - Inline styles for component isolation
 * - No external CSS dependencies
 * - Consistent appearance across all usage contexts
 *
 * @component
 * @param {PaginationProps} props - Component props
 * @returns {JSX.Element} Rendered pagination controls
 *
 * @example
 * // Basic usage in a list page
 * const [currentPage, setCurrentPage] = useState(1);
 * const totalPages = 10;
 *
 * const handlePageChange = (page: number) => {
 *   setCurrentPage(page);
 *   // Fetch data for new page
 *   fetchData({ page, limit: 20 });
 * };
 *
 * return (
 *   <div>
 *     <ItemList items={items} />
 *     <Pagination
 *       currentPage={currentPage}
 *       totalPages={totalPages}
 *       onPageChange={handlePageChange}
 *     />
 *   </div>
 * );
 *
 * @example
 * // Usage with API pagination metadata
 * const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });
 *
 * const handlePageChange = async (page: number) => {
 *   const response = await api.getItems({ page, limit: 20 });
 *   setData(response);
 * };
 *
 * return (
 *   <div>
 *     <ItemList items={data.items} />
 *     <Pagination
 *       currentPage={data.pagination.page}
 *       totalPages={data.pagination.totalPages}
 *       onPageChange={handlePageChange}
 *     />
 *   </div>
 * );
 *
 * @example
 * // Single page case (no pagination needed)
 * // When totalPages === 1, component still renders but both buttons disabled
 * <Pagination
 *   currentPage={1}
 *   totalPages={1}
 *   onPageChange={() => {}}
 * />
 * // Shows: "← Previous [disabled]  Page 1 of 1  Next → [disabled]"
 *
 * @example
 * // Empty list case (no items)
 * // When totalPages === 0, parent should hide pagination component
 * {totalPages > 0 && (
 *   <Pagination
 *     currentPage={currentPage}
 *     totalPages={totalPages}
 *     onPageChange={handlePageChange}
 *   />
 * )}
 *
 * @see TransactionHistoryPage for usage in transaction list
 * @see CustomersPage for usage in customer list
 * @see InventoryHistoryPage for usage in adjustment list
 */
const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  /**
   * Handle previous page navigation
   *
   * Decrements current page by 1 if not on first page.
   * Calls onPageChange with new page number.
   *
   * @function handlePrevious
   * @returns {void}
   */
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  /**
   * Handle next page navigation
   *
   * Increments current page by 1 if not on last page.
   * Calls onPageChange with new page number.
   *
   * @function handleNext
   * @returns {void}
   */
  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  /**
   * Component inline styles
   *
   * Defines all styling for pagination component.
   * Inline styles ensure component works standalone without external CSS.
   *
   * @constant
   * @type {object}
   */
  const styles = {
    /** Container: Centered flexbox with gap between elements */
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      padding: '20px 0',
    },
    /** Button enabled state: White background, pointer cursor */
    button: {
      padding: '8px 16px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s',
    } as React.CSSProperties,
    /** Button disabled state: Gray background, not-allowed cursor */
    buttonDisabled: {
      padding: '8px 16px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      backgroundColor: '#f5f5f5',
      cursor: 'not-allowed',
      color: '#999',
    } as React.CSSProperties,
    /** Page info: Current page and total pages display */
    pageInfo: {
      fontSize: '14px',
      color: '#666',
      padding: '0 10px',
    },
  };

  return (
    <div style={styles.container}>
      {/* Previous button: Disabled on first page */}
      <button
        onClick={handlePrevious}
        disabled={currentPage <= 1}
        style={currentPage <= 1 ? styles.buttonDisabled : styles.button}
      >
        ← Previous
      </button>

      {/* Page indicator: Shows "Page X of Y" */}
      <div style={styles.pageInfo}>
        Page {currentPage} of {totalPages}
      </div>

      {/* Next button: Disabled on last page */}
      <button
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        style={currentPage >= totalPages ? styles.buttonDisabled : styles.button}
      >
        Next →
      </button>
    </div>
  );
};

export default Pagination;
