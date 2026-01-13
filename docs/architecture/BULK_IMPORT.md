# Bulk Import System for Vendor Databases

**Part of:** [POS System Architecture](../ARCHITECTURE.md)
**Version:** 2.0
**Last Updated:** 2026-01-13

## Overview

The bulk import system enables non-profit organizations to efficiently import inventory data from various vendor sources, supporting multiple formats and ensuring data integrity. This system is critical for onboarding new vendors, processing donations, and maintaining accurate inventory records.

### Key Use Cases

- **Receiving electronic catalogs** from suppliers
- **Importing donation manifests** from partner organizations
- **Bulk uploading consignment inventory** lists
- **Migrating data** from legacy systems
- **Processing estate sale inventories**
- **Quarterly vendor catalog updates**
- **Special event inventory** (fundraisers, sales)

---

## Supported File Formats

The system supports the following formats for bulk import:

| Format | Extension | Common Use | Max Size |
|--------|-----------|------------|----------|
| **CSV** | .csv | Most vendor files | 50MB |
| **Excel** | .xlsx, .xls | Spreadsheet exports | 50MB |
| **TSV** | .tsv | Tab-delimited data | 50MB |
| **JSON** | .json | API/structured data | 50MB |
| **XML** | .xml | Legacy system integrations | 50MB |
| **Fixed-Width** | .txt | Mainframe systems | 50MB |

### Format Recommendations

- **CSV** - Preferred format for most vendors (universal compatibility)
- **Excel** - Good for vendors comfortable with spreadsheets
- **JSON** - Best for automated API integrations
- **XML** - Use for enterprise system integrations

---

## Standard Vendor Import Format Specification

To ensure consistency and ease of integration, we define a standard format for vendor inventory databases. Vendors should provide data in this format for seamless import.

### Required Fields (Minimum)

```csv
sku,product_name,category,quantity
```

### Recommended Format

```csv
sku,product_name,description,category,quantity,unit_cost,fair_market_value,condition
```

### Complete Field Specification

| Field Name | Type | Required | Max Length | Description | Example |
|------------|------|----------|------------|-------------|---------|
| `sku` | String | **Yes** | 100 | Unique product identifier | "ELEC-TV-001" |
| `barcode` | String | No | 100 | UPC/EAN barcode | "012345678905" |
| `product_name` | String | **Yes** | 255 | Product name | "Samsung 55\" TV" |
| `description` | Text | No | - | Product description | "4K Smart TV with HDR" |
| `category` | String | **Yes** | 100 | Category name or path | "Electronics/TVs" |
| `quantity` | Integer | **Yes** | - | Quantity available | 5 |
| `unit_cost` | Decimal | No* | - | Cost per unit (0 for donations) | 299.99 |
| `fair_market_value` | Decimal | Yes** | - | Estimated market value | 449.99 |
| `condition` | String | No | 50 | Item condition | "new", "like_new", "good" |
| `base_price` | Decimal | No | - | Retail/sale price | 599.99 |
| `tax_rate` | Decimal | No | - | Tax percentage | 7.5 |
| `vendor_sku` | String | No | 100 | Vendor's SKU reference | "VEND-12345" |
| `manufacturer` | String | No | 255 | Manufacturer name | "Samsung" |
| `model_number` | String | No | 100 | Model/part number | "UN55TU8000" |
| `color` | String | No | 50 | Color/variant | "Black" |
| `size` | String | No | 50 | Size (if applicable) | "55 inch" |
| `weight` | Decimal | No | - | Weight in pounds | 38.5 |
| `dimensions` | String | No | 100 | L x W x H in inches | "48.4 x 27.8 x 2.4" |
| `location` | String | No | 100 | Storage/warehouse location | "A-15-B" |
| `image_url` | String | No | 500 | URL to product image | "https://..." |
| `notes` | Text | No | - | Additional notes | "Includes remote" |

\* **Required for purchases**, optional for donations
\** **Required for donations** for tax purposes (IRS compliance)

### Valid Values for Enumerated Fields

#### Condition Values

| Value | Description | Common Use |
|-------|-------------|------------|
| `new` | Brand new, never used | Retail purchases, new donations |
| `like_new` | Gently used, excellent condition | High-quality donations |
| `good` | Used, good working condition | Standard used items |
| `fair` | Used, shows wear but functional | Budget items, thrift sales |
| `poor` | Significant wear or cosmetic damage | As-is sales |
| `damaged` | Not fully functional, needs repair | Repair/refurbish projects |
| `for_parts` | Not functional, for parts only | Salvage items |

