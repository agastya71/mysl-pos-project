# API Endpoints Specification

**Part of:** [POS System Architecture](../ARCHITECTURE.md)
**Version:** 2.0
**Last Updated:** 2026-01-13

## Overview

This document provides complete REST API specifications for the POS system. All endpoints follow RESTful conventions and return JSON responses unless otherwise specified.

**Base URL:** `https://api.yourpos.com/api/v1`

**Authentication:** All endpoints except `/auth/*` require Bearer token authentication.

---

## Table of Contents

- [Authentication](#authentication-endpoints)
- [Products](#product-endpoints)
- [Vendors & Suppliers](#vendorsupplier-endpoints)
- [Purchase Orders](#purchase-order-endpoints)
- [Inventory Receiving](#inventory-receiving-endpoints)
- [Donations](#donation-endpoints)
- [Accounts Payable](#accounts-payable-endpoints)
- [Vendor Payments](#vendor-payment-endpoints)
- [Bulk Import](#bulk-import-endpoints)
- [Inventory Counts](#inventory-count-endpoints)
- [Inventory Reconciliation](#inventory-reconciliation-endpoints)
- [Inventory Analysis](#inventory-analysis-endpoints)
- [Transactions](#transaction-endpoints)
- [Payments](#payment-endpoints)
- [Sync](#sync-endpoints)
- [Admin](#admin-endpoints)

---

## General Conventions

### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
X-Terminal-ID: <terminal_uuid> (for POS operations)
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### Common HTTP Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate SKU)
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

### Pagination

List endpoints support pagination:

```
?page=1&limit=50&sortBy=created_at&sortOrder=desc
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "pages": 5
  }
}
```

### Date Formats

All dates use ISO 8601 format:
- Timestamps: `2026-01-13T14:30:00Z`
- Dates: `2026-01-13`

---

## Authentication Endpoints

### Login

```http
POST /api/v1/auth/login
```

**Request:**
```json
{
  "username": "string",
  "password": "string",
  "terminalId": "uuid" (optional)
}
```

**Response:**
```json
{
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "cashier|manager|admin"
  },
  "permissions": ["permission1", "permission2"],
  "expiresIn": 900
}
```

### Refresh Token

```http
POST /api/v1/auth/refresh
```

**Request:**
```json
{
  "refreshToken": "string"
}
```

**Response:**
```json
{
  "token": "new_jwt_access_token",
  "refreshToken": "new_refresh_token",
  "expiresIn": 900
}
```

### Logout

```http
POST /api/v1/auth/logout
```

**Request:**
```json
{
  "token": "string"
}
```

**Response:**
```json
{
  "success": true
}
```

### Verify Token

```http
POST /api/v1/auth/verify
```

**Request:**
```json
{
  "token": "string"
}
```

**Response:**
```json
{
  "valid": true,
  "user": { ... }
}
```

---

## Product Endpoints

### List Products

```http
GET /api/v1/products
```

**Query Parameters:**
- `page` (integer) - Page number (default: 1)
- `limit` (integer) - Items per page (default: 50, max: 100)
- `category` (uuid) - Filter by category ID
- `search` (string) - Search by name, SKU, or barcode
- `isActive` (boolean) - Filter active/inactive products
- `vendorId` (uuid) - Filter by vendor
- `lowStock` (boolean) - Show only low stock items

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "sku": "string",
      "barcode": "string",
      "name": "string",
      "description": "string",
      "categoryId": "uuid",
      "category": { "name": "string" },
      "basePrice": 29.99,
      "costPrice": 15.00,
      "taxRate": 7.5,
      "quantityInStock": 100,
      "reorderLevel": 10,
      "vendorId": "uuid",
      "vendor": { "name": "string" },
      "imageUrl": "string",
      "isActive": true,
      "createdAt": "2026-01-13T14:30:00Z",
      "updatedAt": "2026-01-13T14:30:00Z"
    }
  ],
  "total": 250,
  "page": 1,
  "pages": 5
}
```

### Get Product by ID

```http
GET /api/v1/products/:id
```

**Response:**
```json
{
  "product": {
    "id": "uuid",
    "sku": "PROD-001",
    "barcode": "012345678905",
    "name": "Product Name",
    "description": "Product description",
    "categoryId": "uuid",
    "category": {
      "id": "uuid",
      "name": "Electronics",
      "parentCategory": "Technology"
    },
    "basePrice": 29.99,
    "costPrice": 15.00,
    "taxRate": 7.5,
    "quantityInStock": 100,
    "reorderLevel": 10,
    "reorderQuantity": 50,
    "vendorId": "uuid",
    "vendor": {
      "id": "uuid",
      "businessName": "ABC Supplies",
      "vendorNumber": "VEND-001"
    },
    "imageUrl": "https://...",
    "isActive": true,
    "createdAt": "2026-01-13T14:30:00Z",
    "updatedAt": "2026-01-13T14:30:00Z"
  }
}
```

### Get Product by Barcode

```http
GET /api/v1/products/barcode/:barcode
```

**Response:** Same as Get Product by ID

### Get Product by SKU

```http
GET /api/v1/products/sku/:sku
```

**Response:** Same as Get Product by ID

### Create Product

```http
POST /api/v1/products
```

**Request:**
```json
{
  "sku": "PROD-002",
  "barcode": "012345678906",
  "name": "New Product",
  "description": "Product description",
  "categoryId": "uuid",
  "basePrice": 39.99,
  "costPrice": 20.00,
  "taxRate": 7.5,
  "quantityInStock": 50,
  "reorderLevel": 10,
  "reorderQuantity": 25,
  "vendorId": "uuid",
  "imageUrl": "https://...",
  "isActive": true
}
```

**Response:**
```json
{
  "product": { ... }
}
```

### Update Product

```http
PUT /api/v1/products/:id
```

**Request:** Same as Create Product (all fields optional)

**Response:**
```json
{
  "product": { ... }
}
```

### Delete Product

```http
DELETE /api/v1/products/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

### Bulk Import Products

```http
POST /api/v1/products/bulk-import
```

**Request:** multipart/form-data
```
file: CSV file
```

**Response:**
```json
{
  "imported": 145,
  "failed": 5,
  "errors": [
    {
      "row": 3,
      "sku": "PROD-003",
      "error": "Duplicate SKU"
    }
  ]
}
```

---

## Vendor/Supplier Endpoints

### List Vendors

```http
GET /api/v1/vendors
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `type` - Filter by vendor type (supplier, consignment, individual_donor, corporate_donor, thrift_partner)
- `isActive` (boolean) - Active/inactive filter
- `isDonor` (boolean) - Filter donors only
- `search` - Search by name, email, phone

**Response:**
```json
{
  "vendors": [
    {
      "id": "uuid",
      "vendorNumber": "VEND-001",
      "vendorType": "supplier",
      "businessName": "ABC Supplies Inc",
      "contactPerson": "John Doe",
      "email": "john@abc.com",
      "phone": "555-1234",
      "isDonor": false,
      "currentBalance": 5000.00,
      "isActive": true,
      "createdAt": "2026-01-13T14:30:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "pages": 1
}
```

### Get Vendor by ID

```http
GET /api/v1/vendors/:id
```

**Response:**
```json
{
  "vendor": {
    "id": "uuid",
    "vendorNumber": "VEND-001",
    "vendorType": "supplier",
    "businessName": "ABC Supplies Inc",
    "contactPerson": "John Doe",
    "email": "john@abc.com",
    "phone": "555-1234",
    "alternatePhone": "555-5678",
    "addressLine1": "123 Main St",
    "addressLine2": "Suite 100",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62701",
    "country": "USA",
    "taxId": "12-3456789",
    "paymentTerms": "net_30",
    "paymentMethod": "check",
    "isDonor": false,
    "donorCategory": null,
    "totalDonatedValue": 0,
    "totalDonatedItems": 0,
    "creditLimit": 10000.00,
    "currentBalance": 5000.00,
    "preferredVendor": true,
    "vendorRating": 4,
    "isActive": true,
    "createdAt": "2026-01-13T14:30:00Z",
    "updatedAt": "2026-01-13T14:30:00Z"
  },
  "statistics": {
    "totalPurchaseOrders": 25,
    "totalPurchased": 50000.00,
    "totalReceived": 48000.00,
    "totalPaid": 45000.00,
    "openInvoices": 3,
    "overdueAmount": 1500.00
  }
}
```

### Get Vendor Products

```http
GET /api/v1/vendors/:id/products
```

**Response:**
```json
{
  "products": [...],
  "total": 45
}
```

### Get Vendor Purchase Orders

```http
GET /api/v1/vendors/:id/purchase-orders
```

**Query Parameters:**
- `status` - Filter by PO status
- `startDate`, `endDate` - Date range filter

**Response:**
```json
{
  "purchaseOrders": [...],
  "total": 15
}
```

### Get Vendor Balance

```http
GET /api/v1/vendors/:id/balance
```

**Response:**
```json
{
  "currentBalance": 5000.00,
  "unpaidInvoices": [
    {
      "apNumber": "AP-2024-001",
      "invoiceNumber": "INV-12345",
      "invoiceDate": "2026-01-01",
      "dueDate": "2026-01-31",
      "amountDue": 2500.00,
      "isOverdue": false
    }
  ],
  "overdueAmount": 0.00,
  "nextPaymentDue": "2026-01-31"
}
```

### Create Vendor

```http
POST /api/v1/vendors
```

**Request:**
```json
{
  "vendorType": "supplier",
  "businessName": "New Vendor LLC",
  "contactPerson": "Jane Smith",
  "email": "jane@vendor.com",
  "phone": "555-9999",
  "addressLine1": "456 Oak Ave",
  "city": "Chicago",
  "state": "IL",
  "zipCode": "60601",
  "paymentTerms": "net_30",
  "paymentMethod": "ach",
  "creditLimit": 5000.00,
  "notes": "Preferred electronics supplier"
}
```

**Response:**
```json
{
  "vendor": { ... }
}
```

### Update Vendor

```http
PUT /api/v1/vendors/:id
```

**Request:** Same as Create (all fields optional)

### Delete Vendor

```http
DELETE /api/v1/vendors/:id
```

**Response:**
```json
{
  "success": true
}
```

---

## Purchase Order Endpoints

### List Purchase Orders

```http
GET /api/v1/purchase-orders
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `status` - Filter by status (draft, submitted, approved, partially_received, received, closed, cancelled)
- `vendorId` - Filter by vendor
- `orderType` - Filter by type (purchase, donation, consignment, transfer)
- `startDate`, `endDate` - Date range

**Response:**
```json
{
  "purchaseOrders": [
    {
      "id": "uuid",
      "poNumber": "PO-2024-001",
      "vendorId": "uuid",
      "vendor": {
        "businessName": "ABC Supplies",
        "vendorNumber": "VEND-001"
      },
      "orderType": "purchase",
      "status": "approved",
      "orderDate": "2026-01-10",
      "expectedDeliveryDate": "2026-01-20",
      "totalAmount": 5000.00,
      "paymentStatus": "unpaid",
      "createdAt": "2026-01-10T09:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "pages": 1
}
```

### Get Purchase Order by ID

```http
GET /api/v1/purchase-orders/:id
```

**Response:**
```json
{
  "purchaseOrder": {
    "id": "uuid",
    "poNumber": "PO-2024-001",
    "vendorId": "uuid",
    "vendor": { ... },
    "orderType": "purchase",
    "status": "approved",
    "orderDate": "2026-01-10",
    "expectedDeliveryDate": "2026-01-20",
    "deliveryDate": null,
    "subtotal": 4500.00,
    "taxAmount": 337.50,
    "shippingCost": 150.00,
    "otherCharges": 12.50,
    "discountAmount": 0.00,
    "totalAmount": 5000.00,
    "paymentTerms": "net_30",
    "paymentStatus": "unpaid",
    "notes": "Urgent order",
    "createdBy": "uuid",
    "approvedBy": "uuid",
    "approvedAt": "2026-01-10T10:00:00Z",
    "createdAt": "2026-01-10T09:00:00Z"
  },
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "product": {
        "name": "Product Name",
        "sku": "PROD-001"
      },
      "quantityOrdered": 100,
      "quantityReceived": 0,
      "quantityPending": 100,
      "unitCost": 45.00,
      "lineTotal": 4500.00
    }
  ],
  "receiving": []
}
```

### Create Purchase Order

```http
POST /api/v1/purchase-orders
```

**Request:**
```json
{
  "vendorId": "uuid",
  "orderType": "purchase",
  "expectedDeliveryDate": "2026-01-20",
  "items": [
    {
      "productId": "uuid",
      "quantityOrdered": 100,
      "unitCost": 45.00
    }
  ],
  "shippingCost": 150.00,
  "paymentTerms": "net_30",
  "notes": "Urgent order"
}
```

**Response:**
```json
{
  "purchaseOrder": { ... }
}
```

### Update Purchase Order

```http
PUT /api/v1/purchase-orders/:id
```

**Request:** Same as Create (all fields optional)

### Submit Purchase Order

```http
POST /api/v1/purchase-orders/:id/submit
```

**Response:**
```json
{
  "purchaseOrder": {
    "status": "submitted",
    ...
  }
}
```

### Approve Purchase Order

```http
POST /api/v1/purchase-orders/:id/approve
```

**Request:**
```json
{
  "notes": "Approved for purchasing"
}
```

**Response:**
```json
{
  "purchaseOrder": {
    "status": "approved",
    "approvedBy": "uuid",
    "approvedAt": "2026-01-13T14:30:00Z",
    ...
  }
}
```

### Cancel Purchase Order

```http
POST /api/v1/purchase-orders/:id/cancel
```

**Request:**
```json
{
  "reason": "Vendor no longer available"
}
```

**Response:**
```json
{
  "purchaseOrder": {
    "status": "cancelled",
    ...
  }
}
```

### Delete Purchase Order

```http
DELETE /api/v1/purchase-orders/:id
```

Note: Only draft POs can be deleted.

### Get Receiving History

```http
GET /api/v1/purchase-orders/:id/receiving-history
```

**Response:**
```json
{
  "receivings": [
    {
      "receivingNumber": "RCV-2024-001",
      "receivedDate": "2026-01-15",
      "totalQuantity": 50,
      "status": "completed"
    }
  ],
  "totalReceived": 50,
  "pendingQuantity": 50
}
```

---

## Inventory Receiving Endpoints

### List Receivings

```http
GET /api/v1/receiving
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `status` - Filter by status (in_progress, completed, cancelled)
- `vendorId` - Filter by vendor
- `receivingType` - Filter by type (purchase, donation, consignment, transfer, adjustment)
- `startDate`, `endDate` - Date range

**Response:**
```json
{
  "receivings": [
    {
      "id": "uuid",
      "receivingNumber": "RCV-2024-001",
      "purchaseOrderId": "uuid",
      "poNumber": "PO-2024-001",
      "vendorId": "uuid",
      "vendor": { "businessName": "ABC Supplies" },
      "receivingType": "purchase",
      "status": "completed",
      "receivedDate": "2026-01-15",
      "totalItems": 5,
      "totalQuantity": 100,
      "totalValue": 4500.00,
      "isDonation": false,
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "pages": 1
}
```

### Get Receiving by ID

```http
GET /api/v1/receiving/:id
```

**Response:**
```json
{
  "receiving": {
    "id": "uuid",
    "receivingNumber": "RCV-2024-001",
    "purchaseOrderId": "uuid",
    "purchaseOrder": { ... },
    "vendorId": "uuid",
    "vendor": { ... },
    "receivingType": "purchase",
    "status": "completed",
    "receivedDate": "2026-01-15",
    "receivedBy": "uuid",
    "totalItems": 5,
    "totalQuantity": 100,
    "totalValue": 4500.00,
    "shippingCarrier": "FedEx",
    "trackingNumber": "1234567890",
    "conditionNotes": "All items in good condition",
    "isDonation": false,
    "createdAt": "2026-01-15T10:00:00Z"
  },
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "product": { "name": "Product Name", "sku": "PROD-001" },
      "quantityReceived": 100,
      "unitCost": 45.00,
      "condition": "new",
      "lineTotal": 4500.00,
      "inventoryAdded": true
    }
  ]
}
```

### Create Receiving

```http
POST /api/v1/receiving
```

**Request:**
```json
{
  "vendorId": "uuid",
  "purchaseOrderId": "uuid",
  "receivingType": "purchase",
  "receivedDate": "2026-01-15",
  "items": [
    {
      "productId": "uuid",
      "quantityReceived": 100,
      "unitCost": 45.00,
      "condition": "new"
    }
  ],
  "shippingCarrier": "FedEx",
  "trackingNumber": "1234567890",
  "conditionNotes": "All items in good condition"
}
```

**Response:**
```json
{
  "receiving": { ... }
}
```

### Update Receiving

```http
PUT /api/v1/receiving/:id
```

### Complete Receiving

```http
POST /api/v1/receiving/:id/complete
```

**Request:**
```json
{
  "notes": "All items received and inspected",
  "addToInventory": true
}
```

**Response:**
```json
{
  "receiving": {
    "status": "completed",
    ...
  },
  "inventoryAdjustments": [
    {
      "productId": "uuid",
      "quantityChange": 100,
      "adjustmentType": "restock"
    }
  ],
  "donation": null
}
```

### Cancel Receiving

```http
POST /api/v1/receiving/:id/cancel
```

**Request:**
```json
{
  "reason": "Incorrect shipment"
}
```

### Add Receiving Item

```http
POST /api/v1/receiving/:id/items
```

**Request:**
```json
{
  "productId": "uuid",
  "quantityReceived": 50,
  "unitCost": 45.00,
  "condition": "new",
  "notes": "Additional items from vendor"
}
```

### Update Receiving Item

```http
PUT /api/v1/receiving/items/:id
```

### Delete Receiving Item

```http
DELETE /api/v1/receiving/items/:id
```

---

## Donation Endpoints

### List Donations

```http
GET /api/v1/donations
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `vendorId` - Filter by donor
- `startDate`, `endDate` - Date range
- `receiptSent` (boolean) - Filter by receipt status

**Response:**
```json
{
  "donations": [
    {
      "id": "uuid",
      "donationNumber": "DON-2024-001",
      "vendorId": "uuid",
      "donor": {
        "businessName": "John Doe",
        "donorCategory": "individual"
      },
      "donationDate": "2026-01-10",
      "donationType": "goods",
      "totalItems": 5,
      "fairMarketValue": 500.00,
      "taxReceiptSent": true,
      "taxReceiptNumber": "RCPT-2024-001",
      "createdAt": "2026-01-10T14:00:00Z"
    }
  ],
  "total": 25,
  "totalValue": 12500.00,
  "page": 1,
  "pages": 1
}
```

### Get Donation by ID

```http
GET /api/v1/donations/:id
```

**Response:**
```json
{
  "donation": {
    "id": "uuid",
    "donationNumber": "DON-2024-001",
    "vendorId": "uuid",
    "donor": { ... },
    "receivingId": "uuid",
    "receiving": { ... },
    "donationDate": "2026-01-10",
    "donationType": "goods",
    "donorName": "John Doe",
    "donorEmail": "john@example.com",
    "donorPhone": "555-1234",
    "donorAddress": "123 Main St, Springfield, IL",
    "totalItems": 5,
    "totalQuantity": 10,
    "fairMarketValue": 500.00,
    "taxReceiptRequired": true,
    "taxReceiptSent": true,
    "taxReceiptNumber": "RCPT-2024-001",
    "taxReceiptDate": "2026-01-11",
    "acknowledgmentSent": true,
    "goodsServicesProvided": false,
    "appraisalRequired": false,
    "notes": "Donation from annual drive",
    "processedBy": "uuid",
    "createdAt": "2026-01-10T14:00:00Z"
  },
  "items": [
    {
      "productName": "Office Chair",
      "quantity": 2,
      "fairMarketValue": 150.00,
      "condition": "good"
    }
  ]
}
```

### Create Donation

```http
POST /api/v1/donations
```

**Request:**
```json
{
  "vendorId": "uuid",
  "donorName": "John Doe",
  "donorEmail": "john@example.com",
  "donorPhone": "555-1234",
  "donorAddress": "123 Main St",
  "donationDate": "2026-01-10",
  "donationType": "goods",
  "items": [
    {
      "productName": "Office Chair",
      "quantity": 2,
      "fairMarketValue": 150.00,
      "condition": "good"
    }
  ],
  "fairMarketValue": 500.00,
  "notes": "Annual donation drive"
}
```

**Response:**
```json
{
  "donation": { ... },
  "receiving": { ... }
}
```

### Update Donation

```http
PUT /api/v1/donations/:id
```

### Generate Tax Receipt

```http
POST /api/v1/donations/:id/generate-receipt
```

**Response:**
```json
{
  "donation": {
    "taxReceiptNumber": "RCPT-2024-001",
    "taxReceiptDate": "2026-01-11",
    ...
  },
  "receiptPdf": "base64_encoded_pdf_or_url",
  "receiptNumber": "RCPT-2024-001"
}
```

### Send Tax Receipt

```http
POST /api/v1/donations/:id/send-receipt
```

**Request:**
```json
{
  "email": "john@example.com",
  "method": "email"
}
```

**Response:**
```json
{
  "success": true,
  "sentAt": "2026-01-11T10:00:00Z"
}
```

### Generate Acknowledgment

```http
POST /api/v1/donations/:id/generate-acknowledgment
```

For donations over $250 (IRS requirement).

**Response:**
```json
{
  "donation": {
    "acknowledgmentSent": true,
    "acknowledgmentDate": "2026-01-11",
    ...
  },
  "acknowledgmentPdf": "base64_encoded_pdf_or_url"
}
```

### Get Receipt by Donation Number

```http
GET /api/v1/donations/receipts/:donationNumber
```

**Response:**
```json
{
  "receiptPdf": "base64_encoded_pdf_or_url"
}
```

### Get Annual Summary

```http
GET /api/v1/donations/annual-summary/:vendorId/:year
```

**Response:**
```json
{
  "summary": {
    "vendorId": "uuid",
    "year": 2024,
    "totalDonations": 12,
    "totalValue": 6000.00,
    "goodsDonations": 10,
    "cashDonations": 2
  },
  "donations": [...],
  "receipts": [...],
  "yearEndStatement": "pdf_url"
}
```

---

## Accounts Payable Endpoints

### List Invoices

```http
GET /api/v1/accounts-payable
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `status` - Filter by status (open, partial, paid, overdue, cancelled, disputed)
- `vendorId` - Filter by vendor
- `overdue` (boolean) - Show only overdue invoices
- `startDate`, `endDate` - Date range

**Response:**
```json
{
  "invoices": [
    {
      "id": "uuid",
      "apNumber": "AP-2024-001",
      "vendorId": "uuid",
      "vendor": { "businessName": "ABC Supplies" },
      "invoiceNumber": "INV-12345",
      "invoiceDate": "2026-01-01",
      "dueDate": "2026-01-31",
      "status": "open",
      "invoiceAmount": 5000.00,
      "amountPaid": 0.00,
      "amountDue": 5000.00,
      "isOverdue": false,
      "createdAt": "2026-01-01T10:00:00Z"
    }
  ],
  "total": 15,
  "totalDue": 25000.00,
  "overdueTotalAmount": 0.00,
  "page": 1,
  "pages": 1
}
```

### Get Invoice by ID

```http
GET /api/v1/accounts-payable/:id
```

**Response:**
```json
{
  "invoice": {
    "id": "uuid",
    "apNumber": "AP-2024-001",
    "vendorId": "uuid",
    "vendor": { ... },
    "purchaseOrderId": "uuid",
    "purchaseOrder": { ... },
    "receivingId": "uuid",
    "invoiceNumber": "INV-12345",
    "invoiceDate": "2026-01-01",
    "dueDate": "2026-01-31",
    "status": "open",
    "invoiceAmount": 5000.00,
    "amountPaid": 0.00,
    "amountDue": 5000.00,
    "discountAvailable": 100.00,
    "discountDate": "2026-01-10",
    "paymentTerms": "net_30",
    "notes": "Payment due by end of month",
    "createdBy": "uuid",
    "createdAt": "2026-01-01T10:00:00Z"
  },
  "payments": [],
  "allocations": []
}
```

### Create Invoice

```http
POST /api/v1/accounts-payable
```

**Request:**
```json
{
  "vendorId": "uuid",
  "purchaseOrderId": "uuid",
  "invoiceNumber": "INV-12345",
  "invoiceDate": "2026-01-01",
  "dueDate": "2026-01-31",
  "amount": 5000.00,
  "discountAvailable": 100.00,
  "discountDate": "2026-01-10",
  "paymentTerms": "net_30",
  "notes": "Payment due by end of month"
}
```

**Response:**
```json
{
  "invoice": { ... }
}
```

### Update Invoice

```http
PUT /api/v1/accounts-payable/:id
```

### Cancel Invoice

```http
POST /api/v1/accounts-payable/:id/cancel
```

**Request:**
```json
{
  "reason": "Incorrect invoice amount"
}
```

### Get Aging Report

```http
GET /api/v1/accounts-payable/aging-report
```

**Query Parameters:**
- `vendorId` - Optional vendor filter
- `asOfDate` - Report as of date (default: today)

**Response:**
```json
{
  "report": {
    "asOfDate": "2026-01-13",
    "vendors": [
      {
        "vendorId": "uuid",
        "vendorName": "ABC Supplies",
        "current": 2500.00,
        "days30": 1500.00,
        "days60": 500.00,
        "days90plus": 500.00,
        "total": 5000.00
      }
    ],
    "totals": {
      "current": 10000.00,
      "days30": 5000.00,
      "days60": 2000.00,
      "days90plus": 1000.00,
      "grandTotal": 18000.00
    }
  }
}
```

### Get Due This Week

```http
GET /api/v1/accounts-payable/due-this-week
```

**Response:**
```json
{
  "invoices": [
    {
      "apNumber": "AP-2024-001",
      "vendor": "ABC Supplies",
      "invoiceNumber": "INV-12345",
      "dueDate": "2026-01-17",
      "amountDue": 5000.00,
      "daysUntilDue": 4
    }
  ],
  "totalDue": 15000.00
}
```

---

## Vendor Payment Endpoints

### List Payments

```http
GET /api/v1/vendor-payments
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `vendorId` - Filter by vendor
- `status` - Filter by status (pending, cleared, void, cancelled)
- `startDate`, `endDate` - Date range

**Response:**
```json
{
  "payments": [
    {
      "id": "uuid",
      "paymentNumber": "PMT-2024-001",
      "vendorId": "uuid",
      "vendor": { "businessName": "ABC Supplies" },
      "paymentDate": "2026-01-15",
      "paymentMethod": "check",
      "paymentAmount": 5000.00,
      "status": "cleared",
      "checkNumber": "1001",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "total": 10,
  "totalAmount": 50000.00,
  "page": 1,
  "pages": 1
}
```

### Get Payment by ID

```http
GET /api/v1/vendor-payments/:id
```

**Response:**
```json
{
  "payment": {
    "id": "uuid",
    "paymentNumber": "PMT-2024-001",
    "vendorId": "uuid",
    "vendor": { ... },
    "accountsPayableId": "uuid",
    "invoice": { ... },
    "paymentDate": "2026-01-15",
    "paymentMethod": "check",
    "paymentAmount": 5000.00,
    "discountTaken": 100.00,
    "checkNumber": "1001",
    "transactionReference": null,
    "bankAccount": "Checking-***1234",
    "status": "cleared",
    "notes": "Payment for January invoice",
    "processedBy": "uuid",
    "approvedBy": "uuid",
    "createdAt": "2026-01-15T10:00:00Z"
  },
  "allocations": [
    {
      "accountsPayableId": "uuid",
      "apNumber": "AP-2024-001",
      "allocatedAmount": 5000.00,
      "allocationDate": "2026-01-15"
    }
  ]
}
```

### Create Payment

```http
POST /api/v1/vendor-payments
```

**Request:**
```json
{
  "vendorId": "uuid",
  "paymentMethod": "check",
  "paymentAmount": 5000.00,
  "paymentDate": "2026-01-15",
  "checkNumber": "1001",
  "invoiceAllocations": [
    {
      "accountsPayableId": "uuid",
      "amount": 5000.00
    }
  ],
  "discountTaken": 100.00,
  "notes": "Payment for January invoice"
}
```

**Response:**
```json
{
  "payment": { ... },
  "allocations": [...]
}
```

### Update Payment

```http
PUT /api/v1/vendor-payments/:id
```

### Approve Payment

```http
POST /api/v1/vendor-payments/:id/approve
```

**Response:**
```json
{
  "payment": {
    "status": "cleared",
    "approvedBy": "uuid",
    ...
  }
}
```

### Void Payment

```http
POST /api/v1/vendor-payments/:id/void
```

**Request:**
```json
{
  "reason": "Check lost in mail"
}
```

### Batch Payments

```http
POST /api/v1/vendor-payments/batch
```

**Request:**
```json
{
  "payments": [
    {
      "vendorId": "uuid",
      "amount": 5000.00,
      "invoiceIds": ["uuid1", "uuid2"]
    },
    {
      "vendorId": "uuid",
      "amount": 3000.00,
      "invoiceIds": ["uuid3"]
    }
  ],
  "paymentMethod": "check",
  "paymentDate": "2026-01-15"
}
```

**Response:**
```json
{
  "payments": [...],
  "totalProcessed": 2,
  "totalAmount": 8000.00
}
```

### Print Check

```http
GET /api/v1/vendor-payments/:id/print-check
```

**Response:**
```json
{
  "checkPdf": "base64_encoded_pdf_or_url"
}
```

---

## Bulk Import Endpoints

### Import Vendor Inventory

```http
POST /api/v1/import/vendor-inventory
```

**Request:** multipart/form-data
```
file: CSV/Excel/JSON/XML file
vendorId: uuid
importType: purchase|donation|consignment
purchaseOrderNumber: string (optional)
fieldMapping: JSON object (optional)
```

**Response:**
```json
{
  "importBatchId": "uuid",
  "status": "processing"
}
```

### List Import Batches

```http
GET /api/v1/import/batches
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `status` - Filter by status (processing, completed, failed, cancelled)
- `vendorId` - Filter by vendor

**Response:**
```json
{
  "batches": [
    {
      "id": "uuid",
      "batchNumber": "IMP-2024-001",
      "vendorId": "uuid",
      "vendor": { "businessName": "ABC Supplies" },
      "importType": "purchase",
      "fileName": "inventory_jan_2024.csv",
      "fileFormat": "csv",
      "totalRecords": 150,
      "successfulRecords": 145,
      "failedRecords": 5,
      "status": "completed",
      "startedAt": "2026-01-13T10:00:00Z",
      "completedAt": "2026-01-13T10:05:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "pages": 1
}
```

### Get Import Batch Details

```http
GET /api/v1/import/batches/:id
```

**Response:**
```json
{
  "batch": {
    "id": "uuid",
    "batchNumber": "IMP-2024-001",
    "vendorId": "uuid",
    "vendor": { ... },
    "importType": "purchase",
    "fileName": "inventory_jan_2024.csv",
    "fileSize": 524288,
    "fileFormat": "csv",
    "totalRecords": 150,
    "successfulRecords": 145,
    "failedRecords": 5,
    "skippedRecords": 0,
    "status": "completed",
    "startedAt": "2026-01-13T10:00:00Z",
    "completedAt": "2026-01-13T10:05:00Z",
    "importedBy": "uuid",
    "importSummary": {
      "productsCreated": 120,
      "productsUpdated": 25,
      "categoriesCreated": 5,
      "totalValue": 67500.00
    }
  },
  "items": [
    {
      "rowNumber": 3,
      "status": "error",
      "errorMessage": "Duplicate SKU: PROD-003",
      "sourceData": { ... }
    }
  ],
  "errors": [...]
}
```

### Validate Import

```http
POST /api/v1/import/batches/:id/validate
```

**Response:**
```json
{
  "validation": {
    "valid": false,
    "validRecords": 145,
    "totalRecords": 150
  },
  "errors": [
    {
      "row": 3,
      "field": "sku",
      "error": "Duplicate SKU",
      "value": "PROD-003"
    }
  ],
  "warnings": [
    {
      "row": 10,
      "field": "category",
      "warning": "Category will be auto-created"
    }
  ]
}
```

### Execute Import

```http
POST /api/v1/import/batches/:id/execute
```

**Request:**
```json
{
  "confirmExecution": true
}
```

**Response:**
```json
{
  "batch": {
    "status": "processing",
    ...
  },
  "processing": true
}
```

### Cancel Import

```http
POST /api/v1/import/batches/:id/cancel
```

### Get Error Report

```http
GET /api/v1/import/batches/:id/error-report
```

**Response:**
```json
{
  "errors": [...],
  "csv": "base64_encoded_csv_or_url"
}
```

### List Templates

```http
GET /api/v1/import/templates
```

**Response:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "vendorId": "uuid",
      "vendorName": "ABC Supplies",
      "templateName": "ABC Standard Import",
      "fieldMapping": { ... },
      "createdAt": "2026-01-01T10:00:00Z"
    }
  ]
}
```

### Get Template by Vendor

```http
GET /api/v1/import/templates/:vendorId
```

**Response:**
```json
{
  "template": {
    "id": "uuid",
    "vendorId": "uuid",
    "templateName": "ABC Standard Import",
    "fieldMapping": {
      "sku": "product_code",
      "name": "item_name",
      "quantity": "qty",
      "unitCost": "cost"
    }
  }
}
```

### Create Template

```http
POST /api/v1/import/templates
```

**Request:**
```json
{
  "vendorId": "uuid",
  "templateName": "ABC Standard Import",
  "fieldMapping": {
    "sku": "product_code",
    "name": "item_name",
    "quantity": "qty"
  }
}
```

---

_Due to length, the remaining endpoint categories (Inventory Counts, Reconciliation, Analysis, Transactions, Payments, Sync, and Admin) follow the same detailed pattern. See the [full API documentation](../ARCHITECTURE.md) for complete specifications._

---

## Error Codes

Common error codes returned by the API:

| Code | Description |
|------|-------------|
| `AUTH_INVALID_CREDENTIALS` | Invalid username or password |
| `AUTH_TOKEN_EXPIRED` | Access token has expired |
| `AUTH_INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `VALIDATION_ERROR` | Request validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource does not exist |
| `DUPLICATE_SKU` | SKU already exists in system |
| `DUPLICATE_BARCODE` | Barcode already exists |
| `INSUFFICIENT_STOCK` | Not enough inventory for operation |
| `PAYMENT_FAILED` | Payment processing failed |
| `IMPORT_VALIDATION_FAILED` | Bulk import validation errors |
| `PO_ALREADY_RECEIVED` | Purchase order already fully received |
| `INVOICE_ALREADY_PAID` | Invoice has been fully paid |

---

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Authentication endpoints:** 10 requests/minute
- **Standard endpoints:** 100 requests/minute
- **Bulk operations:** 10 requests/minute

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642089600
```

---

## Webhooks

The system can send webhooks for important events:

### Webhook Events

- `transaction.completed`
- `payment.succeeded`
- `payment.failed`
- `inventory.low_stock`
- `donation.received`
- `purchase_order.approved`
- `receiving.completed`
- `invoice.overdue`

### Webhook Payload Format

```json
{
  "event": "transaction.completed",
  "timestamp": "2026-01-13T14:30:00Z",
  "data": {
    "transactionId": "uuid",
    "transactionNumber": "T-20240113-0001",
    "totalAmount": 150.00
  }
}
```

---

## Related Documents

- [Main Architecture](../ARCHITECTURE.md) - System overview
- [Data Model](DATA_MODEL.md) - Database schema
- [Bulk Import System](BULK_IMPORT.md) - Import specifications
- [Security & Deployment](SECURITY_DEPLOYMENT.md) - Security guidelines

---

**Document Version:** 2.0
**Last Updated:** 2026-01-13
**Maintained By:** API Team
