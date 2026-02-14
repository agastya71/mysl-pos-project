import { Router } from 'express';
import { RoleController } from '../controllers/role.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const roleController = new RoleController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/v1/roles
 * @desc    Create a new role
 * @access  Private (requires authentication)
 */
router.post('/', (req, res, next) => {
  roleController.createRole(req, res).catch(next);
});

/**
 * @route   GET /api/v1/roles
 * @desc    Get all roles
 * @access  Private
 */
router.get('/', (req, res, next) => {
  roleController.getRoles(req, res).catch(next);
});

/**
 * @route   GET /api/v1/roles/:id
 * @desc    Get role by ID with permissions
 * @access  Private
 */
router.get('/:id', (req, res, next) => {
  roleController.getRoleById(req, res).catch(next);
});

/**
 * @route   PUT /api/v1/roles/:id
 * @desc    Update role
 * @access  Private
 */
router.put('/:id', (req, res, next) => {
  roleController.updateRole(req, res).catch(next);
});

/**
 * @route   POST /api/v1/roles/:id/permissions
 * @desc    Assign permission to role
 * @access  Private
 */
router.post('/:id/permissions', (req, res, next) => {
  roleController.assignPermission(req, res).catch(next);
});

/**
 * @route   DELETE /api/v1/roles/:id/permissions/:permissionId
 * @desc    Revoke permission from role
 * @access  Private
 */
router.delete('/:id/permissions/:permissionId', (req, res, next) => {
  roleController.revokePermission(req, res).catch(next);
});

/**
 * @route   GET /api/v1/permissions
 * @desc    Get all permissions
 * @access  Private
 */
router.get('/permissions/all', (req, res, next) => {
  roleController.getPermissions(req, res).catch(next);
});

export default router;
