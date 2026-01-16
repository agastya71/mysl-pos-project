# Coding Rules and Standards

This document defines the coding rules and standards for the POS System project. All code must adhere to these guidelines.

## General Principles

### Code Quality
- **KISS (Keep It Simple, Stupid):** Favor simple, straightforward solutions over complex ones
- **DRY (Don't Repeat Yourself):** Extract common logic into reusable functions/components
- **YAGNI (You Aren't Gonna Need It):** Don't add functionality until it's needed
- **Single Responsibility:** Each function/class should have one clear purpose
- **Fail Fast:** Validate inputs early and throw errors for invalid states

### Security First
- **NEVER** commit sensitive data (API keys, passwords, tokens) to Git
- **ALWAYS** validate and sanitize user inputs
- **ALWAYS** use parameterized queries to prevent SQL injection
- **ALWAYS** use HTTPS/TLS for data in transit
- Follow PCI DSS guidelines for payment data (delegate to Square/Stripe)
- Implement proper authentication and authorization checks
- Use bcrypt for password hashing (minimum 10 rounds)
- Implement rate limiting on all API endpoints

## Technology-Specific Rules

### TypeScript/JavaScript

#### Code Style
- Use **TypeScript strict mode** for all code
- Use **2 spaces** for indentation
- Use **semicolons** at end of statements
- Use **single quotes** for strings unless template literals are needed
- Use **PascalCase** for classes, types, interfaces, and React components
- Use **camelCase** for variables, functions, and methods
- Use **UPPER_SNAKE_CASE** for constants
- Use **kebab-case** for file names (except React components)

#### TypeScript Standards
```typescript
// ✅ GOOD: Explicit types
function calculateTotal(price: number, quantity: number): number {
    return price * quantity;
}

// ❌ BAD: Implicit any
function calculateTotal(price, quantity) {
    return price * quantity;
}

// ✅ GOOD: Interface for object shape
interface Product {
    id: string;
    name: string;
    price: number;
}

// ✅ GOOD: Type for union/literal types
type PaymentMethod = 'cash' | 'card' | 'check';
```

#### Error Handling
```typescript
// ✅ GOOD: Proper error handling
try {
    const result = await processPayment(data);
    return result;
} catch (error) {
    logger.error('Payment processing failed', { error, data });
    throw new PaymentError('Failed to process payment', { cause: error });
}

// ❌ BAD: Swallowing errors
try {
    await processPayment(data);
} catch (error) {
    console.log('Error occurred');
}
```

#### Async/Await
- **ALWAYS** use async/await instead of raw Promises
- **ALWAYS** handle errors with try/catch
- **NEVER** use async without await inside

```typescript
// ✅ GOOD
async function fetchProducts(): Promise<Product[]> {
    try {
        const products = await db.query('SELECT * FROM products');
        return products;
    } catch (error) {
        logger.error('Failed to fetch products', error);
        throw error;
    }
}

// ❌ BAD: Not handling rejection
async function fetchProducts() {
    return db.query('SELECT * FROM products');
}
```

### React/Frontend

#### Component Structure
```typescript
// ✅ GOOD: Functional component with TypeScript
import React, { useState, useEffect } from 'react';
import type { Product } from '@/types/product.types';

interface ProductCardProps {
    product: Product;
    onAddToCart: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = () => {
        setIsLoading(true);
        onAddToCart(product.id);
    };

    return (
        <div className="product-card">
            <h3>{product.name}</h3>
            <button onClick={handleClick} disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add to Cart'}
            </button>
        </div>
    );
};
```

#### Hooks Rules
- Use hooks at the top level (never in conditions/loops)
- Extract complex logic into custom hooks
- Use `useMemo` and `useCallback` for expensive operations
- Properly declare dependencies in `useEffect`

#### State Management
- Use Redux Toolkit for global state
- Use local state (useState) for component-specific state
- Use Context API sparingly (avoid prop drilling, not for frequently changing data)

### Database (PostgreSQL)

#### Schema Design
- Use **UUID** for primary keys (not auto-increment integers)
- Use **snake_case** for table and column names
- **ALWAYS** define foreign key constraints
- **ALWAYS** add indexes for foreign keys and frequently queried columns
- Use appropriate data types (DECIMAL for money, TIMESTAMP for dates)
- Add NOT NULL constraints where appropriate
- Add CHECK constraints for data validation

#### Query Standards
```sql
-- ✅ GOOD: Explicit column names, parameterized
SELECT
    p.id,
    p.name,
    p.price,
    c.name as category_name
FROM products p
INNER JOIN categories c ON p.category_id = c.id
WHERE p.is_active = $1
ORDER BY p.name;

-- ❌ BAD: SELECT *, string concatenation
SELECT * FROM products WHERE name = 'Product' + productName;
```

#### Transactions
- Use transactions for operations that modify multiple tables
- Keep transactions as short as possible
- Always rollback on error

```typescript
// ✅ GOOD
const client = await pool.connect();
try {
    await client.query('BEGIN');
    await client.query('INSERT INTO transactions ...');
    await client.query('UPDATE inventory ...');
    await client.query('COMMIT');
} catch (error) {
    await client.query('ROLLBACK');
    throw error;
} finally {
    client.release();
}
```

### API Design

#### REST Conventions
- Use proper HTTP methods: GET, POST, PUT, PATCH, DELETE
- Use plural nouns for resources: `/api/v1/products`, not `/api/v1/product`
- Use HTTP status codes correctly:
  - 200 OK - Successful GET, PUT, PATCH
  - 201 Created - Successful POST
  - 204 No Content - Successful DELETE
  - 400 Bad Request - Invalid input
  - 401 Unauthorized - Not authenticated
  - 403 Forbidden - Authenticated but not authorized
  - 404 Not Found - Resource doesn't exist
  - 500 Internal Server Error - Server error

#### Request/Response Format
```typescript
// ✅ GOOD: Consistent response format
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code: string;
        details?: any;
    };
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
    };
}

// Example success response
{
    "success": true,
    "data": {
        "id": "123",
        "name": "Product"
    }
}

// Example error response
{
    "success": false,
    "error": {
        "message": "Product not found",
        "code": "PRODUCT_NOT_FOUND"
    }
}
```

#### Validation
- Validate ALL inputs at API boundary
- Use a validation library (Joi, Zod, class-validator)
- Return clear, actionable error messages

```typescript
// ✅ GOOD: Input validation
const productSchema = z.object({
    name: z.string().min(1).max(255),
    price: z.number().positive(),
    sku: z.string().regex(/^[A-Z0-9-]+$/),
});

router.post('/products', async (req, res) => {
    try {
        const validatedData = productSchema.parse(req.body);
        const product = await createProduct(validatedData);
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                error: { message: 'Invalid input', details: error.errors }
            });
        }
    }
});
```

## Testing Standards

### Unit Tests
- Test individual functions in isolation
- Mock external dependencies
- Aim for 80%+ code coverage
- Use descriptive test names: `should return error when price is negative`

### Integration Tests
- Test API endpoints end-to-end
- Test database operations
- Use test database (not production!)

### Test Structure
```typescript
// ✅ GOOD: Clear test structure
describe('ProductService', () => {
    describe('createProduct', () => {
        it('should create product with valid data', async () => {
            const productData = { name: 'Test', price: 10.00 };
            const result = await productService.createProduct(productData);

            expect(result).toBeDefined();
            expect(result.name).toBe('Test');
            expect(result.price).toBe(10.00);
        });

        it('should throw error when price is negative', async () => {
            const productData = { name: 'Test', price: -10.00 };

            await expect(productService.createProduct(productData))
                .rejects
                .toThrow('Price must be positive');
        });
    });
});
```

## Git Conventions

### Branch Naming
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `refactor/what-changed` - Code refactoring
- `docs/what-changed` - Documentation updates
- `test/what-tested` - Test additions/updates

### Commit Messages
Use conventional commits format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance
- `perf`: Performance improvement

**Examples:**
```
feat(products): add barcode scanning support

Implement barcode scanning for product lookup using node-usb library.
Supports USB HID scanners.

Closes #123
```

## File Organization

### Import Order
1. React/External libraries
2. Types
3. Components
4. Services/Hooks
5. Utils
6. Styles

```typescript
// ✅ GOOD: Organized imports
import React, { useState } from 'react';
import { useQuery } from 'react-query';

import type { Product } from '@/types/product.types';

import { ProductCard } from '@/components/Product';

import { useAuth } from '@/hooks/useAuth';
import { productService } from '@/services/products.service';

import { formatPrice } from '@/utils/formatting';

import styles from './ProductList.module.css';
```

### File Naming
- React components: `ProductCard.tsx`
- Services: `products.service.ts`
- Types: `product.types.ts`
- Utils: `formatting.ts`
- Tests: `products.test.ts` or `products.spec.ts`

## Documentation

### Code Comments
- Use JSDoc for functions/classes
- Explain **WHY**, not **WHAT**
- Keep comments up-to-date

```typescript
/**
 * Calculates the final price including tax and discounts.
 * Uses FIFO method for cost calculation.
 *
 * @param basePrice - Base product price
 * @param quantity - Quantity purchased
 * @param taxRate - Tax rate as decimal (e.g., 0.08 for 8%)
 * @returns Final calculated price
 */
function calculateFinalPrice(
    basePrice: number,
    quantity: number,
    taxRate: number
): number {
    // Apply quantity-based discount for bulk purchases
    const discount = quantity >= 10 ? 0.1 : 0;
    const subtotal = basePrice * quantity * (1 - discount);
    return subtotal * (1 + taxRate);
}
```

### README Files
- Every major module should have a README
- Include setup instructions
- Include usage examples
- Keep up-to-date

## Performance Guidelines

### Backend
- Use database connection pooling
- Implement caching for frequently accessed data (Redis)
- Use pagination for large result sets
- Optimize database queries (use EXPLAIN)
- Use indexes appropriately

### Frontend
- Lazy load routes and components
- Optimize images (compress, appropriate formats)
- Use React.memo for expensive components
- Debounce user input
- Minimize bundle size

## Deployment Rules

### Environment Variables
- **NEVER** hardcode configuration
- Use environment variables for all config
- Provide `.env.example` with placeholders
- Document all environment variables

### Logging
- Use structured logging (JSON format)
- Include contextual information
- Use appropriate log levels:
  - ERROR: Errors requiring attention
  - WARN: Potential issues
  - INFO: Important events
  - DEBUG: Detailed debugging info
- **NEVER** log sensitive data (passwords, tokens, PII)

## Code Review Checklist

Before submitting PR, verify:
- [ ] Code follows style guide
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No console.logs or debugger statements
- [ ] Error handling is implemented
- [ ] Security considerations addressed
- [ ] Performance impact considered
- [ ] Breaking changes documented

## Prohibited Practices

### NEVER DO THIS:
- ❌ Commit secrets or sensitive data
- ❌ Use `any` type in TypeScript without justification
- ❌ Write SQL with string concatenation
- ❌ Ignore errors or use empty catch blocks
- ❌ Use `var` (use `const` or `let`)
- ❌ Modify state directly (use immutable updates)
- ❌ Use `eval()` or `Function()` constructor
- ❌ Store sensitive data in localStorage unencrypted
- ❌ Disable ESLint rules without explanation
- ❌ Use nested callbacks (callback hell)

## When in Doubt

1. **Check existing code** - Follow established patterns
2. **Ask for review** - Get feedback early
3. **Favor readability** - Code is read more than written
4. **Keep it simple** - Simple solutions are easier to maintain
5. **Think security** - Always consider security implications

---

**Remember:** These rules exist to maintain code quality, security, and consistency. When rules conflict, prioritize security and correctness over convenience.
