# Phase 3A Frontend Implementation Guide

## Quick Start

The backend for Phase 3A (Category Management) is **100% complete** with all tests passing. This guide shows you exactly how to implement the frontend.

---

## Step 1: Create Frontend Types (5 minutes)

**File**: `pos-client/src/types/category.types.ts`

```typescript
export interface Category {
  id: string;
  category_number: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
  product_count: number;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parent_category_id?: string;
  display_order?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  parent_category_id?: string;
  display_order?: number;
  is_active?: boolean;
}
```

---

## Step 2: Create API Service (10 minutes)

**File**: `pos-client/src/services/api/category.api.ts`

```typescript
import axios from 'axios';
import { apiClient } from './client';
import {
  Category,
  CategoryWithChildren,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../../types/category.types';
import { ApiResponse } from '../../types/api.types';

const BASE_URL = '/categories';

export const categoryApi = {
  // Get all categories (tree structure)
  getCategories: async (activeOnly?: boolean): Promise<CategoryWithChildren[]> => {
    const params = activeOnly !== undefined ? { active_only: activeOnly } : {};
    const response = await apiClient.get<ApiResponse<CategoryWithChildren[]>>(
      BASE_URL,
      { params }
    );
    return response.data.data;
  },

  // Get category by ID
  getCategoryById: async (id: string): Promise<CategoryWithChildren> => {
    const response = await apiClient.get<ApiResponse<CategoryWithChildren>>(
      `${BASE_URL}/${id}`
    );
    return response.data.data;
  },

  // Create category
  createCategory: async (data: CreateCategoryRequest): Promise<Category> => {
    const response = await apiClient.post<ApiResponse<Category>>(BASE_URL, data);
    return response.data.data;
  },

  // Update category
  updateCategory: async (
    id: string,
    data: UpdateCategoryRequest
  ): Promise<Category> => {
    const response = await apiClient.put<ApiResponse<Category>>(
      `${BASE_URL}/${id}`,
      data
    );
    return response.data.data;
  },

  // Delete category
  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },
};
```

---

## Step 3: Create Redux Slice (15 minutes)

**File**: `pos-client/src/store/slices/categories.slice.ts`

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { categoryApi } from '../../services/api/category.api';
import {
  CategoryWithChildren,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../../types/category.types';

interface CategoriesState {
  categories: CategoryWithChildren[];
  selectedCategory: CategoryWithChildren | null;
  loading: boolean;
  error: string | null;
}

const initialState: CategoriesState = {
  categories: [],
  selectedCategory: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (activeOnly?: boolean) => {
    return await categoryApi.getCategories(activeOnly);
  }
);

export const fetchCategoryById = createAsyncThunk(
  'categories/fetchCategoryById',
  async (id: string) => {
    return await categoryApi.getCategoryById(id);
  }
);

export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async (data: CreateCategoryRequest) => {
    return await categoryApi.createCategory(data);
  }
);

export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async ({ id, data }: { id: string; data: UpdateCategoryRequest }) => {
    return await categoryApi.updateCategory(id, data);
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (id: string) => {
    await categoryApi.deleteCategory(id);
    return id;
  }
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    clearSelectedCategory: (state) => {
      state.selectedCategory = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch categories
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch categories';
      })
      // Fetch category by ID
      .addCase(fetchCategoryById.fulfilled, (state, action) => {
        state.selectedCategory = action.payload;
      })
      // Create category
      .addCase(createCategory.fulfilled, (state, action) => {
        // Refresh categories after create
        state.error = null;
      })
      // Update category
      .addCase(updateCategory.fulfilled, (state) => {
        state.error = null;
      })
      // Delete category
      .addCase(deleteCategory.fulfilled, (state, action) => {
        // Remove deleted category from state
        const removeCategory = (categories: CategoryWithChildren[], id: string): CategoryWithChildren[] => {
          return categories
            .filter((cat) => cat.id !== id)
            .map((cat) => ({
              ...cat,
              children: removeCategory(cat.children, id),
            }));
        };
        state.categories = removeCategory(state.categories, action.payload);
      });
  },
});

export const { clearSelectedCategory, clearError } = categoriesSlice.actions;
export default categoriesSlice.reducer;
```

**Register in store** (`pos-client/src/store/index.ts`):
```typescript
import categoriesReducer from './slices/categories.slice';

