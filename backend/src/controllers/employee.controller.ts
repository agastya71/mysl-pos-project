/**
 * @fileoverview Employee Controller - HTTP request handlers for employee management
 *
 * This controller handles all employee-related API endpoints:
 * - POST /api/v1/employees - Create new employee
 * - GET /api/v1/employees - List employees with filters and pagination
 * - GET /api/v1/employees/:id - Get employee details by ID
 * - PUT /api/v1/employees/:id - Update employee
 * - DELETE /api/v1/employees/:id - Deactivate employee (soft delete)
 *
 * Features:
 * - Auto-generated employee numbers (EMP-XXXXXX)
 * - Role-based access control integration
 * - Terminal assignment for POS access
 * - Search by name, email, or employee number
 * - Filter by role and active status
 * - Pagination support
 *
 * Validation:
 * - All requests validated with Zod schemas
 * - Email uniqueness enforced
 * - Role ID must exist in roles table
 * - Terminal ID must be valid UUID
 *
 * Authentication:
 * - All endpoints require JWT authentication
 * - User must have appropriate permissions
 *
 * @module controllers/employee
 * @requires express - Express.js framework for HTTP handling
 * @requires zod - Schema validation library
 * @requires ../services/employee.service - Employee business logic
 * @requires ../middleware/error.middleware - Custom error handling
 * @author Claude Sonnet 4.5 <noreply@anthropic.com>
 * @created 2026-02-14 (Phase 4: Employee Management)
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import * as EmployeeService from '../services/employee.service';
import { AppError } from '../middleware/error.middleware';
import { ApiResponse } from '../types/api.types';
import {
  Employee,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  EmployeeListResult,
} from '../types/employee.types';

/**
 * Zod validation schema for employee creation
 *
 * Validates request body for POST /api/v1/employees.
 *
 * Required fields:
 * - first_name: 1-100 characters
 * - last_name: 1-100 characters
 * - email: Valid email format
 * - hire_date: ISO date string (YYYY-MM-DD)
 * - role_id: Positive integer
 *
 * Optional fields:
 * - phone: Phone number string
 * - assigned_terminal_id: UUID of terminal
 * - user_id: UUID of auth user account
 *
 * @constant
 * @type {z.ZodObject}
 */
const createEmployeeSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional().nullable(),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
  role_id: z.number().int().positive('Role ID must be positive'),
  assigned_terminal_id: z.string().uuid('Invalid terminal ID').optional().nullable(),
  user_id: z.string().uuid('Invalid user ID').optional().nullable(),
});

/**
 * Zod validation schema for employee list query parameters
 *
 * Validates query parameters for GET /api/v1/employees.
 * All parameters are optional.
 *
 * Filtering:
 * - role_id: Filter by role
 * - is_active: Filter by active status
 * - search: Search by name, email, or employee number
 *
 * Pagination:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 *
 * @constant
 * @type {z.ZodObject}
 */
const listEmployeesSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  role_id: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  is_active: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  search: z.string().optional(),
});

/**
 * Zod validation schema for employee update
 *
 * Validates request body for PUT /api/v1/employees/:id.
 * All fields are optional (partial update).
 *
 * @constant
 * @type {z.ZodObject}
 */
const updateEmployeeSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  role_id: z.number().int().positive().optional(),
  assigned_terminal_id: z.string().uuid().optional().nullable(),
  termination_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  is_active: z.boolean().optional(),
});

/**
 * Employee Controller Class
 *
 * Handles HTTP requests for employee management with 5 endpoints:
 * - createEmployee: Create new employee
 * - getEmployees: List employees with filters and pagination
 * - getEmployeeById: Retrieve employee details by ID
 * - updateEmployee: Update employee information
 * - deactivateEmployee: Soft delete employee (set is_active to false)
 *
 * All methods are async and throw AppError on validation/business logic failures.
 * Errors are caught by global error middleware.
 *
 * @class EmployeeController
 */
