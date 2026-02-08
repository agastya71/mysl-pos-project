import React, { useState, CSSProperties } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createCategory, updateCategory } from '../../store/slices/categories.slice';
import { Category } from '../../types/category.types';

interface CategoryFormProps {
  category?: Category;
  onClose: () => void;
  onSuccess: () => void;
}

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (category) {
        await dispatch(updateCategory({ id: category.id, data: formData })).unwrap();
      } else {
        await dispatch(createCategory(formData)).unwrap();
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  // Flatten categories for parent dropdown (excluding current category and descendants)
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
