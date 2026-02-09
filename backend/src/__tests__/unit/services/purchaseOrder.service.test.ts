/**
 * Purchase Order Service Tests
 *
 * Comprehensive tests for all PO service methods:
 * - CRUD operations (create, read, update, delete)
 * - Status workflow (submit, approve, receive, cancel, close)
 * - Reorder suggestions
 */

import * as POService from '../../../services/purchaseOrder.service';
import { pool } from '../../../config/database';
import {
  CreatePORequest,
  UpdatePORequest,
  ReceiveItemsRequest,
  POListQuery,
} from '../../../types/purchaseOrder.types';

jest.mock('../../../config/database');
jest.mock('../../../utils/logger');

describe('PurchaseOrderService', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations to ensure clean state
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    (pool.query as jest.Mock).mockClear();
  });

  describe('createPO', () => {
    const userId = 'user-123';
    const vendorId = 'vendor-123';
    const productId = 'product-123';

    const validCreateData: CreatePORequest = {
      vendor_id: vendorId,
      order_type: 'purchase',
      expected_delivery_date: '2026-02-15',
      items: [
        {
          product_id: productId,
          quantity_ordered: 100,
          unit_cost: 10.0,
          tax_amount: 1.0,
        },
      ],
      shipping_cost: 50,
      discount_amount: 0,
      notes: 'Test PO',
    };

    it('should create a PO successfully with valid data', async () => {
      const mockVendor = {
        id: vendorId,
        business_name: 'Test Vendor',
        contact_person: 'John Doe',
      };

      const mockProduct = {
        id: productId,
        sku: 'SKU-001',
        name: 'Test Product',
        base_price: '10.00',
      };

      const mockPO = {
        id: 'po-123',
        po_number: 'PO-20260208-0001',
        vendor_id: vendorId,
        vendor_name: 'Test Vendor',
        order_type: 'purchase',
        status: 'draft',
        order_date: new Date(),
        subtotal: '1000.00',
        tax_amount: '100.00',
        total_amount: '1150.00',
        created_by: userId,
      };

      const mockItem = {
        id: 'item-123',
        purchase_order_id: 'po-123',
        product_id: productId,
        sku: 'SKU-001',
        product_name: 'Test Product',
        quantity_ordered: 100,
        quantity_received: 0,
        unit_cost: '10.00',
        line_total: '1010.00',
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockVendor], rowCount: 1 }) // Vendor check
        .mockResolvedValueOnce({ rows: [mockProduct], rowCount: 1 }) // Products check
        .mockResolvedValueOnce({ rows: [mockPO], rowCount: 1 }) // Insert PO
        .mockResolvedValueOnce({ rows: [mockItem], rowCount: 1 }) // Insert item
        .mockResolvedValueOnce(undefined) // COMMIT
        // Mocks for getPOById call at the end (same mockClient, new connection)
        .mockResolvedValueOnce({ rows: [mockPO], rowCount: 1 }) // PO query
        .mockResolvedValueOnce({ rows: [mockItem], rowCount: 1 }); // Items query

      const result = await POService.createPO(userId, validCreateData);

      expect(result).toMatchObject({
        id: 'po-123',
        vendor_id: vendorId,
        status: 'draft',
      });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if vendor not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rowCount: 0 }) // BEGIN (returns undefined but needs to be a proper result)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Vendor check fails
        .mockResolvedValueOnce({ rowCount: 0 }); // ROLLBACK

      await expect(POService.createPO(userId, validCreateData)).rejects.toThrow(
        'Vendor not found or inactive'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if no line items provided', async () => {
      const invalidData = {
        ...validCreateData,
        items: [],
      };

      const mockVendor = {
        id: vendorId,
        business_name: 'Test Vendor',
        contact_person: 'John Doe',
      };

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockVendor], rowCount: 1 }) // Vendor check passes
        .mockResolvedValueOnce({ rowCount: 0 }); // ROLLBACK

      await expect(POService.createPO(userId, invalidData)).rejects.toThrow(
        'At least one line item is required'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error if product not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: vendorId }], rowCount: 1 }) // Vendor check
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Products check fails

      await expect(POService.createPO(userId, validCreateData)).rejects.toThrow(
        'One or more products not found'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should calculate totals correctly with multiple items', async () => {
      const multiItemData: CreatePORequest = {
        ...validCreateData,
        items: [
          {
            product_id: 'product-1',
            quantity_ordered: 50,
            unit_cost: 10.0,
            tax_amount: 5.0,
          },
          {
            product_id: 'product-2',
            quantity_ordered: 30,
            unit_cost: 20.0,
            tax_amount: 6.0,
          },
        ],
        shipping_cost: 100,
        other_charges: 50,
        discount_amount: 50,
      };

      const mockPO = {
        id: 'po-123',
        subtotal: '1100.00',
        total_amount: '1211.00',
        vendor_name: 'Test Vendor',
        items: [{ id: 'item-1' }, { id: 'item-2' }],
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: vendorId }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            { id: 'product-1', sku: 'SKU-1', name: 'P1', base_price: '10' },
            { id: 'product-2', sku: 'SKU-2', name: 'P2', base_price: '20' },
          ],
          rowCount: 2,
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'po-123', subtotal: '1100.00', total_amount: '1211.00' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ id: 'item-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'item-2' }], rowCount: 1 })
        .mockResolvedValueOnce(undefined) // COMMIT
        // Mocks for getPOById call at the end
        .mockResolvedValueOnce({ rows: [mockPO], rowCount: 1 })
        .mockResolvedValueOnce({ rows: mockPO.items, rowCount: 2 });

      const result = await POService.createPO(userId, multiItemData);

      // Verify subtotal = (50*10) + (30*20) = 1100
      // Total = 1100 + 11 (tax) + 100 (shipping) + 50 (other) - 50 (discount) = 1211
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO purchase_orders'),
        expect.arrayContaining([1100, 11, 100, 50, 50, 1211])
      );
    });
  });

  describe('getPOById', () => {
    const poId = 'po-123';

    it('should return PO with items and vendor details', async () => {
      const mockPO = {
        id: poId,
        po_number: 'PO-20260208-0001',
        vendor_id: 'vendor-123',
        vendor_name: 'Test Vendor',
        status: 'draft',
        total_amount: '1000.00',
        created_by: 'user-123',
        created_by_name: 'Admin User',
      };

      const mockItems = [
        {
          id: 'item-1',
          product_id: 'product-1',
          product_name: 'Product 1',
          quantity_ordered: 50,
          quantity_received: 0,
          unit_cost: '10.00',
        },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockPO], rowCount: 1 }) // PO query
        .mockResolvedValueOnce({ rows: mockItems, rowCount: 1 }); // Items query

      const result = await POService.getPOById(poId);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(poId);
      expect(result!.po_number).toBe('PO-20260208-0001');
      expect(result!.vendor_name).toBe('Test Vendor');
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].product_name).toBe('Product 1');
    });

    it('should return null if PO not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await POService.getPOById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getPOs', () => {
    it('should return paginated list of POs', async () => {
      const query: POListQuery = {
        page: 1,
        limit: 10,
      };

      const mockPOs = [
        {
          id: 'po-1',
          po_number: 'PO-20260208-0001',
          vendor_name: 'Vendor A',
          status: 'draft',
          total_amount: '1000.00',
          item_count: '3',
        },
      ];

      const mockItems = [
        { id: 'item-1', product_name: 'Product 1' },
      ];

      // getPOs uses pool.query directly
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 }) // Count query
        .mockResolvedValueOnce({ rows: mockPOs, rowCount: 1 }) // List query
        .mockResolvedValueOnce({ rows: mockItems, rowCount: 1 }); // Items query for po-1

      const result = await POService.getPOs(query);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should filter by vendor_id', async () => {
      const query: POListQuery = {
        page: 1,
        limit: 10,
        vendor_id: 'vendor-123',
      };

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '5' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await POService.getPOs(query);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1 AND po.vendor_id = $'),
        expect.arrayContaining(['vendor-123'])
      );
    });

    it('should filter by status', async () => {
      const query: POListQuery = {
        page: 1,
        limit: 10,
        status: 'approved',
      };

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '3' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await POService.getPOs(query);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND po.status = $'),
        expect.arrayContaining(['approved'])
      );
    });

    it('should search by PO number', async () => {
      const query: POListQuery = {
        page: 1,
        limit: 10,
        search: 'PO-2026',
      };

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await POService.getPOs(query);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('po.po_number ILIKE $'),
        expect.arrayContaining(['%PO-2026%'])
      );
    });
  });

  describe('updatePO', () => {
    const poId = 'po-123';

    it('should update draft PO successfully', async () => {
      const updateData: UpdatePORequest = {
        expected_delivery_date: '2026-03-01',
        notes: 'Updated notes',
      };

      const mockCurrentPO = {
        id: poId,
        status: 'draft',
        vendor_id: 'vendor-123',
      };

      const mockUpdatedPO = {
        ...mockCurrentPO,
        expected_delivery_date: '2026-03-01',
        notes: 'Updated notes',
        vendor_name: 'Test Vendor',
        items: [],
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCurrentPO], rowCount: 1 }) // Get current PO
        .mockResolvedValueOnce({ rows: [mockUpdatedPO], rowCount: 1 }) // Update PO
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Get items (none to update)
        .mockResolvedValueOnce(undefined) // COMMIT
        // Mocks for getPOById call at the end
        .mockResolvedValueOnce({ rows: [mockUpdatedPO], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await POService.updatePO(poId, updateData);

      expect(result.notes).toBe('Updated notes');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error if PO not in draft status', async () => {
      const updateData: UpdatePORequest = {
        notes: 'Cannot update',
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: poId, status: 'approved' }],
          rowCount: 1,
        });

      await expect(POService.updatePO(poId, updateData)).rejects.toThrow(
        'Only draft purchase orders can be updated'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error if PO not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(POService.updatePO('non-existent', {})).rejects.toThrow(
        'Purchase order not found'
      );
    });
  });

  describe('deletePO', () => {
    const poId = 'po-123';

    it('should delete draft PO successfully', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: poId, status: 'draft' }],
        rowCount: 1,
      });

      mockClient.query.mockResolvedValueOnce({ rowCount: 1 }); // DELETE query

      await POService.deletePO(poId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM purchase_orders'),
        [poId]
      );
    });

    it('should throw error if PO not in draft status', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: poId, status: 'approved' }],
        rowCount: 1,
      });

      await expect(POService.deletePO(poId)).rejects.toThrow(
        'Only draft purchase orders can be deleted'
      );
    });

    it('should throw error if PO not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(POService.deletePO('non-existent')).rejects.toThrow(
        'Purchase order not found'
      );
    });
  });

  describe('submitPO', () => {
    const poId = 'po-123';

    it('should submit draft PO successfully', async () => {
      const mockSubmittedPO = {
        id: poId,
        status: 'submitted',
        vendor_name: 'Test Vendor',
        items: [],
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: poId, status: 'draft' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 }) // COUNT items query
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE query
        // Mocks for getPOById call at the end
        .mockResolvedValueOnce({ rows: [mockSubmittedPO], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await POService.submitPO(poId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'submitted'"),
        [poId]
      );
    });

    it('should throw error if PO has no items', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: poId, status: 'draft' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 }); // COUNT items query returns 0

      await expect(POService.submitPO(poId)).rejects.toThrow(
        'Cannot submit purchase order without line items'
      );
    });

    it('should throw error if PO not in draft status', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: poId, status: 'submitted' }],
        rowCount: 1,
      });

      await expect(POService.submitPO(poId)).rejects.toThrow(
        'Only draft purchase orders can be submitted'
      );
    });
  });

  describe('approvePO', () => {
    const poId = 'po-123';
    const userId = 'user-123';

    it('should approve submitted PO successfully', async () => {
      const mockApprovedPO = {
        id: poId,
        status: 'approved',
        approved_by: userId,
        vendor_name: 'Test Vendor',
        items: [],
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: poId, status: 'submitted' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE query
        // Mocks for getPOById call at the end
        .mockResolvedValueOnce({ rows: [mockApprovedPO], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await POService.approvePO(poId, userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'approved'"),
        expect.arrayContaining([userId, poId])
      );
    });

    it('should throw error if PO not in submitted status', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: poId, status: 'draft' }],
        rowCount: 1,
      });

      await expect(POService.approvePO(poId, userId)).rejects.toThrow(
        'Only submitted purchase orders can be approved'
      );
    });
  });

  describe('receiveItems', () => {
    const poId = 'po-123';
    const userId = 'user-123';

    it('should receive items successfully', async () => {
      const receiveData: ReceiveItemsRequest = {
        items: [
          {
            item_id: 'item-1',
            quantity_received: 50,
            notes: 'Received partial shipment',
          },
        ],
      };

      const mockReceivedPO = {
        id: poId,
        status: 'partially_received',
        vendor_name: 'Test Vendor',
        items: [{ id: 'item-1', quantity_received: 50 }],
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: poId, status: 'approved' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'item-1',
              quantity_ordered: 100,
              quantity_received: 0,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // Update item
        .mockResolvedValueOnce(undefined) // COMMIT
        // Mocks for getPOById call at the end
        .mockResolvedValueOnce({ rows: [mockReceivedPO], rowCount: 1 })
        .mockResolvedValueOnce({ rows: mockReceivedPO.items, rowCount: 1 });

      await POService.receiveItems(poId, receiveData, userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE purchase_order_items'),
        expect.arrayContaining([50])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error if receiving more than ordered', async () => {
      const receiveData: ReceiveItemsRequest = {
        items: [
          {
            item_id: 'item-1',
            quantity_received: 150, // More than ordered
          },
        ],
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: poId, status: 'approved' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'item-1',
              quantity_ordered: 100,
              quantity_received: 0,
            },
          ],
          rowCount: 1,
        });

      await expect(POService.receiveItems(poId, receiveData, userId)).rejects.toThrow(
        'Cannot receive more than ordered quantity'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error if PO not in receivable status', async () => {
      const receiveData: ReceiveItemsRequest = {
        items: [
          {
            item_id: 'item-1',
            quantity_received: 50,
          },
        ],
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: poId, status: 'draft' }],
          rowCount: 1,
        });

      await expect(POService.receiveItems(poId, receiveData, userId)).rejects.toThrow(
        'Can only receive items for approved or partially received purchase orders'
      );
    });
  });

  describe('cancelPO', () => {
    const poId = 'po-123';

    it('should cancel PO successfully', async () => {
      const mockCancelledPO = {
        id: poId,
        status: 'cancelled',
        vendor_name: 'Test Vendor',
        items: [],
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: poId, status: 'draft' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE query
        // Mocks for getPOById call at the end
        .mockResolvedValueOnce({ rows: [mockCancelledPO], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await POService.cancelPO(poId, 'Vendor unavailable');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'cancelled'"),
        expect.any(Array)
      );
    });

    it('should throw error if PO already closed', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: poId, status: 'closed' }],
        rowCount: 1,
      });

      await expect(POService.cancelPO(poId, 'Test')).rejects.toThrow(
        'Cannot cancel closed or already cancelled purchase order'
      );
    });
  });

  describe('closePO', () => {
    const poId = 'po-123';

    it('should close fully received PO successfully', async () => {
      const mockClosedPO = {
        id: poId,
        status: 'closed',
        vendor_name: 'Test Vendor',
        items: [],
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: poId, status: 'received' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE query
        // Mocks for getPOById call at the end
        .mockResolvedValueOnce({ rows: [mockClosedPO], rowCount: 1 }) // PO query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Items query

      await POService.closePO(poId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'closed'"),
        [poId]
      );
    });

    it('should throw error if PO not fully received', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: poId, status: 'partially_received' }],
        rowCount: 1,
      });

      await expect(POService.closePO(poId)).rejects.toThrow(
        'Only fully received purchase orders can be closed'
      );
    });
  });

  describe('getReorderSuggestions', () => {
    it('should return products grouped by vendor', async () => {
      const mockProducts = [
        {
          vendor_id: 'vendor-1',
          vendor_name: 'Vendor A',
          product_id: 'product-1',
          sku: 'SKU-001',
          product_name: 'Product 1',
          quantity_in_stock: 5,
          reorder_level: 10,
          reorder_quantity: 50,
          base_price: '10.00',
        },
        {
          vendor_id: 'vendor-1',
          vendor_name: 'Vendor A',
          product_id: 'product-2',
          sku: 'SKU-002',
          product_name: 'Product 2',
          quantity_in_stock: 3,
          reorder_level: 10,
          reorder_quantity: 30,
          base_price: '15.00',
        },
      ];

      // getReorderSuggestions uses pool.query directly, not client
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockProducts, rowCount: 2 });

      const result = await POService.getReorderSuggestions();

      expect(result).toHaveLength(1); // One vendor group
      expect(result[0].vendor_id).toBe('vendor-1');
      expect(result[0].products).toHaveLength(2);
      expect(result[0].products[0].product_name).toBe('Product 1');
    });

    it('should return empty array if no low stock products', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await POService.getReorderSuggestions();

      expect(result).toEqual([]);
    });
  });
});