---

## Import Process Workflow

The import process follows a 7-step workflow to ensure data quality and traceability:

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: FILE UPLOAD                                             │
│ - User uploads vendor file via admin dashboard                  │
│ - System validates file format and size                         │
│ - File stored temporarily for processing                        │
│ - Virus scan performed                                          │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: VENDOR/DONOR SELECTION                                  │
│ - Select existing vendor or create new vendor profile           │
│ - Specify import type: purchase, donation, consignment          │
│ - Enter PO number (if applicable)                               │
│ - Set duplicate handling strategy                               │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: FIELD MAPPING                                           │
│ - Auto-detect columns and suggest mappings                      │
│ - User confirms or adjusts field mappings                       │
│ - Set default values for missing fields                         │
│ - Preview first 10 rows with mappings applied                   │
│ - Save template for future imports (optional)                   │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: DATA VALIDATION                                         │
│ - Validate required fields present                              │
│ - Check data types and formats                                  │
│ - Validate SKU uniqueness                                       │
│ - Verify category exists or flag for creation                   │
│ - Flag errors and warnings                                      │
│ - Generate validation report                                    │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: REVIEW & CONFIRMATION                                   │
│ Summary displayed:                                               │
│   • Total records: 150                                          │
│   • Valid records: 145                                          │
│   • Records with errors: 5                                      │
│   • New products: 120                                           │
│   • Existing products to update: 25                             │
│   • Total value: $12,450.00                                     │
│                                                                  │
│ User options:                                                    │
│   • Proceed with valid records only                             │
│   • Fix errors and re-validate                                  │
│   • Cancel import                                               │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: IMPORT EXECUTION                                        │
│ For each valid record:                                          │
│   • Create/update product in catalog                            │
│   • Create purchase order (if purchase)                         │
│   • Create receiving record                                     │
│   • Create donation record (if donation)                        │
│   • Update inventory quantities                                 │
│   • Link to vendor                                              │
│   • Generate transaction audit trail                            │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: POST-IMPORT ACTIONS                                     │
│   • Generate import summary report                              │
│   • Create donation receipts (if applicable)                    │
│   • Generate accounts payable entries (if purchase)             │
│   • Send confirmation email to vendor                           │
│   • Update vendor statistics                                    │
│   • Archive import file for audit                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## CSV Template Examples

### Example 1: Purchase from Vendor

**Scenario:** Standard wholesale purchase with cost and retail pricing.

```csv
sku,barcode,product_name,description,category,quantity,unit_cost,base_price,condition,vendor_sku
ELEC-TV-001,012345678905,Samsung 55" 4K TV,Smart TV with HDR,Electronics/TVs,5,299.99,599.99,new,SAMS-UN55TU8000
HOME-CHAIR-002,012345678912,Office Chair,Ergonomic mesh back,Furniture/Seating,10,45.50,89.99,new,OFC-ERGO-BLK
BOOK-FICT-003,,The Great Novel,Hardcover fiction,Books/Fiction,25,8.99,24.99,new,PUB-12345
```

**Key Points:**
- Unit cost and base price both specified
- Condition is "new" for all items
- Vendor SKU included for reference
- Mix of items with and without barcodes

### Example 2: Donation from Individual

**Scenario:** Individual donor providing used items for tax deduction.

```csv
sku,product_name,description,category,quantity,fair_market_value,condition,notes
DON-CLOTH-001,Men's Winter Coat,North Face parka,Clothing/Outerwear,1,75.00,good,Size Large
DON-ELECT-002,Laptop Computer,Dell Latitude E7450,Electronics/Computers,1,250.00,like_new,Includes charger
DON-FURN-003,Dining Table,Solid wood table,Furniture/Dining,1,150.00,fair,Some scratches
```

**Key Points:**
- Fair market value specified (required for tax receipts)
- Condition varies based on item state
- Unit cost is 0 (implied for donations)
- Notes capture important details

### Example 3: Consignment Items

**Scenario:** Artist or collector providing items for sale with revenue sharing.

```csv
sku,product_name,description,category,quantity,fair_market_value,base_price,condition,vendor_sku,notes
CONS-ART-001,Original Oil Painting,Landscape by local artist,Art/Paintings,1,500.00,750.00,excellent,ARTIST-2024-01,50/50 split
CONS-JEWL-002,Vintage Necklace,Sterling silver chain,Jewelry/Necklaces,1,85.00,150.00,good,JEWEL-VTG-023,60/40 split
```