export const store = configureStore({
  reducer: {
    // ... existing reducers
    categories: categoriesReducer,
  },
});
```

---

## Step 4: Create Category Form Component (20 minutes)

**File**: `pos-client/src/components/Category/CategoryForm.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createCategory, updateCategory } from '../../store/slices/categories.slice';
import { Category, CreateCategoryRequest } from '../../types/category.types';

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
  const flattenCategories = (cats: Category[], depth = 0): any[] => {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{category ? 'Edit Category' : 'Create Category'}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Category Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="parent">Parent Category</label>
            <select
              id="parent"
              value={formData.parent_category_id}
              onChange={(e) =>
                setFormData({ ...formData, parent_category_id: e.target.value })
              }
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

          <div className="form-group">
            <label htmlFor="display_order">Display Order</label>
            <input
              id="display_order"
              type="number"
              min="0"
              value={formData.display_order}
              onChange={(e) =>
                setFormData({ ...formData, display_order: parseInt(e.target.value) })
              }
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : category ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

---

## Step 5: Create Category List/Tree Component (25 minutes)

**File**: `pos-client/src/components/Category/CategoryTree.tsx`

```typescript
import React, { useState } from 'react';
import { CategoryWithChildren } from '../../types/category.types';

interface CategoryTreeProps {
  categories: CategoryWithChildren[];
  onEdit: (category: CategoryWithChildren) => void;
  onDelete: (category: CategoryWithChildren) => void;
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="category-tree">
      {categories.map((category) => (
        <CategoryTreeNode
          key={category.id}
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

interface CategoryTreeNodeProps {
  category: CategoryWithChildren;
  depth?: number;
  onEdit: (category: CategoryWithChildren) => void;
  onDelete: (category: CategoryWithChildren) => void;
}

const CategoryTreeNode: React.FC<CategoryTreeNodeProps> = ({
  category,
  depth = 0,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div className="category-node">
      <div
        className="category-item"
        style={{ paddingLeft: `${depth * 24}px` }}
      >
        <div className="category-info">
          {hasChildren && (
            <button
              className="expand-button"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="expand-spacer" />}

          <span className="category-number">{category.category_number}</span>
          <span className="category-name">{category.name}</span>
          {category.description && (
            <span className="category-description">{category.description}</span>
          )}
          <span className="product-count">
            {category.product_count} product{category.product_count !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="category-actions">
          <button
            className="btn-edit"
            onClick={() => onEdit(category)}
            title="Edit category"
          >
            ✏️ Edit
          </button>
          <button
            className="btn-delete"
            onClick={() => onDelete(category)}
            title="Delete category"
            disabled={category.product_count > 0 || (category.children?.length || 0) > 0}
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="category-children">
          {category.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## Step 6: Create Categories Page (20 minutes)

**File**: `pos-client/src/pages/CategoriesPage.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchCategories,
  deleteCategory,
} from '../store/slices/categories.slice';
import { CategoryTree } from '../components/Category/CategoryTree';
import { CategoryForm } from '../components/Category/CategoryForm';
import { CategoryWithChildren } from '../types/category.types';
import './CategoriesPage.css';

export const CategoriesPage: React.FC = () => {
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

    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
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
    <div className="categories-page">
      <div className="page-header">
        <h1>Categories</h1>
        <div className="header-actions">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
            />
            Show active only
          </label>
          <button className="btn-primary" onClick={handleCreate}>
            ➕ Create Category
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="empty-state">
          <p>No categories found.</p>
          <button onClick={handleCreate}>Create your first category</button>
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
  );
};
```

---

## Step 7: Add Styling (10 minutes)

**File**: `pos-client/src/pages/CategoriesPage.css`

```css
.categories-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary:hover {
  background: #0056b3;
}

