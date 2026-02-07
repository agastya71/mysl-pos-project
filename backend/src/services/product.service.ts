import { pool } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  ProductListQuery,
  ProductListResponse,
  Category,
} from '../types/product.types';
import logger from '../utils/logger';

export class ProductService {
  async createProduct(data: CreateProductRequest): Promise<Product> {
    const client = await pool.connect();
    try {
      // Check if SKU or barcode already exists
      if (data.sku) {
        const skuCheck = await client.query('SELECT id FROM products WHERE sku = $1', [data.sku]);
        if (skuCheck.rowCount && skuCheck.rowCount > 0) {
          throw new AppError(400, 'DUPLICATE_SKU', 'Product with this SKU already exists');
        }
      }

      if (data.barcode) {
        const barcodeCheck = await client.query('SELECT id FROM products WHERE barcode = $1', [
          data.barcode,
        ]);
        if (barcodeCheck.rowCount && barcodeCheck.rowCount > 0) {
          throw new AppError(400, 'DUPLICATE_BARCODE', 'Product with this barcode already exists');
        }
      }

      const result = await client.query(
        `INSERT INTO products (
          sku, barcode, name, description, category_id,
          base_price, cost_price, tax_rate, quantity_in_stock, reorder_level, reorder_quantity,
          vendor_id, image_url, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          data.sku,
          data.barcode,
          data.name,
          data.description,
          data.category_id,
          data.base_price,
          data.cost_price,
          data.tax_rate || 0,
          data.quantity_in_stock || 0,
          data.reorder_level || 0,
          data.reorder_quantity || 0,
          data.vendor_id,
          data.image_url,
          true,
        ]
      );

      logger.info('Product created', { productId: result.rows[0].id, name: data.name });
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getProducts(query: ProductListQuery): Promise<ProductListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order || 'desc';

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (query.search) {
      whereConditions.push(
        `(name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex} OR barcode ILIKE $${paramIndex})`
      );
      queryParams.push(`%${query.search}%`);
      paramIndex++;
    }

    if (query.category_id) {
      whereConditions.push(`category_id = $${paramIndex}`);
      queryParams.push(query.category_id);
      paramIndex++;
    }

    if (query.is_active !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(query.is_active);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get products
    const result = await pool.query(
      `SELECT * FROM products ${whereClause}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    return {
      products: result.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getProductById(id: string): Promise<Product> {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }

    return result.rows[0];
  }

  async searchProducts(searchTerm: string, limit: number = 10): Promise<Product[]> {
    const result = await pool.query(
      `SELECT * FROM products
       WHERE (name ILIKE $1 OR sku ILIKE $1 OR barcode = $2) AND is_active = true
       ORDER BY name
       LIMIT $3`,
      [`%${searchTerm}%`, searchTerm, limit]
    );

    return result.rows;
  }

  async updateProduct(id: string, data: UpdateProductRequest): Promise<Product> {
    const client = await pool.connect();
    try {
      // Check if product exists
      const existingProduct = await this.getProductById(id);

      // Check for duplicate SKU/barcode if updating
      if (data.sku && data.sku !== existingProduct.sku) {
        const skuCheck = await client.query('SELECT id FROM products WHERE sku = $1 AND id != $2', [
          data.sku,
          id,
        ]);
        if (skuCheck.rowCount && skuCheck.rowCount > 0) {
          throw new AppError(400, 'DUPLICATE_SKU', 'Product with this SKU already exists');
        }
      }

      if (data.barcode && data.barcode !== existingProduct.barcode) {
        const barcodeCheck = await client.query(
          'SELECT id FROM products WHERE barcode = $1 AND id != $2',
          [data.barcode, id]
        );
        if (barcodeCheck.rowCount && barcodeCheck.rowCount > 0) {
          throw new AppError(400, 'DUPLICATE_BARCODE', 'Product with this barcode already exists');
        }
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        return existingProduct;
      }

      values.push(id);
      const result = await client.query(
        `UPDATE products SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      logger.info('Product updated', { productId: id });
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteProduct(id: string): Promise<void> {
    // Soft delete by setting is_active to false
    const result = await pool.query(
      'UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }

    logger.info('Product deactivated', { productId: id });
  }

  async getCategories(): Promise<Category[]> {
    const result = await pool.query(
      'SELECT * FROM categories WHERE is_active = true ORDER BY display_order, name'
    );
    return result.rows;
  }

  async getCategoryById(id: string): Promise<Category> {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    return result.rows[0];
  }
}
