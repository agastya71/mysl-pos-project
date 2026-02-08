/**
 * Category Routes
 *
 * Routes for category management
 */

import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All category routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/v1/categories
 * @desc    Create a new category
 * @access  Private
 */
router.post('/', categoryController.createCategory);

/**
 * @route   GET /api/v1/categories
 * @desc    Get all categories (tree structure)
 * @access  Private
 */
router.get('/', categoryController.getCategories);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Get category by ID
 * @access  Private
 */
router.get('/:id', categoryController.getCategoryById);

/**
 * @route   PUT /api/v1/categories/:id
 * @desc    Update category
 * @access  Private
 */
router.put('/:id', categoryController.updateCategory);

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Delete category (soft delete)
 * @access  Private
 */
router.delete('/:id', categoryController.deleteCategory);

export default router;
