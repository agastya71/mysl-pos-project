import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
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
      .addCase(createCategory.fulfilled, (state) => {
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
