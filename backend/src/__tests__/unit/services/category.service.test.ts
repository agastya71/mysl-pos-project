/**
 * Category Service Tests
 */

import { CategoryService } from '../../../services/category.service';
import { pool } from '../../../config/database';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../../../types/category.types';

jest.mock('../../../config/database');
jest.mock('../../../utils/logger');

describe('CategoryService', () => {
  let categoryService: CategoryService;

  beforeEach(() => {
    categoryService = new CategoryService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    it('should create a category successfully', async () => {
      const createData: CreateCategoryRequest = {
        name: 'Electronics',
        description: 'Electronic devices and accessories',
        display_order: 1,
      };

      const mockCategory = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        category_number: 'CAT-000001',
        name: 'Electronics',
        description: 'Electronic devices and accessories',
        parent_category_id: null,
        display_order: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockCategory], rowCount: 1 });

      const result = await categoryService.createCategory(createData);

      expect(result).toEqual(mockCategory);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories'),
        expect.arrayContaining([createData.name, createData.description, createData.display_order])
      );
    });

    it('should create a category with parent', async () => {
      const parentId = '123e4567-e89b-12d3-a456-426614174000';
      const createData: CreateCategoryRequest = {
        name: 'Smartphones',
        parent_category_id: parentId,
      };

      const mockCategory = {
        id: '223e4567-e89b-12d3-a456-426614174000',
        category_number: 'CAT-000002',
        name: 'Smartphones',
        description: null,
        parent_category_id: parentId,
        display_order: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockCategory], rowCount: 1 });

      const result = await categoryService.createCategory(createData);

      expect(result).toEqual(mockCategory);
      expect(result.parent_category_id).toBe(parentId);
    });

    it('should throw error if name is empty', async () => {
      const createData: CreateCategoryRequest = {
        name: '',
      };

      await expect(categoryService.createCategory(createData)).rejects.toThrow();
    });
  });

  describe('getCategoryById', () => {
    it('should return category with children and product count', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';

      const mockCategory = {
        id: categoryId,
        category_number: 'CAT-000001',
        name: 'Electronics',
        description: 'Electronic devices',
        parent_category_id: null,
        display_order: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        product_count: '5',
      };

      const mockChildren = [
        {
          id: '223e4567-e89b-12d3-a456-426614174000',
          category_number: 'CAT-000002',
          name: 'Smartphones',
          parent_category_id: categoryId,
          display_order: 1,
          is_active: true,
          product_count: '3',
        },
      ];

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockCategory], rowCount: 1 })
        .mockResolvedValueOnce({ rows: mockChildren, rowCount: 1 });

      const result = await categoryService.getCategoryById(categoryId);

      expect(result.id).toBe(categoryId);
      expect(result.product_count).toBe(5);
      expect(result.children).toHaveLength(1);
      expect(result.children[0].name).toBe('Smartphones');
    });

    it('should throw error if category not found', async () => {
      const categoryId = 'non-existent-id';

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(categoryService.getCategoryById(categoryId)).rejects.toThrow('Category not found');
    });
  });

  describe('getCategories', () => {
    it('should return all categories in tree structure', async () => {
      const mockCategories = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          category_number: 'CAT-000001',
          name: 'Electronics',
          description: 'Electronic devices',
          parent_category_id: null,
          display_order: 1,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          product_count: '5',
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174000',
          category_number: 'CAT-000002',
          name: 'Smartphones',
          description: null,
          parent_category_id: '123e4567-e89b-12d3-a456-426614174000',
          display_order: 1,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          product_count: '3',
        },
      ];

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockCategories, rowCount: 2 });

      const result = await categoryService.getCategories();

      expect(result).toHaveLength(1); // Only root categories
      expect(result[0].children).toHaveLength(1); // Has one child
      expect(result[0].children[0].name).toBe('Smartphones');
    });

    it('should return empty array if no categories', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await categoryService.getCategories();

      expect(result).toEqual([]);
    });

    it('should filter by active status', async () => {
      const mockCategories = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          category_number: 'CAT-000001',
          name: 'Electronics',
          description: null,
          parent_category_id: null,
          display_order: 1,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          product_count: '5',
        },
      ];

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockCategories, rowCount: 1 });

      const result = await categoryService.getCategories(true);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.is_active = $1'),
        [true]
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('updateCategory', () => {
    it('should update category successfully', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData: UpdateCategoryRequest = {
        name: 'Consumer Electronics',
        description: 'Updated description',
      };

      const mockUpdatedCategory = {
        id: categoryId,
        category_number: 'CAT-000001',
        name: 'Consumer Electronics',
        description: 'Updated description',
        parent_category_id: null,
        display_order: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUpdatedCategory], rowCount: 1 });

      const result = await categoryService.updateCategory(categoryId, updateData);

      expect(result).toEqual(mockUpdatedCategory);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE categories'),
        expect.any(Array)
      );
    });

    it('should throw error if category not found', async () => {
      const categoryId = 'non-existent-id';
      const updateData: UpdateCategoryRequest = {
        name: 'Updated Name',
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(categoryService.updateCategory(categoryId, updateData)).rejects.toThrow(
        'Category not found'
      );
    });
  });

  describe('deleteCategory', () => {
    it('should soft delete category successfully', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: categoryId }], rowCount: 1 });

      await categoryService.deleteCategory(categoryId);

      expect(pool.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE categories'),
        [categoryId]
      );
    });

    it('should throw error if category has products', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 });

      await expect(categoryService.deleteCategory(categoryId)).rejects.toThrow(
        'Cannot delete category with active products'
      );
    });

    it('should throw error if category has children', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'child-id' }], rowCount: 1 });

      await expect(categoryService.deleteCategory(categoryId)).rejects.toThrow(
        'Cannot delete category with subcategories'
      );
    });

    it('should throw error if category not found', async () => {
      const categoryId = 'non-existent-id';

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(categoryService.deleteCategory(categoryId)).rejects.toThrow('Category not found');
    });
  });
});
