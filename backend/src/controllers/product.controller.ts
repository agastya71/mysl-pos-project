import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { ApiResponse } from '../types/api.types';
import {
  Product,
  ProductListResponse,
  CreateProductRequest,
  UpdateProductRequest,
  ProductListQuery,
  Category,
} from '../types/product.types';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';

const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100),
  barcode: z.string().max(100).optional(),
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().optional(),
  category_id: z.string().uuid().optional(),
  base_price: z.number().min(0, 'Base price must be positive'),
  cost_price: z.number().min(0).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  quantity_in_stock: z.number().int().min(0).optional(),
  reorder_level: z.number().int().min(0).optional(),
  reorder_quantity: z.number().int().min(0).optional(),
  vendor_id: z.string().uuid().optional(),
  image_url: z.string().url().optional(),
});

const updateProductSchema = z.object({
  sku: z.string().min(1).max(100).optional(),
  barcode: z.string().max(100).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category_id: z.string().uuid().optional(),
  base_price: z.number().min(0).optional(),
  cost_price: z.number().min(0).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  quantity_in_stock: z.number().int().min(0).optional(),
  reorder_level: z.number().int().min(0).optional(),
  reorder_quantity: z.number().int().min(0).optional(),
  vendor_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  image_url: z.string().url().optional(),
});

const listProductsSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  search: z.string().optional(),
  category_id: z.string().uuid().optional(),
  is_active: z
    .string()
    .optional()
    .transform((val) => (val ? val === 'true' : undefined)),
  sort_by: z.enum(['name', 'base_price', 'quantity_in_stock', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  async createProduct(
    req: Request<{}, {}, CreateProductRequest>,
    res: Response<ApiResponse<Product>>
  ) {
    const validation = createProductSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    const product = await this.productService.createProduct(validation.data as any);

    res.status(201).json({
      success: true,
      data: product,
    });
  }

  async getProducts(req: Request, res: Response<ApiResponse<ProductListResponse>>) {
    const validation = listProductsSchema.safeParse(req.query);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid query parameters', validation.error.errors);
    }

    const result = await this.productService.getProducts(validation.data as ProductListQuery);

    res.json({
      success: true,
      data: result,
    });
  }

  async getProductById(req: Request<{ id: string }>, res: Response<ApiResponse<Product>>) {
    const product = await this.productService.getProductById(req.params.id);

    res.json({
      success: true,
      data: product,
    });
  }

  async searchProducts(req: Request, res: Response<ApiResponse<Product[]>>) {
    const { q, limit } = req.query;

    if (!q || typeof q !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Search query (q) is required');
    }

    const limitNum = limit ? parseInt(limit as string, 10) : 10;
    const products = await this.productService.searchProducts(q, limitNum);

    res.json({
      success: true,
      data: products,
    });
  }

  async updateProduct(
    req: Request<{ id: string }, {}, UpdateProductRequest>,
    res: Response<ApiResponse<Product>>
  ) {
    const validation = updateProductSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    const product = await this.productService.updateProduct(req.params.id, validation.data);

    res.json({
      success: true,
      data: product,
    });
  }

  async deleteProduct(req: Request<{ id: string }>, res: Response<ApiResponse>) {
    await this.productService.deleteProduct(req.params.id);

    res.json({
      success: true,
      data: { message: 'Product deactivated successfully' },
    });
  }

  async getCategories(req: Request, res: Response<ApiResponse<Category[]>>) {
    const categories = await this.productService.getCategories();

    res.json({
      success: true,
      data: categories,
    });
  }
}
