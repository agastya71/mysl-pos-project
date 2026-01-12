# Getting Started Guide

This guide will help you set up your development environment and start building the POS application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Setup](#database-setup)
4. [Development Environment](#development-environment)
5. [Project Structure](#project-structure)
6. [Development Workflow](#development-workflow)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **Node.js** (v18 or later)
   ```bash
   # Check version
   node --version

   # Install from https://nodejs.org/
   # Or use nvm (recommended)
   nvm install 18
   nvm use 18
   ```

2. **PostgreSQL** (v15 or later)
   ```bash
   # macOS (using Homebrew)
   brew install postgresql@15
   brew services start postgresql@15

   # Ubuntu/Debian
   sudo apt install postgresql-15

   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

3. **Redis** (v7 or later)
   ```bash
   # macOS
   brew install redis
   brew services start redis

   # Ubuntu/Debian
   sudo apt install redis-server

   # Windows
   # Download from https://redis.io/download
   ```

4. **Git**
   ```bash
   git --version
   # Install from https://git-scm.com/
   ```

5. **Docker & Docker Compose** (Optional but recommended)
   ```bash
   docker --version
   docker-compose --version
   # Install from https://www.docker.com/
   ```

### Development Tools

- **Code Editor:** VS Code (recommended) with extensions:
  - ESLint
  - Prettier
  - Docker
  - PostgreSQL
  - GitLens

- **API Testing:** Postman or Insomnia
- **Database Client:** pgAdmin, DBeaver, or TablePlus

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd pos-system
```

### 2. Project Structure Setup

Create the initial project structure:

```bash
# Create main directories
mkdir -p backend/{src,tests,config}
mkdir -p pos-client/{src,public,tests}
mkdir -p admin-dashboard/{src,public,tests}
mkdir -p docs
mkdir -p scripts

echo "Project structure created successfully!"
```

### 3. Environment Variables

Create environment files for each component:

**Backend (.env)**
```bash
cd backend
cat > .env << EOF
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pos_db
DB_USER=pos_user
DB_PASSWORD=your_password_here

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your_jwt_secret_here_change_in_production
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Square Configuration
SQUARE_APPLICATION_ID=your_square_app_id
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_ENVIRONMENT=sandbox

# CORS Configuration
CORS_ORIGIN=http://localhost:3001,http://localhost:3002

# File Upload
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=debug
EOF
```

**POS Client (.env)**
```bash
cd ../pos-client
cat > .env << EOF
# API Configuration
REACT_APP_API_URL=http://localhost:3000/api/v1
REACT_APP_WS_URL=ws://localhost:3000

# Application Configuration
REACT_APP_NAME=POS Terminal
REACT_APP_VERSION=1.0.0

# Feature Flags
REACT_APP_OFFLINE_MODE=true
REACT_APP_DEBUG_MODE=true
EOF
```

**Admin Dashboard (.env)**
```bash
cd ../admin-dashboard
cat > .env << EOF
# API Configuration
REACT_APP_API_URL=http://localhost:3000/api/v1
REACT_APP_WS_URL=ws://localhost:3000

# Application Configuration
REACT_APP_NAME=POS Admin Dashboard
REACT_APP_VERSION=1.0.0
EOF
```

---

## Database Setup

### 1. Create Database and User

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE pos_db;
CREATE USER pos_user WITH ENCRYPTED PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE pos_db TO pos_user;

# Exit psql
\q
```

### 2. Run Database Migrations

```bash
cd backend

# Install database migration tool (if using Node.js)
npm install -g db-migrate db-migrate-pg

# Or create initial schema manually
psql -U pos_user -d pos_db -f scripts/schema.sql
```

### 3. Seed Initial Data

```bash
# Create seed script
cd scripts
cat > seed.sql << EOF
-- Insert default admin user
INSERT INTO users (id, username, email, password_hash, first_name, last_name, role, is_active)
VALUES (
    gen_random_uuid(),
    'admin',
    'admin@yourpos.com',
    '\$2b\$10\$YourHashedPasswordHere', -- Change this!
    'Admin',
    'User',
    'admin',
    true
);

-- Insert default terminal
INSERT INTO terminals (id, terminal_name, terminal_number, location, is_active)
VALUES (
    gen_random_uuid(),
    'Terminal 1',
    1,
    'Main Store',
    true
);

-- Insert sample categories
INSERT INTO categories (id, name, description, is_active)
VALUES
    (gen_random_uuid(), 'Electronics', 'Electronic devices and accessories', true),
    (gen_random_uuid(), 'Clothing', 'Apparel and accessories', true),
    (gen_random_uuid(), 'Food & Beverage', 'Food and drinks', true);

-- Insert sample products (optional for testing)
-- Add more seed data as needed
EOF

# Run seed script
psql -U pos_user -d pos_db -f seed.sql
```

---

## Development Environment

### Option 1: Docker Compose (Recommended)

Create a `docker-compose.yml` file in the root directory:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pos_db
      POSTGRES_USER: pos_user
      POSTGRES_PASSWORD: your_password_here
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./scripts/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run dev

  pos-client:
    build: ./pos-client
    ports:
      - "3001:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:3000/api/v1
    volumes:
      - ./pos-client:/app
      - /app/node_modules
    command: npm start

  admin-dashboard:
    build: ./admin-dashboard
    ports:
      - "3002:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:3000/api/v1
    volumes:
      - ./admin-dashboard:/app
      - /app/node_modules
    command: npm start

volumes:
  postgres_data:
  redis_data:
```

Start all services:
```bash
docker-compose up
```

### Option 2: Manual Setup

Run each component separately:

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run dev
# Server will run on http://localhost:3000
```

**Terminal 2 - POS Client:**
```bash
cd pos-client
npm install
npm start
# Client will run on http://localhost:3001
```

**Terminal 3 - Admin Dashboard:**
```bash
cd admin-dashboard
npm install
npm start
# Dashboard will run on http://localhost:3002
```

---

## Project Structure

After initial setup, your project should look like this:

```
pos-system/
├── README.md
├── docker-compose.yml
├── .gitignore
├── docs/
│   ├── ARCHITECTURE.md
│   ├── GETTING_STARTED.md
│   └── PROJECT_STRUCTURE.md
├── backend/
│   ├── package.json
│   ├── .env
│   ├── src/
│   ├── tests/
│   └── config/
├── pos-client/
│   ├── package.json
│   ├── .env
│   ├── public/
│   ├── src/
│   └── tests/
├── admin-dashboard/
│   ├── package.json
│   ├── .env
│   ├── public/
│   ├── src/
│   └── tests/
└── scripts/
    ├── schema.sql
    ├── seed.sql
    └── migration-scripts/
```

---

## Development Workflow

### 1. Create a New Feature

```bash
# Create feature branch
git checkout -b feature/product-management

# Make changes
# ... code changes ...

# Commit changes
git add .
git commit -m "feat: add product CRUD operations"

# Push to remote
git push origin feature/product-management

# Create pull request on GitHub/GitLab
```

### 2. Code Style

Follow these conventions:

**JavaScript/TypeScript:**
- Use ESLint and Prettier
- 2 spaces for indentation
- Use TypeScript strict mode
- Use meaningful variable names

**SQL:**
- Use lowercase for keywords
- Use snake_case for table and column names
- Always use explicit column names in SELECT

**Git Commits:**
- Use conventional commits format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `refactor:` for code refactoring
  - `test:` for tests
  - `chore:` for maintenance

### 3. Database Changes

```bash
# Create migration
npm run migration:create add_products_table

# Edit migration file
# ... add schema changes ...

# Run migration
npm run migration:up

# Rollback if needed
npm run migration:down
```

---

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- products.test.js

# Watch mode
npm run test:watch
```

### Frontend Tests

```bash
cd pos-client  # or admin-dashboard

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Integration Tests

```bash
# Run full integration test suite
npm run test:integration

# Test database connections
npm run test:db

# Test API endpoints
npm run test:api
```

---

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check if PostgreSQL is running
pg_isready

# Check connection
psql -U pos_user -d pos_db -c "SELECT 1;"

# Reset database (caution: deletes all data)
dropdb pos_db
createdb pos_db
psql -U pos_user -d pos_db -f scripts/schema.sql
```

#### Redis Connection Issues

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Restart Redis
# macOS
brew services restart redis

# Linux
sudo systemctl restart redis
```

#### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env file
PORT=3001
```

#### Node Modules Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
```

#### Docker Issues

```bash
# Stop all containers
docker-compose down

# Remove volumes and restart
docker-compose down -v
docker-compose up --build

# View logs
docker-compose logs backend
docker-compose logs -f  # Follow logs
```

### Getting Help

1. **Check Documentation:**
   - Read [ARCHITECTURE.md](./ARCHITECTURE.md)
   - Review code comments
   - Check API documentation

2. **Check Logs:**
   ```bash
   # Backend logs
   tail -f backend/logs/app.log

   # Docker logs
   docker-compose logs -f
   ```

3. **Debug Mode:**
   - Set `LOG_LEVEL=debug` in .env
   - Use debugger in VS Code
   - Add console.log statements

4. **Ask for Help:**
   - Create an issue in the repository
   - Contact team members
   - Check Stack Overflow

---

## Next Steps

1. **Complete Phase 1 Setup:**
   - [ ] Verify all services are running
   - [ ] Test database connection
   - [ ] Create first API endpoint
   - [ ] Create first UI component

2. **Start Development:**
   - Review [ARCHITECTURE.md](./ARCHITECTURE.md) for implementation details
   - Pick a task from the roadmap
   - Create a feature branch
   - Start coding!

3. **Learn the Stack:**
   - PostgreSQL documentation
   - Express.js or FastAPI tutorials
   - React and TypeScript guides
   - Electron documentation

---

**Happy Coding!**

For questions or issues, contact the development team.
