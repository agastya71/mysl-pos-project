/**
 * @fileoverview CategoryForm Component - Create/edit category modal form
 *
 * Modal form for creating or editing categories with hierarchical parent selection.
 * Supports category name, description, parent, and display order.
 *
 * @module components/Category/CategoryForm
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 3A)
 * @updated 2026-02-08 (Documentation)
 */

import React, { useState, CSSProperties } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createCategory, updateCategory } from '../../store/slices/categories.slice';
import { Category } from '../../types/category.types';

/**
 * CategoryForm component props
 *
 * @interface CategoryFormProps
 * @property {Category} [category] - Category to edit (undefined for create mode)
 * @property {function} onClose - Callback when modal closes
 * @property {function} onSuccess - Callback when save succeeds (before close)
 */
interface CategoryFormProps {
  category?: Category;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * CategoryForm Component
 *
 * Modal form for creating/editing categories with hierarchical parent selection.
 * Dual mode: create (no category prop) or edit (with category prop).
 *
 * Form Fields:
 * - Category Name * (required, text input, auto-focus)
 * - Description (textarea, optional, 3 rows)
 * - Parent Category (dropdown with indented hierarchy, optional)
 * - Display Order (number input, min 0, default 0)
 *
 * Features:
 * - Excludes current category from parent dropdown (prevents circular refs)
 * - Flattens tree to dropdown with visual indentation (spaces)
 * - "-- None (Root Category) --" option for root categories
 * - Loading state ("Saving..." button text)
 * - Error display (red box with error message)
 * - Cancel and Save buttons
 * - Click overlay to close (cancel)
 *
 * Parent Dropdown:
 * - Shows all categories except current (in edit mode)
 * - Indents subcategories with spaces (2 spaces per depth level)
 * - Example: "Electronics", "  Smartphones", "    iPhone"
 *
 * @component
 * @param {CategoryFormProps} props - Component props
 * @returns {JSX.Element} Category form modal
 *
 * @example
 * // Create mode
 * const [showCreate, setShowCreate] = useState(false);
 * {showCreate && (
 *   <CategoryForm
 *     onClose={() => setShowCreate(false)}
 *     onSuccess={() => { fetchCategories(); setShowCreate(false); }}
 *   />
 * )}
 *
 * @example
 * // Edit mode
 * <CategoryForm
 *   category={selectedCategory}
 *   onClose={() => setEditing(null)}
 *   onSuccess={() => { fetchCategories(); setEditing(null); }}
 * />
 *
 * @see {@link CategoriesPage} - Parent page using this form
 */
export const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  onClose,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const { categories } = useAppSelector((state) => state.categories);

  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    parent_category_id: category?.parent_category_id || '',
    display_order: category?.display_order || 0,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * Handle form submission
   * Dispatches create or update, calls onSuccess, closes modal
   *
   * @async
   * @param {React.FormEvent} e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Convert empty string to undefined for parent_category_id
      const dataToSubmit = {
        ...formData,
        parent_category_id: formData.parent_category_id || undefined,
      };

      if (category) {
        await dispatch(updateCategory({ id: category.id, data: dataToSubmit })).unwrap();
      } else {
        await dispatch(createCategory(dataToSubmit)).unwrap();
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Flatten category tree to flat list with depth
   * Excludes current category (in edit mode) to prevent circular references
   *
   * @param {any[]} cats - Category tree array
   * @param {number} depth - Current depth level (for indentation)
   * @returns {any[]} Flat array with depth property
   */
  const flattenCategories = (cats: any[], depth = 0): any[] => {
    return cats.reduce((acc, cat) => {
      if (cat.id === category?.id) return acc; // Skip current category
      acc.push({ ...cat, depth });
      if ('children' in cat && cat.children) {
        acc.push(...flattenCategories(cat.children, depth + 1));
      }
      return acc;
    }, [] as any[]);
  };

  const availableParents = flattenCategories(categories);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{category ? 'Edit Category' : 'Create Category'}</h2>
          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label htmlFor="name" style={styles.label}>
              Category Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="description" style={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              style={styles.textarea}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="parent" style={styles.label}>
              Parent Category
            </label>
            <select
              id="parent"
              value={formData.parent_category_id}
              onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value })}
              style={styles.select}
            >
              <option value="">-- None (Root Category) --</option>
              {availableParents.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {'  '.repeat(cat.depth)}
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="display_order" style={styles.label}>
              Display Order
            </label>
            <input
              id="display_order"
              type="number"
              min="0"
              value={formData.display_order}
              onChange={(e) =>
                setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
              }
              style={styles.input}
            />
          </div>

          {error && <div style={styles.errorMessage}>{error}</div>}

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} disabled={submitting} style={styles.btnSecondary}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.btnPrimary,
                ...(submitting ? styles.btnDisabled : {}),
              }}
            >
              {submitting ? 'Saving...' : category ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#2c3e50',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    padding: 0,
    width: '30px',
    height: '30px',
    color: '#999',
    lineHeight: 1,
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 500,
    fontSize: '14px',
    color: '#555',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '80px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  errorMessage: {
    background: '#ffebee',
    color: '#c62828',
    padding: '10px 12px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
    borderLeft: '4px solid #c62828',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
  btnSecondary: {
    padding: '10px 20px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    background: 'white',
    color: '#555',
  },
  btnPrimary: {
    padding: '10px 20px',
    borderRadius: '4px',
    border: '1px solid #007bff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    background: '#007bff',
    color: 'white',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};