.error-banner {
  background: #ffebee;
  color: #c62828;
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.category-tree {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.category-item:hover {
  background: #f5f5f5;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.expand-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  width: 20px;
  padding: 0;
}

.expand-spacer {
  width: 20px;
}

.category-number {
  font-family: monospace;
  background: #e3f2fd;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #1976d2;
}

.category-name {
  font-weight: 500;
  font-size: 15px;
}

.category-description {
  color: #666;
  font-size: 13px;
}

.product-count {
  color: #666;
  font-size: 12px;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 12px;
}

.category-actions {
  display: flex;
  gap: 8px;
}

.btn-edit,
.btn-delete {
  background: none;
  border: 1px solid #e0e0e0;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-edit:hover {
  background: #e3f2fd;
  border-color: #1976d2;
}

.btn-delete:hover:not(:disabled) {
  background: #ffebee;
  border-color: #c62828;
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 14px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.modal-actions button {
  padding: 10px 20px;
  border-radius: 4px;
  border: 1px solid #ddd;
  cursor: pointer;
  font-size: 14px;
}

.modal-actions button[type="submit"] {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.modal-actions button[type="submit"]:hover:not(:disabled) {
  background: #0056b3;
}

.modal-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

---

## Step 8: Add Route (5 minutes)

**File**: `pos-client/src/App.tsx`

Add the route:
```typescript
import { CategoriesPage } from './pages/CategoriesPage';

// In your Routes component:
<Route path="/categories" element={<CategoriesPage />} />
```

Add navigation link (in your sidebar/header):
```typescript
<Link to="/categories">📁 Categories</Link>
```

---

## Step 9: Test End-to-End

1. **Start services** (if not running):
   ```bash
   ./verify-services.sh
   ```

2. **Login** to the POS

3. **Navigate** to Categories page

4. **Create a category**:
   - Click "Create Category"
   - Enter name: "Electronics"
   - Enter description: "Electronic devices"
   - Click "Create"

5. **Create a subcategory**:
   - Click "Create Category"
   - Enter name: "Smartphones"
   - Select parent: "Electronics"
   - Click "Create"

6. **Verify tree structure**:
   - Should show Electronics with Smartphones nested underneath
   - Should show product counts (0 initially)

7. **Edit a category**:
   - Click "Edit" on Electronics
   - Change description
   - Click "Update"

8. **Try to delete parent category**:
   - Click "Delete" on Electronics
   - Should show error: "Cannot delete category with subcategories"

9. **Delete subcategory**:
   - Click "Delete" on Smartphones
   - Confirm deletion
   - Should disappear from list

10. **Delete parent category**:
    - Now "Delete" on Electronics should work
    - Confirm deletion

---

## Optional Enhancements

### Add to ProductsPage (Filter by Category)

In `ProductsPage.tsx`, add a category filter dropdown:

```typescript
const { categories } = useAppSelector((state) => state.categories);
const [selectedCategoryId, setSelectedCategoryId] = useState('');

// Fetch categories on mount
useEffect(() => {
  dispatch(fetchCategories(true));
}, []);

// Filter products by category
const filteredProducts = products.filter(product =>
  !selectedCategoryId || product.category_id === selectedCategoryId
);

// In JSX:
<select onChange={(e) => setSelectedCategoryId(e.target.value)}>
  <option value="">All Categories</option>
  {flattenCategories(categories).map(cat => (
    <option key={cat.id} value={cat.id}>{cat.name}</option>
  ))}
</select>
```

---

## Troubleshooting

**API returns 401 Unauthorized:**
- Check that `authenticate` middleware is working
- Verify token is being sent in Authorization header
- Try logging in again

**Categories not loading:**
- Check backend is running: `curl http://localhost:3000/api/v1/categories -H "Authorization: Bearer YOUR_TOKEN"`
- Check Redux DevTools for actions
- Check browser console for errors

**Form not submitting:**
- Check browser console for validation errors
- Verify API endpoint is correct
- Check network tab for API response

---

## Success Criteria

- [ ] Can navigate to /categories page
- [ ] Can see list of categories (or empty state)
- [ ] Can create a new category
- [ ] Category gets auto-generated number (CAT-XXXXXX)
- [ ] Can create a subcategory (with parent)
- [ ] Tree view shows parent-child relationships
- [ ] Can expand/collapse categories with children
- [ ] Shows product count for each category
- [ ] Can edit category name/description
- [ ] Can change category parent
- [ ] Cannot delete category with products (button disabled)
- [ ] Cannot delete category with children (button disabled)
- [ ] Can delete empty category
- [ ] Form validation works (name required)
- [ ] Error messages display correctly
- [ ] Active/Inactive filter works

---

## Next: Phase 3B (Inventory Adjustments)

Once Phase 3A frontend is complete, move to Phase 3B following the same TDD pattern:
1. Database updates (adjustment_number column, trigger)
2. Backend tests (write first!)
3. Backend service/controller/routes
4. Frontend types/API/Redux
5. Frontend components/pages
6. End-to-end testing

See `PHASE_3_PROGRESS.md` for detailed Phase 3B requirements.
