/**
 * @fileoverview Employee Management Routes
 *
 * This module defines all HTTP routes for employee management operations.
 * All routes require JWT authentication via the authenticateToken middleware.
 *
 * Available Routes:
 * - POST   /api/v1/employees              - Create new employee
 * - GET    /api/v1/employees              - List employees with filters/pagination
 * - GET    /api/v1/employees/:id          - Get employee by ID
 * - PUT    /api/v1/employees/:id          - Update employee
 * - DELETE /api/v1/employees/:id          - Deactivate employee (soft delete)
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
 * @module routes/employee
 * @requires express
 * @requires ../controllers/employee.controller
 * @requires ../middleware/auth.middleware
 * @created 2026-02-14
 * @updated 2026-02-14
 */

import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

const router = Router();
const employeeController = new EmployeeController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/v1/employees
 * @method  POST
 * @desc    Create a new employee
 * @access  Private (requires JWT authentication)
 * @middleware authenticateToken
 *
 * Request Body (CreateEmployeeDTO):
 * {
 *   first_name: string,          // Required, max 100 chars
 *   last_name: string,           // Required, max 100 chars
 *   email: string,               // Required, unique, valid email
 *   phone?: string,              // Optional, max 20 chars
 *   hire_date: string,           // Required, ISO format YYYY-MM-DD
 *   role_id: number,             // Required, must exist in roles table
 *   assigned_terminal_id?: string, // Optional, UUID format
 *   user_id?: string             // Optional, UUID format
 * }
 *
 * Response (201 Created):
 * {
 *   success: true,
 *   data: {
 *     id: 1,
 *     employee_number: "EMP-000001",
 *     first_name: "John",
 *     last_name: "Doe",
 *     email: "john@example.com",
 *     phone: "555-0100",
 *     hire_date: "2026-02-14",
 *     termination_date: null,
 *     role_id: 2,
 *     role_name: "cashier",
 *     assigned_terminal_id: null,
 *     is_active: true,
 *     created_at: "2026-02-14T10:00:00.000Z",
 *     updated_at: "2026-02-14T10:00:00.000Z"
 *   },
 *   message: "Employee created successfully"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Validation errors (invalid email, missing required fields)
 * - 401 Unauthorized: Missing or invalid JWT token
 * - 409 Conflict: Email already exists
 * - 500 Internal Server Error: Database error
 *
 * @example
 * curl -X POST http://localhost:3000/api/v1/employees \
 *   -H "Authorization: Bearer <JWT_TOKEN>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "first_name": "John",
 *     "last_name": "Doe",
 *     "email": "john@example.com",
 *     "phone": "555-0100",
 *     "hire_date": "2026-02-14",
 *     "role_id": 2,
 *     "assigned_terminal_id": "550e8400-e29b-41d4-a716-446655440000"
 *   }'
 */
router.post('/', requirePermission('employees', 'create'), (req, res, next) => {
  employeeController.createEmployee(req, res).catch(next);
});

/**
 * @route   GET /api/v1/employees
 * @method  GET
 * @desc    Get all employees with filters and pagination
 * @access  Private (requires JWT authentication)
 * @middleware authenticateToken
 *
 * Query Parameters (all optional):
 * - role_id: number        - Filter by specific role ID
 * - is_active: boolean     - Filter by active status (true/false)
 * - search: string         - Search by name, email, or employee_number (case-insensitive)
 * - page: number           - Page number (default: 1, min: 1)
 * - limit: number          - Items per page (default: 10, min: 1, max: 100)
 *
 * Response (200 OK):
 * {
 *   success: true,
 *   data: {
 *     employees: [
 *       {
 *         id: 1,
 *         employee_number: "EMP-000001",
 *         first_name: "John",
 *         last_name: "Doe",
 *         email: "john@example.com",
 *         phone: "555-0100",
 *         hire_date: "2026-02-14",
 *         termination_date: null,
 *         role_id: 2,
 *         role_name: "cashier",
 *         assigned_terminal_id: null,
 *         is_active: true,
 *         created_at: "2026-02-14T10:00:00.000Z",
 *         updated_at: "2026-02-14T10:00:00.000Z"
 *       }
 *     ],
 *     total: 25,
 *     page: 1,
 *     limit: 10,
 *     totalPages: 3
 *   }
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Invalid query parameters (e.g., page < 1)
 * - 401 Unauthorized: Missing or invalid JWT token
 * - 500 Internal Server Error: Database error
 *
 * @example
 * curl -X GET "http://localhost:3000/api/v1/employees?role_id=2&is_active=true&search=john&page=1&limit=10" \
 *   -H "Authorization: Bearer <JWT_TOKEN>"
 */
router.get('/', requirePermission('employees', 'read'), (req, res, next) => {
  employeeController.getEmployees(req, res).catch(next);
});