**Key Points:**
- Fair market value (cost) vs base price (selling price)
- Revenue sharing terms in notes
- Vendor SKU tracks consignor's reference
- Condition important for pricing

### Example 4: Estate Sale Bulk Import

**Scenario:** Large estate donation with mixed condition items.

```csv
sku,product_name,description,category,quantity,fair_market_value,condition,location
EST-001,Antique Desk,Oak writing desk ca 1920,Furniture/Antiques,1,800.00,good,Warehouse-A
EST-002,Book Collection,50 vintage books,Books/Vintage,50,250.00,fair,Warehouse-B
EST-003,Kitchen Appliances,Various small appliances,Appliances/Small,15,300.00,good,Warehouse-A
EST-004,Clothing Lot,Mixed vintage clothing,Clothing/Vintage,100,500.00,fair,Warehouse-C
```

**Key Points:**
- Bulk lots with quantity > 1
- Location field for warehouse management
- Fair market value for entire lot
- Mix of individual items and bulk lots

---

## Advanced Import Features

### 1. Category Auto-Creation

The system automatically creates missing categories during import:

**Example:** If importing `"Electronics/TVs/Smart TVs"` and only `"Electronics"` exists:

```
Creates:
  Electronics (existing)
    └─ TVs (new)
        └─ Smart TVs (new)
```

**Features:**
- Hierarchical category creation (up to 5 levels)
- Categories marked for admin review
- Automatic parent-child relationships
- Duplicate prevention (case-insensitive)

**Configuration:**
```json
{
  "autoCategoryCreation": true,
  "requireApproval": true,
  "maxDepth": 5
}
```

### 2. Duplicate Handling

When a SKU already exists in the system, choose from four strategies:

| Strategy | Behavior | Use When |
|----------|----------|----------|
| **Update Mode** | Update existing product with new data | Vendor catalog updates |
| **Skip Mode** | Skip duplicate, keep existing data | Preventing accidental overwrites |
| **Create New Mode** | Generate new SKU with suffix (SKU-001-2) | Need to keep both versions |
| **Error Mode** | Flag as error for manual review | Strict data integrity required |

**Example Configuration:**
```json
{
  "duplicateHandling": "update",
  "updateFields": ["price", "quantity", "description"],
  "preserveFields": ["barcode", "category"]
}
```

### 3. Batch Processing

For large imports (>1000 items):

**Features:**
- Process in batches of 100-500 records
- Real-time progress bar with ETA
- Ability to pause/resume
- Background processing for large files
- Email notification on completion

**Process:**
```
Import Job: 5,000 records
├─ Batch 1: Records 1-500 (Processing...)
├─ Batch 2: Records 501-1000 (Queued)
├─ Batch 3: Records 1001-1500 (Queued)
...
└─ Batch 10: Records 4501-5000 (Queued)

Estimated completion: 15 minutes
```

### 4. Vendor Template Management

Save and reuse field mappings for recurring imports:

**Template Features:**
- Custom field mappings per vendor
- Default values for missing fields
- Data transformation rules
- Version control (v1, v2, v3...)
- Share templates across users

**Example Template:**
```json
{
  "templateName": "ABC Supplies Standard",
  "vendorId": "uuid",
  "fieldMapping": {
    "sku": "product_code",
    "product_name": "item_name",
    "quantity": "qty_available",
    "unit_cost": "wholesale_price"
  },
  "defaults": {
    "condition": "new",
    "tax_rate": 7.5
  },
  "transformations": {
    "unit_cost": "multiply_by_0.9"
  }
}
```

### 5. Data Transformation Rules

Apply transformations during import:

| Transformation | Example | Use Case |
|----------------|---------|----------|
| **Currency Conversion** | EUR → USD | International vendors |
| **Unit Conversion** | kg → lbs | Metric to imperial |
| **Date Standardization** | DD/MM/YYYY → ISO | Various date formats |
| **Text Normalization** | UPPERCASE → Title Case | Consistent naming |
| **Trim Whitespace** | " Text " → "Text" | Clean data |
| **Custom Regex** | Remove special chars | Data sanitization |
| **Price Calculation** | Cost × Markup | Auto-calculate retail |

