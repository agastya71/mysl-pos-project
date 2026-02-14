/**
 * @fileoverview Role and Permission Management Routes
 *
 * This module defines all HTTP routes for role-based access control (RBAC) operations.
 * Includes routes for managing roles, permissions, and role-permission assignments.
 * All routes require JWT authentication via the authenticateToken middleware.
 *
 * Available Routes:
 * - POST   /api/v1/roles                         - Create new role
 * - GET    /api/v1/roles                         - List all roles
 * - GET    /api/v1/roles/:id                     - Get role by ID with permissions
 * - PUT    /api/v1/roles/:id                     - Update role
 * - POST   /api/v1/roles/:id/permissions         - Assign permission to role
 * - DELETE /api/v1/roles/:id/permissions/:permissionId - Revoke permission from role
 * - GET    /api/v1/roles/permissions/all         - List all available permissions
 *
 * Request Headers Required:
 * - Authorization: Bearer <JWT_TOKEN>
 *
 * Response Format:
 * All routes return ApiResponse<T> format:
 * {
 *   success: true,
 *   data: {...},
 *   message?: "Success message"
 * }
 *
 * Error Response Format:
 * {
 *   success: false,
 *   error: "Error message"
 * }
 *
 * @module routes/role
 * @requires express
 * @requires ../controllers/role.controller
 * @requires ../middleware/auth.middleware
 * @created 2026-02-14
 * @updated 2026-02-14
 */

import { Router } from 'express';
import { RoleController } from '../controllers/role.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const roleController = new RoleController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/v1/roles
 * @method  POST
 * @desc    Create a new role
 * @access  Private (requires JWT authentication)
 * @middleware authenticateToken
 *
 * Request Body (CreateRoleDTO):
 * {
 *   role_name: string,     // Required, unique, lowercase, max 50 chars (e.g., "supervisor")
 *   description?: string   // Optional, max 255 chars
 * }
 *
 * Response (201 Created):
 * {
 *   success: true,
 *   data: {
 *     id: 4,
 *     role_name: "supervisor",
 *     description: "Supervise cashiers and handle voids/refunds",
 *     is_active: true,
 *     created_at: "2026-02-14T10:00:00.000Z",
 *     updated_at: "2026-02-14T10:00:00.000Z"
 *   },
 *   message: "Role created successfully"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Validation errors (missing role_name, invalid format)
 * - 401 Unauthorized: Missing or invalid JWT token
 * - 409 Conflict: Role name already exists
 * - 500 Internal Server Error: Database error
 *
 * @example
 * curl -X POST http://localhost:3000/api/v1/roles \
 *   -H "Authorization: Bearer <JWT_TOKEN>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "role_name": "supervisor",
 *     "description": "Supervise cashiers and handle voids/refunds"
 *   }'
 */
router.post('/', (req, res, next) => {
  roleController.createRole(req, res).catch(next);
});

/**
 * @route   GET /api/v1/roles
 * @method  GET
 * @desc    Get all roles (without permissions)
 * @access  Private (requires JWT authentication)
 * @middleware authenticateToken
 *
 * Note: This endpoint returns roles without their permissions. Use GET /api/v1/roles/:id
 * to fetch a specific role with its full permission list.
 *
 * Response (200 OK):
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: 1,
 *       role_name: "admin",
 *       description: "Full system access",
 *       is_active: true,
 *       created_at: "2026-02-14T08:00:00.000Z",
 *       updated_at: "2026-02-14T08:00:00.000Z"
 *     },
 *     {
 *       id: 2,
 *       role_name: "cashier",
 *       description: "Basic POS operations",
 *       is_active: true,
 *       created_at: "2026-02-14T08:00:00.000Z",
 *       updated_at: "2026-02-14T08:00:00.000Z"
 *     }
 *   ]
 * }
 *
 * Error Responses:
 * - 401 Unauthorized: Missing or invalid JWT token
 * - 500 Internal Server Error: Database error
 *
 * @example
 * curl -X GET http://localhost:3000/api/v1/roles \
 *   -H "Authorization: Bearer <JWT_TOKEN>"
 */
router.get('/', (req, res, next) => {
  roleController.getRoles(req, res).catch(next);
});

/**
 * @route   GET /api/v1/roles/:id
 * @method  GET
 * @desc    Get role by ID with full permission list
 * @access  Private (requires JWT authentication)
 * @middleware authenticateToken
 *
 * URL Parameters:
 * - id: number - Role ID (required, must be positive integer)
 *
 * Response (200 OK):
 * {
 *   success: true,
 *   data: {
 *     id: 2,
 *     role_name: "cashier",
 *     description: "Basic POS operations",
 *     is_active: true,
 *     created_at: "2026-02-14T08:00:00.000Z",
 *     updated_at: "2026-02-14T08:00:00.000Z",
 *     permissions: [
 *       {
 *         id: 1,
 *         permission_name: "create_transaction",
 *         resource: "transaction",
 *         action: "create",
 *         description: "Create new transaction",
 *         created_at: "2026-02-14T08:00:00.000Z"
 *       },
 *       {
 *         id: 2,
 *         permission_name: "view_transaction",
 *         resource: "transaction",
 *         action: "read",
 *         description: "View transaction details",
 *         created_at: "2026-02-14T08:00:00.000Z"
 *       }
 *     ]
 *   }
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Invalid ID format (not a positive integer)
 * - 401 Unauthorized: Missing or invalid JWT token
 * - 404 Not Found: Role with specified ID does not exist
 * - 500 Internal Server Error: Database error
 *
 * @example
 * curl -X GET http://localhost:3000/api/v1/roles/2 \
 *   -H "Authorization: Bearer <JWT_TOKEN>"
 */
