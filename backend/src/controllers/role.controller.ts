/**
 * @fileoverview Role Controller - HTTP request handlers for role and permission management
 *
 * This controller handles all role-related API endpoints:
 * - POST /api/v1/roles - Create new role
 * - GET /api/v1/roles - List all roles
 * - GET /api/v1/roles/:id - Get role details with permissions
 * - PUT /api/v1/roles/:id - Update role
 * - POST /api/v1/roles/:id/permissions - Assign permission to role
 * - DELETE /api/v1/roles/:id/permissions/:permissionId - Revoke permission from role
 * - GET /api/v1/roles/permissions/all - Get all available permissions
 *
 * Features:
 * - Role-based access control (RBAC) support
 * - Permission assignment and revocation
 * - Role-permission mapping with many-to-many relationship
 * - List all available permissions for UI dropdowns
 *
 * Validation:
 * - All requests validated with Zod schemas
 * - Role name uniqueness (handled by database constraint)
 * - Permission ID must exist in permissions table
 *
 * Authentication:
 * - All endpoints require JWT authentication
 * - User must have appropriate permissions (typically admin only)
 *
 * @module controllers/role
 * @requires express - Express.js framework for HTTP handling
 * @requires zod - Schema validation library
 * @requires ../services/role.service - Role business logic
 * @requires ../middleware/error.middleware - Custom error handling
 * @author Claude Sonnet 4.5 <noreply@anthropic.com>
 * @created 2026-02-14 (Phase 4: Employee Management)
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import * as RoleService from '../services/role.service';
import { AppError } from '../middleware/error.middleware';
import { ApiResponse } from '../types/api.types';
import { Role, CreateRoleDTO, UpdateRoleDTO, RoleWithPermissions, Permission } from '../types/employee.types';

/**
 * Zod validation schema for role creation
 *
 * Validates request body for POST /api/v1/roles.
 *
 * Required fields:
 * - role_name: 1-50 characters
 *
 * Optional fields:
 * - description: Description of role
 *
 * @constant
 * @type {z.ZodObject}
 */
const createRoleSchema = z.object({
  role_name: z.string().min(1, 'Role name is required').max(50, 'Role name too long'),
  description: z.string().optional().nullable(),
});

/**
 * Zod validation schema for role update
 *
 * Validates request body for PUT /api/v1/roles/:id.
 * All fields are optional (partial update).
 *
 * @constant
 * @type {z.ZodObject}
 */
