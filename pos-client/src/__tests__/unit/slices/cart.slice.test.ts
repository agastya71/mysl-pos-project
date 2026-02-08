import cartReducer, {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  CartState,
} from '../../../store/slices/cart.slice';
import { Product } from '../../../types/product.types';

describe('cart.slice', () => {
  const mockProduct: Product = {
    id: 'product-123',
    sku: 'SKU-001',
    name: 'Test Product',
    description: 'Test Description',
    price: 10.99,
    cost: 5.00,
    category: 'Test Category',
    quantity_in_stock: 100,
    reorder_level: 10,
    tax_rate: 0.08,
    barcode: '123456789',
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const initialState: CartState = {
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
  };

  describe('addToCart', () => {
    it('should add a new product to empty cart', () => {
      const state = cartReducer(initialState, addToCart({ product: mockProduct, quantity: 2 }));

      expect(state.items).toHaveLength(1);
      expect(state.items[0].product.id).toBe('product-123');
      expect(state.items[0].quantity).toBe(2);
      expect(state.subtotal).toBe(21.98);
      expect(state.tax).toBeCloseTo(1.76, 2);
      expect(state.total).toBeCloseTo(23.74, 2);
    });

    it('should increment quantity if product already in cart', () => {
      const stateWithItem: CartState = {
        items: [
          {
            id: 'cart-item-1',
            product: mockProduct,
            quantity: 1,
            unit_price: 10.99,
            subtotal: 10.99,
            tax_amount: 0.88,
          },
        ],
        subtotal: 10.99,
        tax: 0.88,
        total: 11.87,
      };

      const state = cartReducer(stateWithItem, addToCart({ product: mockProduct, quantity: 2 }));

      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(3);
      expect(state.subtotal).toBeCloseTo(32.97, 2);
    });

    it('should add multiple different products', () => {
      const anotherProduct: Product = {
        ...mockProduct,
        id: 'product-456',
        name: 'Another Product',
        price: 15.00,
      };

      let state = cartReducer(initialState, addToCart({ product: mockProduct, quantity: 1 }));
      state = cartReducer(state, addToCart({ product: anotherProduct, quantity: 1 }));

      expect(state.items).toHaveLength(2);
      expect(state.subtotal).toBeCloseTo(25.99, 2);
    });
  });

  describe('removeFromCart', () => {
    it('should remove product from cart', () => {
      const stateWithItem: CartState = {
        items: [
          {
            id: 'cart-item-1',
            product: mockProduct,
            quantity: 2,
            unit_price: 10.99,
            subtotal: 21.98,
            tax_amount: 1.76,
          },
        ],
        subtotal: 21.98,
        tax: 1.76,
        total: 23.74,
      };

      const state = cartReducer(stateWithItem, removeFromCart('product-123'));

      expect(state.items).toHaveLength(0);
      expect(state.subtotal).toBe(0);
      expect(state.tax).toBe(0);
      expect(state.total).toBe(0);
    });

    it('should not affect cart if product not found', () => {
      const stateWithItem: CartState = {
        items: [
          {
            id: 'cart-item-1',
            product: mockProduct,
            quantity: 1,
            unit_price: 10.99,
            subtotal: 10.99,
            tax_amount: 0.88,
          },
        ],
        subtotal: 10.99,
        tax: 0.88,
        total: 11.87,
      };

      const state = cartReducer(stateWithItem, removeFromCart('nonexistent-id'));

      expect(state.items).toHaveLength(1);
      expect(state.subtotal).toBeCloseTo(10.99, 2);
    });
  });

  describe('updateQuantity', () => {
    it('should update quantity of existing item', () => {
      const stateWithItem: CartState = {
        items: [
          {
            id: 'cart-item-1',
            product: mockProduct,
            quantity: 2,
            unit_price: 10.99,
            subtotal: 21.98,
            tax_amount: 1.76,
          },
        ],
        subtotal: 21.98,
        tax: 1.76,
        total: 23.74,
      };

      const state = cartReducer(stateWithItem, updateQuantity({ productId: 'product-123', quantity: 5 }));

      expect(state.items[0].quantity).toBe(5);
      expect(state.subtotal).toBeCloseTo(54.95, 2);
      expect(state.tax).toBeCloseTo(4.40, 2);
    });

    it('should remove item if quantity is 0', () => {
      const stateWithItem: CartState = {
        items: [
          {
            id: 'cart-item-1',
            product: mockProduct,
            quantity: 2,
            unit_price: 10.99,
            subtotal: 21.98,
            tax_amount: 1.76,
          },
        ],
        subtotal: 21.98,
        tax: 1.76,
        total: 23.74,
      };

      const state = cartReducer(stateWithItem, updateQuantity({ productId: 'product-123', quantity: 0 }));

      expect(state.items).toHaveLength(0);
      expect(state.subtotal).toBe(0);
    });

    it('should not allow negative quantities', () => {
      const stateWithItem: CartState = {
        items: [
          {
            id: 'cart-item-1',
            product: mockProduct,
            quantity: 2,
            unit_price: 10.99,
            subtotal: 21.98,
            tax_amount: 1.76,
          },
        ],
        subtotal: 21.98,
        tax: 1.76,
        total: 23.74,
      };

      const state = cartReducer(stateWithItem, updateQuantity({ productId: 'product-123', quantity: -1 }));

      expect(state.items[0].quantity).toBe(2); // Should not change
    });

    it('should not affect cart if product not found', () => {
      const stateWithItem: CartState = {
        items: [
          {
            id: 'cart-item-1',
            product: mockProduct,
            quantity: 2,
            unit_price: 10.99,
            subtotal: 21.98,
            tax_amount: 1.76,
          },
        ],
        subtotal: 21.98,
        tax: 1.76,
        total: 23.74,
      };

      const state = cartReducer(stateWithItem, updateQuantity({ productId: 'nonexistent-id', quantity: 5 }));

      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(2);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', () => {
      const stateWithItems: CartState = {
        items: [
          {
            id: 'cart-item-1',
            product: mockProduct,
            quantity: 2,
            unit_price: 10.99,
            subtotal: 21.98,
            tax_amount: 1.76,
          },
          {
            id: 'cart-item-2',
            product: { ...mockProduct, id: 'product-456' },
            quantity: 1,
            unit_price: 15.00,
            subtotal: 15.00,
            tax_amount: 1.20,
          },
        ],
        subtotal: 36.98,
        tax: 2.96,
        total: 39.94,
      };

      const state = cartReducer(stateWithItems, clearCart());

      expect(state.items).toHaveLength(0);
      expect(state.subtotal).toBe(0);
      expect(state.tax).toBe(0);
      expect(state.total).toBe(0);
    });

    it('should handle clearing already empty cart', () => {
      const state = cartReducer(initialState, clearCart());

      expect(state.items).toHaveLength(0);
      expect(state.subtotal).toBe(0);
    });
  });

  describe('cart totals calculation', () => {
    it('should correctly calculate totals with multiple items', () => {
      let state = initialState;

      // Add first product (2x $10.99 = $21.98 + 8% tax)
      state = cartReducer(state, addToCart({ product: mockProduct, quantity: 2 }));

      // Add second product with different price and tax rate
      const secondProduct: Product = {
        ...mockProduct,
        id: 'product-456',
        price: 20.00,
        tax_rate: 0.10, // 10% tax
      };
      state = cartReducer(state, addToCart({ product: secondProduct, quantity: 1 }));

      expect(state.items).toHaveLength(2);
      expect(state.subtotal).toBeCloseTo(41.98, 2);
      expect(state.tax).toBeCloseTo(3.76, 2); // (21.98 * 0.08) + (20.00 * 0.10)
      expect(state.total).toBeCloseTo(45.74, 2);
    });

    it('should handle products with zero tax rate', () => {
      const taxFreeProduct: Product = {
        ...mockProduct,
        tax_rate: 0,
      };

      const state = cartReducer(initialState, addToCart({ product: taxFreeProduct, quantity: 1 }));

      expect(state.subtotal).toBeCloseTo(10.99, 2);
      expect(state.tax).toBe(0);
      expect(state.total).toBeCloseTo(10.99, 2);
    });
  });
});
