/**
 * Category API Integration Tests
 */

import request from 'supertest';
import { createApp } from '../../app';
import { pool } from '../../config/database';

jest.mock('../../utils/logger');

describe('Category API Integration Tests', () => {
  let app: any;
  let authToken: string;
  let createdCategoryId: string;

  beforeAll(async () => {
    app = createApp();
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    // Cleanup: delete test categories
    if (createdCategoryId) {
      await pool.query('DELETE FROM categories WHERE id = $1', [createdCategoryId]);
    }
    await pool.end();
  });

  describe('POST /api/v1/categories', () => {
    it('should create category with full details', async () => {
      const response = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Electronics',
          description: 'Test electronic devices',
          display_order: 1,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('category_number');
      expect(response.body.data.name).toBe('Test Electronics');
      expect(response.body.data.description).toBe('Test electronic devices');

      createdCategoryId = response.body.data.id;
    });

    it('should create category with only required fields', async () => {
      const response = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Category Minimal',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Category Minimal');

      // Cleanup
      await pool.query('DELETE FROM categories WHERE id = $1', [response.body.data.id]);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Missing name field',
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/v1/categories')
        .send({
          name: 'Unauthorized Test',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/categories', () => {
    it('should return list of categories', async () => {
      const response = await request(app)
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by active status', async () => {
      const response = await request(app)
        .get('/api/v1/categories?active_only=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/categories/:id', () => {
    it('should return category by ID', async () => {
      if (!createdCategoryId) {
        const createResponse = await request(app)
          .post('/api/v1/categories')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Test Category for Get' });

        createdCategoryId = createResponse.body.data.id;
      }

      const response = await request(app)
        .get(`/api/v1/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdCategoryId);
    });

    it('should return 404 if category not found', async () => {
      const response = await request(app)
        .get('/api/v1/categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/categories/:id', () => {
    it('should update category details', async () => {
      if (!createdCategoryId) {
        const createResponse = await request(app)
          .post('/api/v1/categories')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Test Category for Update' });

        createdCategoryId = createResponse.body.data.id;
      }

      const response = await request(app)
        .put(`/api/v1/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Test Category',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Test Category');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should return 404 if category not found', async () => {
      const response = await request(app)
        .put('/api/v1/categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Non-existent Category',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    it('should soft delete category', async () => {
      // Create a category to delete
      const createResponse = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Category to Delete' });

      const categoryId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify category is soft deleted
      const checkResponse = await pool.query(
        'SELECT is_active FROM categories WHERE id = $1',
        [categoryId]
      );
      expect(checkResponse.rows[0].is_active).toBe(false);

      // Cleanup
      await pool.query('DELETE FROM categories WHERE id = $1', [categoryId]);
    });

    it('should return 404 if category not found', async () => {
      const response = await request(app)
        .delete('/api/v1/categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