**Example:**
```json
{
  "transformations": [
    {
      "field": "unit_cost",
      "rule": "multiply",
      "value": 1.15,
      "description": "Convert EUR to USD"
    },
    {
      "field": "weight",
      "rule": "convert",
      "from": "kg",
      "to": "lbs",
      "description": "Metric to imperial"
    },
    {
      "field": "product_name",
      "rule": "regex_replace",
      "pattern": "[^a-zA-Z0-9\\s-]",
      "replacement": "",
      "description": "Remove special characters"
    }
  ]
}
```

---

## Error Handling

### Common Import Errors

| Error Type | Description | Resolution | Severity |
|------------|-------------|------------|----------|
| **Missing Required Field** | Required column not mapped or empty | Map column or provide default value | Error |
| **Invalid Data Type** | Text in numeric field | Correct data in source file | Error |
| **Duplicate SKU** | SKU already exists | Choose duplicate handling strategy | Error/Warning |
| **Category Not Found** | Invalid category name | Create category or map to existing | Warning |
| **Invalid Enum Value** | Condition = "brand new" instead of "new" | Use valid value or add mapping rule | Error |
| **Negative Quantity** | Quantity < 0 | Correct source data | Error |
| **Invalid Price** | Price = "$50.00" instead of 50.00 | Remove currency symbol | Error |
| **Missing Barcode** | Barcode column empty | Acceptable if barcode not required | Warning |
| **Image URL 404** | Image link broken | Fix URL or remove | Warning |

### Validation Rules

#### SKU Validation
- Alphanumeric characters, hyphens, underscores only
- Maximum 100 characters
- Must be unique across all products
- Case-sensitive

**Valid:** `PROD-001`, `elec_tv_55`, `ABC-123-XYZ`
**Invalid:** `PROD 001` (space), `PROD@001` (special char), `[>100 chars]`

#### Quantity Validation
- Must be integer
- Must be >= 0
- Maximum: 999,999

#### Price Validation
- Must be decimal number
- Must be >= 0
- Maximum 2 decimal places
- Maximum value: 999,999.99

**Valid:** `49.99`, `0.00`, `1000`
**Invalid:** `$49.99`, `-10.00`, `49.999`

#### Condition Validation
- Must match one of: `new`, `like_new`, `good`, `fair`, `poor`, `damaged`, `for_parts`
- Case-insensitive matching
- Auto-correction for common variations

**Mappings:**
- `brand new` → `new`
- `excellent` → `like_new`
- `used - good` → `good`
- `as-is` → `poor`

#### Email/Phone Validation (Vendor Contact)
- **Email:** RFC 5322 compliant
- **Phone:** 10-15 digits, optional formatting

#### Barcode Validation (Optional)
- Valid UPC-A (12 digits)
- Valid EAN-13 (13 digits)
- Valid UPC-E (8 digits)
- Check digit validation

---

## API for Programmatic Import

For automated integrations, use the REST API endpoint:

### Import Endpoint

```http
POST /api/v1/import/vendor-inventory
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "vendor_id": "uuid",
  "import_type": "purchase|donation|consignment",
  "purchase_order_number": "PO-2024-001",
  "file_format": "csv|json|xml",
  "field_mapping": {
    "sku": "product_code",
    "product_name": "item_name",
    "quantity": "qty"
  },
  "duplicate_handling": "update|skip|error|create_new",
  "auto_create_categories": true,
  "validate_only": false,
  "data": [
    {
      "product_code": "ITEM-001",
      "item_name": "Product Name",
      "qty": 10,
      "cost": 45.00
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "importBatchId": "uuid",
  "status": "processing",
  "summary": {
    "totalRecords": 100,
    "validRecords": 95,
    "errorRecords": 5
  },
  "validationErrors": [
    {
      "row": 3,
      "field": "sku",
      "error": "Duplicate SKU",
      "value": "ITEM-003"
    }
  ]
}
```

### Check Import Status

```http
GET /api/v1/import/batches/:batchId
```

**Response:**
```json
{
  "batch": {
    "id": "uuid",
    "status": "completed",
    "totalRecords": 100,
    "successfulRecords": 95,
    "failedRecords": 5,
    "startedAt": "2026-01-13T10:00:00Z",
    "completedAt": "2026-01-13T10:05:00Z"
  }
}
```

---

## Import Audit Trail

All imports are tracked in the database for compliance and troubleshooting:

### Database Schema

