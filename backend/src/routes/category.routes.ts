/**
 * Category Routes
 *
 * Routes for category management
 */

import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

const router = Router();

// All category routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/v1/categories
 * @desc    Create a new category
 * @access  Private (requires category:create permission)
 */
router.post('/', requirePermission('categories', 'create'), categoryController.createCategory);

/**
 * @route   GET /api/v1/categories
 * @desc    Get all categories (tree structure)
 * @access  Private (requires category:read permission)
 */
router.get('/', requirePermission('categories', 'read'), categoryController.getCategories);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Get category by ID
 * @access  Private (requires category:read permission)
 */
router.get('/:id', requirePermission('categories', 'read'), categoryController.getCategoryById);

/**
 * @route   PUT /api/v1/categories/:id
 * @desc    Update category
 * @access  Private (requires category:update permission)
 */
router.put('/:id', requirePermission('categories', 'update'), categoryController.updateCategory);

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Delete category (soft delete)
 * @access  Private (requires category:delete permission)
 */
router.delete('/:id', requirePermission('categories', 'delete'), categoryController.deleteCategory);

export default router;