const updateRoleSchema = z.object({
  role_name: z.string().min(1).max(50).optional(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

/**
 * Zod validation schema for permission assignment
 *
 * Validates request body for POST /api/v1/roles/:id/permissions.
 *
 * Required fields:
 * - permission_id: ID of permission to assign
 *
 * @constant
 * @type {z.ZodObject}
 */
const assignPermissionSchema = z.object({
  permission_id: z.number().int().positive('Permission ID must be positive'),
});

/**
 * Role Controller Class
 *
 * Handles HTTP requests for role and permission management with 7 endpoints:
 * - createRole: Create new role
 * - getRoles: List all roles
 * - getRoleById: Retrieve role details with permissions
 * - updateRole: Update role information
 * - assignPermission: Assign permission to role
 * - revokePermission: Revoke permission from role
 * - getPermissions: Get all available permissions
 *
 * All methods are async and throw AppError on validation/business logic failures.
 * Errors are caught by global error middleware.
 *
 * @class RoleController
 */
export class RoleController {
  /**
   * Create new role
   *
   * HTTP: POST /api/v1/roles
   *
   * Creates new role record. Role name must be unique (enforced by database).
   *
   * @async
   * @param {Request<{}, {}, CreateRoleDTO>} req - Express request with role data in body
   * @param {Response<ApiResponse<Role>>} res - Express response with created role
   * @returns {Promise<void>} Sends 201 Created with role details
   * @throws {AppError} 400 if validation fails (invalid data, missing required fields)
   * @throws {AppError} 409 if role name already exists (database constraint)
   */
  async createRole(req: Request<{}, {}, CreateRoleDTO>, res: Response<ApiResponse<Role>>) {
    const validation = createRoleSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    const role = await RoleService.createRole(validation.data as CreateRoleDTO);

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role,
    });
  }

  /**
   * List all roles
   *
   * HTTP: GET /api/v1/roles
   *
   * Retrieves all roles ordered by ID.
   * Does not include permissions (use GET /roles/:id for full details).
   *
   * @async
   * @param {Request} req - Express request
   * @param {Response<ApiResponse<Role[]>>} res - Express response with role list
   * @returns {Promise<void>} Sends 200 OK with role list
   */
  async getRoles(req: Request, res: Response<ApiResponse<Role[]>>) {
    const roles = await RoleService.getRoles();

    res.status(200).json({
      success: true,
      data: roles,
    });
  }

  /**
   * Get role details by ID with permissions
   *
   * HTTP: GET /api/v1/roles/:id
   *
   * Retrieves complete role details including all assigned permissions.
   * Uses JSON aggregation to return permissions as array.
   *
   * @async
   * @param {Request<{ id: string }>} req - Express request with role ID in params
   * @param {Response<ApiResponse<RoleWithPermissions>>} res - Express response with role details and permissions
   * @returns {Promise<void>} Sends 200 OK with role details and permissions
   * @throws {AppError} 400 if role ID is not a valid integer
   * @throws {AppError} 404 if role not found
   */
  async getRoleById(req: Request<{ id: string }>, res: Response<ApiResponse<RoleWithPermissions>>) {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid role ID');
    }

    const role = await RoleService.getRoleWithPermissions(id);

    if (!role) {
      throw new AppError(404, 'NOT_FOUND', 'Role not found');
    }

    res.status(200).json({
      success: true,
      data: role,
    });
  }

  /**
   * Update role
   *
   * HTTP: PUT /api/v1/roles/:id
   *
   * Updates role information. All fields are optional (partial update).
   * Validates role name uniqueness if name is being changed.
   *
   * @async
   * @param {Request<{ id: string }, {}, UpdateRoleDTO>} req - Express request with role ID in params and update data in body
   * @param {Response<ApiResponse<Role>>} res - Express response with updated role
   * @returns {Promise<void>} Sends 200 OK with updated role details
   * @throws {AppError} 400 if validation fails
   * @throws {AppError} 404 if role not found
   * @throws {AppError} 409 if new role name already exists
   */
  async updateRole(
    req: Request<{ id: string }, {}, UpdateRoleDTO>,
    res: Response<ApiResponse<Role>>
  ) {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid role ID');
    }

    const validation = updateRoleSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    // Check if role exists
    const existingRole = await RoleService.getRoleById(id);
    if (!existingRole) {
      throw new AppError(404, 'NOT_FOUND', 'Role not found');
    }

    const role = await RoleService.updateRole(id, validation.data as UpdateRoleDTO);

    if (!role) {
      throw new AppError(404, 'NOT_FOUND', 'Role not found');
    }

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: role,
    });
  }

  /**
   * Assign permission to role
   *
   * HTTP: POST /api/v1/roles/:id/permissions
   *
   * Assigns a permission to a role (many-to-many relationship).
   * Uses ON CONFLICT DO NOTHING to handle duplicate assignments gracefully.
   *
   * @async
   * @param {Request<{ id: string }, {}, { permission_id: number }>} req - Express request with role ID in params and permission_id in body
   * @param {Response<ApiResponse<null>>} res - Express response confirming assignment
   * @returns {Promise<void>} Sends 200 OK with success message
   * @throws {AppError} 400 if validation fails
   * @throws {AppError} 404 if role not found
   */
  async assignPermission(
    req: Request<{ id: string }, {}, { permission_id: number }>,
    res: Response<ApiResponse<null>>
  ) {
    const roleId = parseInt(req.params.id, 10);

    if (isNaN(roleId) || roleId <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid role ID');
    }

    const validation = assignPermissionSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    // Check if role exists
    const role = await RoleService.getRoleById(roleId);
    if (!role) {
      throw new AppError(404, 'NOT_FOUND', 'Role not found');
    }

    await RoleService.assignPermission(roleId, validation.data.permission_id);

    res.status(200).json({
      success: true,
      message: 'Permission assigned successfully',
      data: null,
    });
  }

  /**
   * Revoke permission from role
   *
   * HTTP: DELETE /api/v1/roles/:id/permissions/:permissionId
   *
   * Removes permission assignment from role.
   *
   * @async
   * @param {Request<{ id: string; permissionId: string }>} req - Express request with role ID and permission ID in params
   * @param {Response<ApiResponse<null>>} res - Express response confirming revocation
   * @returns {Promise<void>} Sends 200 OK with success message
   * @throws {AppError} 400 if role ID or permission ID is not a valid integer
   * @throws {AppError} 404 if role or permission assignment not found
   */
  async revokePermission(
    req: Request<{ id: string; permissionId: string }>,
    res: Response<ApiResponse<null>>
  ) {
    const roleId = parseInt(req.params.id, 10);
    const permissionId = parseInt(req.params.permissionId, 10);

    if (isNaN(roleId) || roleId <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid role ID');
    }

    if (isNaN(permissionId) || permissionId <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid permission ID');
    }

    const success = await RoleService.revokePermission(roleId, permissionId);

    if (!success) {
      throw new AppError(404, 'NOT_FOUND', 'Permission assignment not found');
    }

    res.status(200).json({
      success: true,
      message: 'Permission revoked successfully',
      data: null,
    });
  }

  /**
   * Get all available permissions
   *
   * HTTP: GET /api/v1/roles/permissions/all
   *
   * Retrieves all permissions in the system.
   * Used for populating permission selection UI in role management.
   *
   * @async
   * @param {Request} req - Express request
   * @param {Response<ApiResponse<Permission[]>>} res - Express response with permission list
   * @returns {Promise<void>} Sends 200 OK with permission list
   */
  async getPermissions(req: Request, res: Response<ApiResponse<Permission[]>>) {
    const permissions = await RoleService.getPermissions();

    res.status(200).json({
      success: true,
      data: permissions,
    });
  }
}

/**
 * Export singleton instance for use in routes
 *
 * @constant
 * @type {RoleController}
 */
export default new RoleController();