```sql
CREATE TABLE import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id),
    import_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    file_format VARCHAR(20),

    total_records INTEGER,
    successful_records INTEGER,
    failed_records INTEGER,
    skipped_records INTEGER,

    status VARCHAR(20) DEFAULT 'processing',
    -- Status: processing, completed, failed, cancelled

    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,

    imported_by UUID REFERENCES users(id),
    error_log JSONB,
    import_summary JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE import_batch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
    row_number INTEGER,

    status VARCHAR(20), -- success, error, skipped
    product_id UUID REFERENCES products(id),
    receiving_id UUID REFERENCES inventory_receiving(id),

    source_data JSONB, -- Original row data
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);
```

### Audit Information Captured

- **Who:** User who initiated import
- **What:** Files imported, records processed
- **When:** Start/end timestamps
- **Where:** Vendor source, import type
- **Why:** Purchase order reference, notes
- **How:** Field mappings, transformations applied
- **Result:** Success/failure counts, error details

---

## Security Considerations

### 1. File Upload Security

**Validation:**
- Maximum file size: 50MB
- Allowed MIME types whitelist
- File extension verification
- Virus scanning (ClamAV or similar)
- Sanitize file names

**Implementation:**
```typescript
const allowedMimeTypes = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/json',
  'application/xml',
  'text/plain'
];

const maxFileSize = 50 * 1024 * 1024; // 50MB
```

### 2. Data Validation & Sanitization

**Protection Against:**
- SQL injection (parameterized queries)
- XSS attacks (input sanitization)
- CSV injection (escape formulas)
- Path traversal (sanitize paths)

**Sanitization Rules:**
- Strip HTML tags from text fields
- Validate numeric ranges
- Escape special characters
- Remove control characters

### 3. Access Control

**Permissions:**
- Only **managers** and **admins** can import
- Vendor users see only their own import history
- Audit trail of all import operations
- Role-based field visibility

### 4. Sensitive Data Handling

**Protection:**
- Encrypt vendor payment information
- Mask tax IDs in logs and UI
- PCI compliance for payment data
- No storage of banking details in import files
- GDPR compliance for personal data

---

## Best Practices for Vendors

### File Preparation Checklist

✅ Use UTF-8 encoding for CSV files
✅ Include column headers in first row
✅ Use consistent date format (ISO 8601)
✅ Remove currency symbols from prices
✅ Use decimal points, not commas
✅ Ensure SKUs are unique
✅ Verify category names match system
✅ Include condition for used items
✅ Test with small sample first
✅ Document any custom fields

### Common Mistakes to Avoid

❌ Including formulas in Excel files
❌ Mixing data types in columns
❌ Using special characters in SKUs
❌ Inconsistent category naming
❌ Missing required fields
❌ Incorrect price decimals (49.999)
❌ Negative quantities
❌ Empty rows in the middle of file
❌ File size over 50MB
❌ Non-UTF8 encoding

---

## Troubleshooting Guide

### Import Fails to Start

**Symptoms:** Upload completes but import doesn't begin

**Solutions:**
1. Check file format is supported
2. Verify file size under 50MB
3. Ensure UTF-8 encoding
4. Check for virus/malware
5. Review server logs for errors

### All Records Fail Validation

**Symptoms:** 100% validation failure rate

**Solutions:**
1. Verify field mapping is correct
2. Check column headers match expectations
3. Ensure data types are correct
4. Review required fields are present
5. Check for encoding issues

### Slow Import Performance

**Symptoms:** Import takes unusually long

**Solutions:**
1. Enable batch processing for large files
2. Reduce batch size (try 100-200 records)
3. Check database indexes are present
4. Review server resource utilization
5. Consider off-peak import timing

### Duplicate SKU Errors

**Symptoms:** Many records fail due to duplicate SKUs

**Solutions:**
1. Change duplicate handling to "update" mode
2. Review SKU generation logic
3. Add vendor prefix to prevent conflicts
4. Use create_new mode with suffix

---

## Related Documents

- [Main Architecture](../ARCHITECTURE.md) - System overview
- [Data Model](DATA_MODEL.md) - Import database tables
- [API Endpoints](API_ENDPOINTS.md) - Import API details
- [Security & Deployment](SECURITY_DEPLOYMENT.md) - Security guidelines

---

**Document Version:** 2.0
**Last Updated:** 2026-01-13
**Maintained By:** Operations Team
