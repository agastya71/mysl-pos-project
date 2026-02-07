import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Product, ProductListQuery } from '../../types/product.types';
import { productApi } from '../../services/api/product.api';

export interface ProductsState {
  items: Product[];
  searchResults: Product[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
}

const initialState: ProductsState = {
  items: [],
  searchResults: [],
  isLoading: false,
  error: null,
  searchQuery: '',
};

export const searchProducts = createAsyncThunk(
  'products/search',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await productApi.searchProducts(query, 20);
      return response.products;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Search failed');
    }
  }
);

export const fetchProducts = createAsyncThunk(
  'products/fetch',
  async (filters: ProductListQuery, { rejectWithValue }) => {
    try {
      const response = await productApi.getProducts(filters);
      return response.products;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Fetch failed');
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchQuery = '';
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchProducts.fulfilled, (state, action: PayloadAction<Product[]>) => {
        state.isLoading = false;
        state.searchResults = action.payload;
        state.error = null;
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action: PayloadAction<Product[]>) => {
        state.isLoading = false;
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSearchQuery, clearSearchResults, clearError } = productsSlice.actions;
export default productsSlice.reducer;
