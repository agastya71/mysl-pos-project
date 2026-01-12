# Quick Reference Guide

A quick reference for common tasks, commands, and workflows in the POS system.

## Table of Contents
- [Common Commands](#common-commands)
- [Database Operations](#database-operations)
- [API Endpoints Reference](#api-endpoints-reference)
- [Development Workflow](#development-workflow)
- [Testing Commands](#testing-commands)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Common Commands

### Start Development Environment

```bash
# Start all services with Docker
docker-compose up

# Start all services in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Run Individual Services

```bash
# Backend API
cd backend && npm run dev

# POS Client
cd pos-client && npm start

# Admin Dashboard
cd admin-dashboard && npm start
```

### Build Commands

```bash
# Build all services
npm run build

# Build specific service
cd backend && npm run build
cd pos-client && npm run build:electron
cd admin-dashboard && npm run build
```

---

## Database Operations

### Connect to Database

```bash
# Connect with psql
psql -U pos_user -d pos_db

# Connect via Docker
docker-compose exec postgres psql -U pos_user -d pos_db
```

### Common Database Commands

```sql
-- List all tables
\dt

-- Describe table structure
\d products

-- Show all databases
\l

-- Switch database
\c pos_db

-- Exit psql
\q
```

### Migrations

```bash
# Create new migration
npm run migration:create migration_name

# Run migrations
npm run migration:up

# Rollback last migration
npm run migration:down

# Check migration status
npm run migration:status
```

### Backup and Restore

```bash
# Backup database
pg_dump -U pos_user pos_db > backup_$(date +%Y%m%d).sql

# Restore database
psql -U pos_user pos_db < backup_20260112.sql

# Backup with Docker
docker-compose exec postgres pg_dump -U pos_user pos_db > backup.sql
```

---

## API Endpoints Reference

### Authentication

```bash
# Login
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password",
  "terminalId": "uuid"
}

# Logout
POST http://localhost:3000/api/v1/auth/logout
Authorization: Bearer <token>
```

### Products

```bash
# Get all products
GET http://localhost:3000/api/v1/products?page=1&limit=50

# Get product by barcode
GET http://localhost:3000/api/v1/products/barcode/1234567890

# Get product by SKU
GET http://localhost:3000/api/v1/products/sku/SKU-001

# Create product
POST http://localhost:3000/api/v1/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "sku": "SKU-001",
  "barcode": "1234567890",
  "name": "Product Name",
  "price": 19.99,
  "quantity": 100
}
```

### Transactions

```bash
# Create transaction
POST http://localhost:3000/api/v1/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "terminalId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "unitPrice": 19.99
    }
  ],
  "payments": [
    {
      "method": "cash",
      "amount": 50.00
    }
  ]
}

# Get transaction
GET http://localhost:3000/api/v1/transactions/{id}
Authorization: Bearer <token>
```

### Testing with cURL

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Get products
curl -X GET http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer <token>"
```

---

## Development Workflow

### Creating a New Feature

```bash
# 1. Create feature branch
git checkout -b feature/product-search

# 2. Make changes
# ... code changes ...

# 3. Run tests
npm test

# 4. Commit changes
git add .
git commit -m "feat: add product search functionality"

# 5. Push to remote
git push origin feature/product-search

# 6. Create pull request
# ... via GitHub/GitLab ...
```

### Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Git Commit Message Format

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: code style changes
refactor: code refactoring
test: add or update tests
chore: maintenance tasks
perf: performance improvements
```

---

## Testing Commands

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run specific test file
npm test -- products.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Frontend Tests

```bash
cd pos-client  # or admin-dashboard

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Test API endpoints
npm run test:api

# Test database
npm run test:db
```

---

## Deployment

### Docker Deployment

```bash
# Build images
docker-compose build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f backend

# Scale services
docker-compose up -d --scale backend=3
```

### Manual Deployment

```bash
# Build backend
cd backend
npm run build
npm run start:prod

# Build POS client
cd pos-client
npm run build:electron

# Build admin dashboard
cd admin-dashboard
npm run build
```

---

## Troubleshooting

### Check Service Status

```bash
# Check if services are running
docker-compose ps

# Check specific service logs
docker-compose logs backend
docker-compose logs postgres
docker-compose logs redis

# Follow logs in real-time
docker-compose logs -f
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build
```

### Clear Everything and Start Fresh

```bash
# Stop all services
docker-compose down

# Remove volumes (CAUTION: deletes all data)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Start fresh
docker-compose up --build
```

### Database Issues

```bash
# Check if PostgreSQL is running
docker-compose exec postgres pg_isready

# Connect and check tables
docker-compose exec postgres psql -U pos_user -d pos_db -c "\dt"

