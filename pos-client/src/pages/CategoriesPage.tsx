import React, { useEffect, useState, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchCategories,
  deleteCategory,
} from '../store/slices/categories.slice';
import { CategoryTree } from '../components/Category/CategoryTree';
import { CategoryForm } from '../components/Category/CategoryForm';
import { CategoryWithChildren } from '../types/category.types';

export const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { categories, loading, error } = useAppSelector((state) => state.categories);

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithChildren | undefined>();
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useEffect(() => {
    dispatch(fetchCategories(showActiveOnly));
  }, [dispatch, showActiveOnly]);

  const handleCreate = () => {
    setEditingCategory(undefined);
    setShowForm(true);
  };

  const handleEdit = (category: CategoryWithChildren) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = async (category: CategoryWithChildren) => {
    if (category.product_count > 0) {
      alert('Cannot delete category with products. Please remove products first.');
      return;
    }
    if (category.children && category.children.length > 0) {
      alert('Cannot delete category with subcategories. Please delete subcategories first.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      try {
        await dispatch(deleteCategory(category.id)).unwrap();
      } catch (err: any) {
        alert(err.message || 'Failed to delete category');
      }
    }
  };

  const handleFormSuccess = () => {
    dispatch(fetchCategories(showActiveOnly));
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            onClick={() => navigate('/pos')}
            style={styles.backButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5a6268';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6c757d';
            }}
          >
            ← Back to POS
          </button>
          <h1 style={styles.title}>Categories</h1>
        </div>
        <div style={styles.headerActions}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              style={styles.checkbox}
            />
            <span>Show active only</span>
          </label>
          <button style={styles.btnPrimary} onClick={handleCreate}>
            ➕ Create Category
          </button>
        </div>
      </div>

      <div style={styles.container}>

        {error && <div style={styles.errorBanner}>{error}</div>}

        {loading ? (
          <div style={styles.loading}>Loading categories...</div>
        ) : categories.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No categories found.</p>
            <button style={styles.btnPrimary} onClick={handleCreate}>
              Create your first category
            </button>
          </div>
        ) : (
          <CategoryTree
            categories={categories}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {showForm && (
          <CategoryForm
            category={editingCategory}
            onClose={() => setShowForm(false)}
            onSuccess={handleFormSuccess}
          />
        )}
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    borderBottom: '2px solid #eee',
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#333',
    margin: 0,
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 40px',
  },
  headerActions: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#555',
  },
  checkbox: {
    cursor: 'pointer',
  },
  btnPrimary: {
    background: '#007bff',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  },
  errorBanner: {
    background: '#ffebee',
    color: '#c62828',
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666',
  },
  emptyText: {
    fontSize: '18px',
    marginBottom: '20px',
  },
};