router.get('/:id', (req, res, next) => {
  roleController.getRoleById(req, res).catch(next);
});

/**
 * @route   PUT /api/v1/roles/:id
 * @method  PUT
 * @desc    Update role information
 * @access  Private (requires JWT authentication)
 * @middleware authenticateToken
 *
 * URL Parameters:
 * - id: number - Role ID (required, must be positive integer)
 *
 * Request Body (UpdateRoleDTO, all fields optional):
 * {
 *   role_name?: string,      // Must remain unique, max 50 chars
 *   description?: string | null, // Max 255 chars, null to clear
 *   is_active?: boolean      // true = active, false = deactivated
 * }
 *
 * Note: Changing role_name does not affect existing employee assignments.
 * Setting is_active to false prevents new employees from being assigned this role.
 *
 * Response (200 OK):
 * {
 *   success: true,
 *   data: {
 *     id: 4,
 *     role_name: "supervisor",
 *     description: "Updated description",
 *     is_active: true,
 *     created_at: "2026-02-14T10:00:00.000Z",
 *     updated_at: "2026-02-14T15:00:00.000Z"
 *   },
 *   message: "Role updated successfully"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Validation errors (invalid role_name format)
 * - 401 Unauthorized: Missing or invalid JWT token
 * - 404 Not Found: Role with specified ID does not exist
 * - 409 Conflict: Role name already exists for another role
 * - 500 Internal Server Error: Database error
 *
 * @example
 * curl -X PUT http://localhost:3000/api/v1/roles/4 \
 *   -H "Authorization: Bearer <JWT_TOKEN>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "description": "Updated description",
 *     "is_active": true
 *   }'
 */
router.put('/:id', (req, res, next) => {
  roleController.updateRole(req, res).catch(next);
});

/**
 * @route   POST /api/v1/roles/:id/permissions
 * @method  POST
 * @desc    Assign permission to role
 * @access  Private (requires JWT authentication)
 * @middleware authenticateToken
 *
 * URL Parameters:
 * - id: number - Role ID (required, must be positive integer)
 *
 * Request Body (AssignPermissionDTO):
 * {
 *   permission_id: number  // Required, must be valid permission ID
 * }
 *
 * Note: Creates a many-to-many relationship in the role_permissions table.
 * If the permission is already assigned to this role, the operation is idempotent
 * (no duplicate assignment).
 *
 * Response (200 OK):
 * {
 *   success: true,
 *   message: "Permission assigned to role successfully"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Validation errors (invalid permission_id)
 * - 401 Unauthorized: Missing or invalid JWT token
 * - 404 Not Found: Role or permission does not exist
 * - 500 Internal Server Error: Database error
 *
 * @example
 * curl -X POST http://localhost:3000/api/v1/roles/2/permissions \
 *   -H "Authorization: Bearer <JWT_TOKEN>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "permission_id": 5
 *   }'
 */
router.post('/:id/permissions', (req, res, next) => {
  roleController.assignPermission(req, res).catch(next);
});

/**
 * @route   DELETE /api/v1/roles/:id/permissions/:permissionId
 * @method  DELETE
 * @desc    Revoke permission from role
 * @access  Private (requires JWT authentication)
 * @middleware authenticateToken
 *
 * URL Parameters:
 * - id: number - Role ID (required, must be positive integer)
 * - permissionId: number - Permission ID (required, must be positive integer)
 *
 * Note: Removes the many-to-many relationship from the role_permissions table.
 * If the permission is not assigned to this role, returns 404.
 *
 * Response (200 OK):
 * {
 *   success: true,
 *   message: "Permission revoked from role successfully"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Invalid ID format (not a positive integer)
 * - 401 Unauthorized: Missing or invalid JWT token
 * - 404 Not Found: Role, permission, or role-permission assignment does not exist
 * - 500 Internal Server Error: Database error
 *
 * @example
 * curl -X DELETE http://localhost:3000/api/v1/roles/2/permissions/5 \
 *   -H "Authorization: Bearer <JWT_TOKEN>"
 */
router.delete('/:id/permissions/:permissionId', (req, res, next) => {
  roleController.revokePermission(req, res).catch(next);
});

/**
 * @route   GET /api/v1/roles/permissions/all
 * @method  GET
 * @desc    Get all available permissions in the system
 * @access  Private (requires JWT authentication)
 * @middleware authenticateToken
 *
 * Note: Returns all 35 permissions available in the system. Use this endpoint to
 * build permission selection UI when assigning permissions to roles.
 *
 * Response (200 OK):
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: 1,
 *       permission_name: "create_transaction",
 *       resource: "transaction",
 *       action: "create",
 *       description: "Create new transaction",
 *       created_at: "2026-02-14T08:00:00.000Z"
 *     },
 *     {
 *       id: 2,
 *       permission_name: "view_transaction",
 *       resource: "transaction",
 *       action: "read",
 *       description: "View transaction details",
 *       created_at: "2026-02-14T08:00:00.000Z"
 *     },
 *     // ... 33 more permissions
 *   ]
 * }
 *
 * Error Responses:
 * - 401 Unauthorized: Missing or invalid JWT token
 * - 500 Internal Server Error: Database error
 *
 * @example
 * curl -X GET http://localhost:3000/api/v1/roles/permissions/all \
 *   -H "Authorization: Bearer <JWT_TOKEN>"
 */
router.get('/permissions/all', (req, res, next) => {
  roleController.getPermissions(req, res).catch(next);
});

export default router;