# Check database size
docker-compose exec postgres psql -U pos_user -d pos_db -c "SELECT pg_size_pretty(pg_database_size('pos_db'));"

# Reset database (CAUTION: deletes all data)
docker-compose down
docker volume rm pos-system_postgres_data
docker-compose up -d postgres
```

### Redis Issues

```bash
# Check Redis connection
docker-compose exec redis redis-cli ping

# Clear Redis cache
docker-compose exec redis redis-cli FLUSHALL

# Monitor Redis
docker-compose exec redis redis-cli MONITOR
```

### Port Conflicts

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env file
PORT=3001
```

### Node Modules Issues

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
```

---

## Useful SQL Queries

### Check Data

```sql
-- Count products
SELECT COUNT(*) FROM products;

-- Recent transactions
SELECT * FROM transactions
ORDER BY transaction_date DESC
LIMIT 10;

-- Sales summary today
SELECT
  COUNT(*) as transaction_count,
  SUM(total_amount) as total_sales
FROM transactions
WHERE DATE(transaction_date) = CURRENT_DATE
AND status = 'completed';

-- Low stock products
SELECT name, quantity_in_stock, reorder_level
FROM products
WHERE quantity_in_stock < reorder_level
AND is_active = true;

-- Top selling products
SELECT
  p.name,
  SUM(ti.quantity) as total_sold
FROM products p
JOIN transaction_items ti ON p.id = ti.product_id
JOIN transactions t ON ti.transaction_id = t.id
WHERE t.status = 'completed'
GROUP BY p.id, p.name
ORDER BY total_sold DESC
LIMIT 10;
```

### Maintenance Queries

```sql
-- Vacuum database
VACUUM ANALYZE;

-- Reindex
REINDEX DATABASE pos_db;

-- Check database size
SELECT
  pg_size_pretty(pg_database_size('pos_db')) as database_size;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Environment Variables Quick Reference

### Backend (.env)

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pos_db
DB_USER=pos_user
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=15m

# Square
SQUARE_APPLICATION_ID=your_app_id
SQUARE_ACCESS_TOKEN=your_token
SQUARE_ENVIRONMENT=sandbox
```

### POS Client (.env)

```bash
REACT_APP_API_URL=http://localhost:3000/api/v1
REACT_APP_WS_URL=ws://localhost:3000
REACT_APP_OFFLINE_MODE=true
```

### Admin Dashboard (.env)

```bash
REACT_APP_API_URL=http://localhost:3000/api/v1
REACT_APP_WS_URL=ws://localhost:3000
```

---

## Performance Monitoring

### Check API Performance

```bash
# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1/products

# Load test with Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/v1/products
```

### Database Performance

```sql
-- Show slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Long running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

---

## Keyboard Shortcuts (POS Client)

```
F1  - Help
F2  - Product Search
F3  - Customer Lookup
F4  - Transaction History
F5  - Refresh Products
F9  - Settings
F10 - Logout
F12 - Developer Tools

Ctrl+P - Print Receipt
Ctrl+D - Cash Drawer Open
Ctrl+S - Save Transaction (Draft)
Ctrl+Enter - Complete Transaction
Esc - Cancel/Go Back
```

---

## Useful Links

- **Architecture Documentation:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Getting Started Guide:** [GETTING_STARTED.md](./GETTING_STARTED.md)
- **Project Structure:** [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- **Square API Docs:** https://developer.squareup.com/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **React Docs:** https://react.dev/
- **Electron Docs:** https://www.electronjs.org/docs

---

## Phase Implementation Checklist

### Phase 1: Core Functionality
- [ ] Database schema implemented
- [ ] Basic API endpoints created
- [ ] Product CRUD operations
- [ ] POS client application shell
- [ ] User authentication
- [ ] Transaction processing (cash only)
- [ ] Receipt printing

### Phase 2: Payment Integration
- [ ] Square account setup
- [ ] Square SDK integration
- [ ] Card payment processing
- [ ] Multiple payment methods
- [ ] Refund functionality

### Phase 3: Admin Dashboard
- [ ] Dashboard layout
- [ ] Real-time metrics
- [ ] Sales reports
- [ ] Inventory management UI
- [ ] User management

### Phase 4: Advanced Features
- [ ] Offline mode
- [ ] Data synchronization
- [ ] Advanced analytics
- [ ] Customer loyalty

### Phase 5: Launch
- [ ] Performance optimization
- [ ] Security audit
- [ ] Production deployment
- [ ] User training
- [ ] Go live!

---

## Support Contacts

- **Technical Issues:** dev-team@yourpos.com
- **Bug Reports:** GitHub Issues
- **Feature Requests:** GitHub Issues
- **Emergency Support:** (555) 123-4567

---

**Last Updated:** 2026-01-12

*Keep this document updated as the project evolves!*
