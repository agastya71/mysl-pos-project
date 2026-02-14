import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const employeeController = new EmployeeController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/v1/employees
 * @desc    Create a new employee
 * @access  Private (requires authentication)
 */
router.post('/', (req, res, next) => {
  employeeController.createEmployee(req, res).catch(next);
});

/**
 * @route   GET /api/v1/employees
 * @desc    Get all employees with filters and pagination
 * @query   role_id, is_active, search, page, limit
 * @access  Private
 */
router.get('/', (req, res, next) => {
  employeeController.getEmployees(req, res).catch(next);
});

/**
 * @route   GET /api/v1/employees/:id
 * @desc    Get employee by ID
 * @access  Private
 */
router.get('/:id', (req, res, next) => {
  employeeController.getEmployeeById(req, res).catch(next);
});

/**
 * @route   PUT /api/v1/employees/:id
 * @desc    Update employee
 * @access  Private
 */
router.put('/:id', (req, res, next) => {
  employeeController.updateEmployee(req, res).catch(next);
});

/**
 * @route   DELETE /api/v1/employees/:id
 * @desc    Deactivate employee (soft delete)
 * @access  Private
 */
router.delete('/:id', (req, res, next) => {
  employeeController.deactivateEmployee(req, res).catch(next);
});

export default router;
