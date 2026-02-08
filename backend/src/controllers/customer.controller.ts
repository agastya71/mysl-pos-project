import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { customerService } from '../services/customer.service';
import { AppError } from '../middleware/error.middleware';

// Validation schemas
const createCustomerSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  address_line1: z.string().max(255).optional().or(z.literal('')),
  address_line2: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(50).optional().or(z.literal('')),
  postal_code: z.string().max(20).optional().or(z.literal('')),
  country: z.string().max(50).optional().or(z.literal('')),
});

const updateCustomerSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  address_line1: z.string().max(255).optional().or(z.literal('')),
  address_line2: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(50).optional().or(z.literal('')),
  postal_code: z.string().max(20).optional().or(z.literal('')),
  country: z.string().max(50).optional().or(z.literal('')),
  is_active: z.boolean().optional(),
});

const customerListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(),
  is_active: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
});

const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export class CustomerController {
  /**
   * GET /api/customers
   * Get paginated list of customers
   */
  async getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = customerListQuerySchema.parse(req.query);
      const result = await customerService.getCustomers(query);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError('Invalid query parameters', 400, error.errors));
      } else {
        next(error);
      }
    }
  }

  /**
   * GET /api/customers/:id
   * Get customer by ID
   */
  async getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const customer = await customerService.getCustomerById(id);

      res.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/customers
   * Create new customer
   */
  async createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createCustomerSchema.parse(req.body);

      // Convert empty strings to undefined for optional fields
      const cleanInput = {
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email && input.email !== '' ? input.email : undefined,
        phone: input.phone && input.phone !== '' ? input.phone : undefined,
        address_line1: input.address_line1 && input.address_line1 !== '' ? input.address_line1 : undefined,
        address_line2: input.address_line2 && input.address_line2 !== '' ? input.address_line2 : undefined,
        city: input.city && input.city !== '' ? input.city : undefined,
        state: input.state && input.state !== '' ? input.state : undefined,
        postal_code: input.postal_code && input.postal_code !== '' ? input.postal_code : undefined,
        country: input.country && input.country !== '' ? input.country : undefined,
      };

      const customer = await customerService.createCustomer(cleanInput);

      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer created successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError('Invalid customer data', 400, error.errors));
      } else {
        next(error);
      }
    }
  }

  /**
   * PUT /api/customers/:id
   * Update customer
   */
  async updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = updateCustomerSchema.parse(req.body);

      // Convert empty strings to undefined for optional fields
      const cleanInput: any = {};
      if (input.first_name !== undefined) cleanInput.first_name = input.first_name;
      if (input.last_name !== undefined) cleanInput.last_name = input.last_name;
      if (input.email !== undefined) cleanInput.email = input.email === '' ? null : input.email;
      if (input.phone !== undefined) cleanInput.phone = input.phone === '' ? null : input.phone;
      if (input.address_line1 !== undefined) cleanInput.address_line1 = input.address_line1 === '' ? null : input.address_line1;
      if (input.address_line2 !== undefined) cleanInput.address_line2 = input.address_line2 === '' ? null : input.address_line2;
      if (input.city !== undefined) cleanInput.city = input.city === '' ? null : input.city;
      if (input.state !== undefined) cleanInput.state = input.state === '' ? null : input.state;
      if (input.postal_code !== undefined) cleanInput.postal_code = input.postal_code === '' ? null : input.postal_code;
      if (input.country !== undefined) cleanInput.country = input.country === '' ? null : input.country;
      if (input.is_active !== undefined) cleanInput.is_active = input.is_active;

      const customer = await customerService.updateCustomer(id, cleanInput);

      res.json({
        success: true,
        data: customer,
        message: 'Customer updated successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError('Invalid customer data', 400, error.errors));
      } else {
        next(error);
      }
    }
  }

  /**
   * DELETE /api/customers/:id
   * Soft delete customer
   */
  async deleteCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await customerService.deleteCustomer(id);

      res.json({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/customers/search
   * Quick search for customer selector
   */
  async searchCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, limit } = searchQuerySchema.parse(req.query);
      const results = await customerService.searchCustomers(q, limit);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError('Invalid search query', 400, error.errors));
      } else {
        next(error);
      }
    }
  }
}

export const customerController = new CustomerController();