/**
 * @route   GET /api/v1/employees/:id
 * @method  GET
 * @desc    Get employee by ID with role information
 * @access  Private (requires JWT authentication)
 * @middleware authenticateToken
 *
 * URL Parameters:
 * - id: number - Employee ID (required, must be positive integer)
 *
 * Response (200 OK):
 * {
 *   success: true,
 *   data: {
 *     id: 1,
 *     employee_number: "EMP-000001",
 *     first_name: "John",
 *     last_name: "Doe",
 *     email: "john@example.com",
 *     phone: "555-0100",
 *     hire_date: "2026-02-14",
 *     termination_date: null,
 *     role_id: 2,
 *     role_name: "cashier",
 *     assigned_terminal_id: null,
 *     is_active: true,
 *     created_at: "2026-02-14T10:00:00.000Z",
 *     updated_at: "2026-02-14T10:00:00.000Z"
 *   }
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Invalid ID format (not a positive integer)
 * - 401 Unauthorized: Missing or invalid JWT token
 * - 404 Not Found: Employee with specified ID does not exist
 * - 500 Internal Server Error: Database error
 *
 * @example
 * curl -X GET http://localhost:3000/api/v1/employees/1 \
 *   -H "Authorization: Bearer <JWT_TOKEN>"
 */
router.get('/:id', requirePermission('employees', 'read'), (req, res, next) => {
  (employeeController.getEmployeeById as any)(req, res).catch(next);
});

/**
 * @route   PUT /api/v1/employees/:id
 * @method  PUT
 * @desc    Update employee information
 * @access  Private (requires JWT authentication)
 * @middleware authenticateToken
 *
 * URL Parameters:
 * - id: number - Employee ID (required, must be positive integer)
 *
 * Request Body (UpdateEmployeeDTO, all fields optional):
 * {
 *   first_name?: string,           // Max 100 chars
 *   last_name?: string,            // Max 100 chars
 *   email?: string,                // Must be unique, valid email
 *   phone?: string | null,         // Max 20 chars, null to clear
 *   role_id?: number,              // Must exist in roles table
 *   assigned_terminal_id?: string | null, // UUID format, null to clear
 *   termination_date?: string | null,     // ISO format YYYY-MM-DD
 *   is_active?: boolean            // true = active, false = deactivated
 * }
 *
 * Note: employee_number and hire_date cannot be updated after creation
 *
 * Response (200 OK):
 * {
 *   success: true,
 *   data: {
 *     id: 1,
 *     employee_number: "EMP-000001",
 *     first_name: "John",
 *     last_name: "Doe",
 *     email: "john.updated@example.com",
 *     phone: "555-0199",
 *     hire_date: "2026-02-14",
 *     termination_date: null,
 *     role_id: 3,
 *     role_name: "manager",
 *     assigned_terminal_id: "550e8400-e29b-41d4-a716-446655440000",
 *     is_active: true,
 *     created_at: "2026-02-14T10:00:00.000Z",
 *     updated_at: "2026-02-14T15:30:00.000Z"
 *   },
 *   message: "Employee updated successfully"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Validation errors (invalid email, invalid UUID)
 * - 401 Unauthorized: Missing or invalid JWT token
 * - 404 Not Found: Employee with specified ID does not exist
 * - 409 Conflict: Email already exists for another employee
 * - 500 Internal Server Error: Database error
 *
 * @example
 * curl -X PUT http://localhost:3000/api/v1/employees/1 \
 *   -H "Authorization: Bearer <JWT_TOKEN>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "phone": "555-0199",
 *     "role_id": 3,
 *     "assigned_terminal_id": "550e8400-e29b-41d4-a716-446655440000"
 *   }'
 */
router.put('/:id', requirePermission('employees', 'update'), (req, res, next) => {
  (employeeController.updateEmployee as any)(req, res).catch(next);
});

/**
 * @route   DELETE /api/v1/employees/:id
 * @method  DELETE
 * @desc    Deactivate employee (soft delete)
 * @access  Private (requires JWT authentication)
 * @middleware authenticateToken
 *
 * URL Parameters:
 * - id: number - Employee ID (required, must be positive integer)
 *
 * Note: This is a soft delete operation. The employee record is not removed from
 * the database but is marked as inactive (is_active = false). The employee can
 * be reactivated later by updating is_active to true via PUT endpoint.
 *
 * Response (200 OK):
 * {
 *   success: true,
 *   data: {
 *     id: 1,
 *     employee_number: "EMP-000001",
 *     first_name: "John",
 *     last_name: "Doe",
 *     email: "john@example.com",
 *     phone: "555-0100",
 *     hire_date: "2026-02-14",
 *     termination_date: null,
 *     role_id: 2,
 *     role_name: "cashier",
 *     assigned_terminal_id: null,
 *     is_active: false,
 *     created_at: "2026-02-14T10:00:00.000Z",
 *     updated_at: "2026-02-14T16:00:00.000Z"
 *   },
 *   message: "Employee deactivated successfully"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Invalid ID format (not a positive integer)
 * - 401 Unauthorized: Missing or invalid JWT token
 * - 404 Not Found: Employee with specified ID does not exist
 * - 500 Internal Server Error: Database error
 *
 * @example
 * curl -X DELETE http://localhost:3000/api/v1/employees/1 \
 *   -H "Authorization: Bearer <JWT_TOKEN>"
 */
router.delete('/:id', requirePermission('employees', 'delete'), (req, res, next) => {
  (employeeController.deactivateEmployee as any)(req, res).catch(next);
});

export default router;