export class EmployeeController {
  /**
   * Create new employee
   *
   * HTTP: POST /api/v1/employees
   *
   * Creates new employee record with auto-generated employee number (EMP-XXXXXX).
   * Validates email uniqueness and role existence.
   *
   * @async
   * @param {Request<{}, {}, CreateEmployeeDTO>} req - Express request with employee data in body
   * @param {Response<ApiResponse<Employee>>} res - Express response with created employee
   * @returns {Promise<void>} Sends 201 Created with employee details
   * @throws {AppError} 400 if validation fails (invalid data, missing required fields)
   * @throws {AppError} 404 if role_id does not exist
   * @throws {AppError} 409 if email already exists
   */
  async createEmployee(
    req: Request<{}, {}, CreateEmployeeDTO>,
    res: Response<ApiResponse<Employee>>
  ) {
    const validation = createEmployeeSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    // Check if email already exists
    const existingEmployee = await EmployeeService.getEmployeeByEmail(validation.data.email);
    if (existingEmployee) {
      throw new AppError(409, 'CONFLICT', 'Employee with this email already exists');
    }

    const employee = await EmployeeService.createEmployee(validation.data as CreateEmployeeDTO);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee,
    });
  }

  /**
   * List employees with filters and pagination
   *
   * HTTP: GET /api/v1/employees
   *
   * Retrieves paginated list of employees with optional filtering and search.
   * Includes role name via LEFT JOIN.
   *
   * @async
   * @param {Request<{}, {}, {}, any>} req - Express request with query parameters
   * @param {Response<ApiResponse<EmployeeListResult>>} res - Express response with employee list and pagination
   * @returns {Promise<void>} Sends 200 OK with employee list and pagination metadata
   * @throws {AppError} 400 if query parameters invalid
   */
  async getEmployees(req: Request<{}, {}, {}, any>, res: Response<ApiResponse<EmployeeListResult>>) {
    const validation = listEmployeesSchema.safeParse(req.query);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid query parameters', validation.error.errors);
    }

    const { page, limit, role_id, is_active, search } = validation.data;

    const filters = {
      role_id,
      is_active,
      search,
    };

    const pagination = {
      page,
      limit,
    };

    const result = await EmployeeService.getEmployees(filters, pagination);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  /**
   * Get employee details by ID
   *
   * HTTP: GET /api/v1/employees/:id
   *
   * Retrieves complete employee details including role name.
   *
   * @async
   * @param {Request<{ id: string }>} req - Express request with employee ID in params
   * @param {Response<ApiResponse<Employee>>} res - Express response with employee details
   * @returns {Promise<void>} Sends 200 OK with employee details
   * @throws {AppError} 400 if employee ID is not a valid integer
   * @throws {AppError} 404 if employee not found
   */
  async getEmployeeById(req: Request<{ id: string }>, res: Response<ApiResponse<Employee>>) {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid employee ID');
    }

    const employee = await EmployeeService.getEmployeeById(id);

    if (!employee) {
      throw new AppError(404, 'NOT_FOUND', 'Employee not found');
    }

    res.status(200).json({
      success: true,
      data: employee,
    });
  }

  /**
   * Update employee
   *
   * HTTP: PUT /api/v1/employees/:id
   *
   * Updates employee information. All fields are optional (partial update).
   * Validates email uniqueness if email is being changed.
   *
   * @async
   * @param {Request<{ id: string }, {}, UpdateEmployeeDTO>} req - Express request with employee ID in params and update data in body
   * @param {Response<ApiResponse<Employee>>} res - Express response with updated employee
   * @returns {Promise<void>} Sends 200 OK with updated employee details
   * @throws {AppError} 400 if validation fails
   * @throws {AppError} 404 if employee not found
   * @throws {AppError} 409 if new email already exists
   */
  async updateEmployee(
    req: Request<{ id: string }, {}, UpdateEmployeeDTO>,
    res: Response<ApiResponse<Employee>>
  ) {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid employee ID');
    }

    const validation = updateEmployeeSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    // Check if employee exists
    const existingEmployee = await EmployeeService.getEmployeeById(id);
    if (!existingEmployee) {
      throw new AppError(404, 'NOT_FOUND', 'Employee not found');
    }

    // Check email uniqueness if email is being changed
    if (validation.data.email && validation.data.email !== existingEmployee.email) {
      const emailExists = await EmployeeService.getEmployeeByEmail(validation.data.email);
      if (emailExists) {
        throw new AppError(409, 'CONFLICT', 'Employee with this email already exists');
      }
    }

    const employee = await EmployeeService.updateEmployee(id, validation.data as UpdateEmployeeDTO);

    if (!employee) {
      throw new AppError(404, 'NOT_FOUND', 'Employee not found');
    }

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: employee,
    });
  }

  /**
   * Deactivate employee (soft delete)
   *
   * HTTP: DELETE /api/v1/employees/:id
   *
   * Sets is_active to false instead of hard deleting the record.
   * Preserves employee history for transactions and audit trail.
   *
   * @async
   * @param {Request<{ id: string }>} req - Express request with employee ID in params
   * @param {Response<ApiResponse<Employee>>} res - Express response with deactivated employee
   * @returns {Promise<void>} Sends 200 OK with deactivated employee details
   * @throws {AppError} 400 if employee ID is not a valid integer
   * @throws {AppError} 404 if employee not found
   */
  async deactivateEmployee(req: Request<{ id: string }>, res: Response<ApiResponse<Employee>>) {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid employee ID');
    }

    const employee = await EmployeeService.deactivateEmployee(id);

    if (!employee) {
      throw new AppError(404, 'NOT_FOUND', 'Employee not found');
    }

    res.status(200).json({
      success: true,
      message: 'Employee deactivated successfully',
      data: employee,
    });
  }
}

/**
 * Export singleton instance for use in routes
 *
 * @constant
 * @type {EmployeeController}
 */
export default new EmployeeController();
