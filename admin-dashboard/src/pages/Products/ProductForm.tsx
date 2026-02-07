import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store';
import {
  fetchProductById,
  createProduct,
  updateProduct,
  fetchCategories,
  clearCurrentProduct,
} from '../../store/slices/product.slice';
import { CreateProductRequest, UpdateProductRequest } from '../../services/product.service';

export const ProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { currentProduct, categories, isLoading, error } = useSelector(
    (state: RootState) => state.product
  );

  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    category_id: '',
    base_price: '',
    cost_price: '',
    tax_rate: '0',
    quantity_in_stock: '0',
    reorder_level: '10',
    reorder_quantity: '20',
    vendor_id: '',
    image_url: '',
    is_active: true,
  });

  const [formError, setFormError] = useState('');

  useEffect(() => {
    dispatch(fetchCategories());

    if (id) {
      dispatch(fetchProductById(id));
    }

    return () => {
      dispatch(clearCurrentProduct());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (currentProduct && id) {
      setFormData({
        sku: currentProduct.sku,
        barcode: currentProduct.barcode || '',
        name: currentProduct.name,
        description: currentProduct.description || '',
        category_id: currentProduct.category_id || '',
        base_price: currentProduct.base_price.toString(),
        cost_price: currentProduct.cost_price?.toString() || '',
        tax_rate: currentProduct.tax_rate.toString(),
        quantity_in_stock: currentProduct.quantity_in_stock.toString(),
        reorder_level: currentProduct.reorder_level.toString(),
        reorder_quantity: currentProduct.reorder_quantity.toString(),
        vendor_id: currentProduct.vendor_id || '',
        image_url: currentProduct.image_url || '',
        is_active: currentProduct.is_active,
      });
    }
  }, [currentProduct, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!formData.sku || !formData.name || !formData.base_price) {
      setFormError('SKU, Name, and Base Price are required');
      return;
    }

    const productData: CreateProductRequest | UpdateProductRequest = {
      sku: formData.sku,
      barcode: formData.barcode || undefined,
      name: formData.name,
      description: formData.description || undefined,
      category_id: formData.category_id || undefined,
      base_price: parseFloat(formData.base_price),
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : undefined,
      tax_rate: parseFloat(formData.tax_rate),
      quantity_in_stock: parseInt(formData.quantity_in_stock, 10),
      reorder_level: parseInt(formData.reorder_level, 10),
      reorder_quantity: parseInt(formData.reorder_quantity, 10),
      vendor_id: formData.vendor_id || undefined,
      image_url: formData.image_url || undefined,
    };

    try {
      if (id) {
        await dispatch(
          updateProduct({ id, data: { ...productData, is_active: formData.is_active } })
        ).unwrap();
      } else {
        await dispatch(createProduct(productData as CreateProductRequest)).unwrap();
      }
      navigate('/products');
    } catch (err: any) {
      setFormError(err || 'Failed to save product');
    }
  };

  if (isLoading && id && !currentProduct) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading product...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{id ? 'Edit Product' : 'Add New Product'}</h1>
        <button onClick={() => navigate('/products')} style={styles.backButton}>
          Back to List
        </button>
      </div>

      {(error || formError) && <div style={styles.error}>{error || formError}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              SKU <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              style={styles.input}
              required
              disabled={!!id}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Barcode</label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroupFull}>
            <label style={styles.label}>
              Product Name <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroupFull}>
            <label style={styles.label}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              style={styles.textarea}
              rows={3}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Category</label>
            <select name="category_id" value={formData.category_id} onChange={handleChange} style={styles.select}>
              <option value="">-- Select Category --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Base Price <span style={styles.required}>*</span>
            </label>
            <input
              type="number"
              name="base_price"
              value={formData.base_price}
              onChange={handleChange}
              style={styles.input}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Cost Price</label>
            <input
              type="number"
              name="cost_price"
              value={formData.cost_price}
              onChange={handleChange}
              style={styles.input}
              step="0.01"
              min="0"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Tax Rate (%)</label>
            <input
              type="number"
              name="tax_rate"
              value={formData.tax_rate}
              onChange={handleChange}
              style={styles.input}
              step="0.01"
              min="0"
              max="100"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Quantity in Stock</label>
            <input
              type="number"
              name="quantity_in_stock"
              value={formData.quantity_in_stock}
              onChange={handleChange}
              style={styles.input}
              min="0"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Reorder Level</label>
            <input
              type="number"
              name="reorder_level"
              value={formData.reorder_level}
              onChange={handleChange}
              style={styles.input}
              min="0"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Reorder Quantity</label>
            <input
              type="number"
              name="reorder_quantity"
              value={formData.reorder_quantity}
              onChange={handleChange}
              style={styles.input}
              min="0"
            />
          </div>

          <div style={styles.formGroupFull}>
            <label style={styles.label}>Image URL</label>
            <input
              type="url"
              name="image_url"
              value={formData.image_url}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          {id && (
            <div style={styles.formGroupFull}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  style={styles.checkbox}
                />
                Active
              </label>
            </div>
          )}
        </div>

        <div style={styles.formActions}>
          <button type="button" onClick={() => navigate('/products')} style={styles.cancelButton}>
            Cancel
          </button>
          <button type="submit" style={styles.submitButton} disabled={isLoading}>
            {isLoading ? 'Saving...' : id ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1200px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '28px',
    margin: 0,
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '2rem',
    color: '#666',
  },
  error: {
    padding: '1rem',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
  form: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  formGroupFull: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '0.5rem',
  },
  required: {
    color: '#dc3545',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  textarea: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
  },
  select: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '14px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
  },
};
