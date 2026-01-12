# Project Structure

This document describes the organization of the POS system codebase.

## Root Directory

```
pos-system/
├── README.md                    # Project overview and quick start
├── docker-compose.yml          # Docker services configuration
├── docker-compose.prod.yml     # Production Docker configuration
├── .gitignore                  # Git ignore rules
├── .env.example                # Example environment variables
├── package.json                # Root package.json for scripts
├── docs/                       # Documentation
├── backend/                    # Backend API service
├── pos-client/                 # POS terminal desktop application
├── admin-dashboard/            # Admin web dashboard
├── scripts/                    # Utility scripts
└── infrastructure/             # Infrastructure as Code (Terraform)
```

---

## Backend Service

```
backend/
├── package.json                # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── .env                       # Environment variables (not committed)
├── .eslintrc.js              # ESLint configuration
├── .prettierrc               # Prettier configuration
├── Dockerfile                # Docker image configuration
├── src/
│   ├── server.ts             # Application entry point
│   ├── app.ts                # Express app configuration
│   ├── config/
│   │   ├── database.ts       # Database connection config
│   │   ├── redis.ts          # Redis connection config
│   │   ├── square.ts         # Square API config
│   │   └── index.ts          # Central config export
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── products.controller.ts
│   │   ├── transactions.controller.ts
│   │   ├── payments.controller.ts
│   │   ├── users.controller.ts
│   │   ├── terminals.controller.ts
│   │   └── admin.controller.ts
│   ├── models/
│   │   ├── product.model.ts
│   │   ├── transaction.model.ts
│   │   ├── payment.model.ts
│   │   ├── user.model.ts
│   │   ├── terminal.model.ts
│   │   └── category.model.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── products.service.ts
│   │   ├── transactions.service.ts
│   │   ├── payments.service.ts
│   │   ├── square.service.ts
│   │   ├── inventory.service.ts
│   │   ├── reporting.service.ts
│   │   └── sync.service.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── products.routes.ts
│   │   ├── transactions.routes.ts
│   │   ├── payments.routes.ts
│   │   ├── admin.routes.ts
│   │   └── index.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── logging.middleware.ts
│   │   └── rateLimit.middleware.ts
│   ├── validators/
│   │   ├── product.validator.ts
│   │   ├── transaction.validator.ts
│   │   └── user.validator.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── encryption.ts
│   │   ├── jwt.ts
│   │   ├── helpers.ts
│   │   └── constants.ts
│   ├── types/
│   │   ├── product.types.ts
│   │   ├── transaction.types.ts
│   │   ├── user.types.ts
│   │   ├── api.types.ts
│   │   └── index.ts
│   └── database/
│       ├── migrations/
│       │   ├── 001_initial_schema.sql
│       │   ├── 002_add_indexes.sql
│       │   └── ...
│       ├── seeds/
│       │   ├── 001_users.sql
│       │   ├── 002_categories.sql
│       │   └── ...
│       └── connection.ts
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── controllers/
│   │   └── utils/
│   ├── integration/
│   │   ├── api/
│   │   └── database/
│   ├── e2e/
│   │   └── scenarios/
│   └── setup.ts
├── logs/                      # Application logs (not committed)
└── uploads/                   # Temporary file uploads (not committed)
```

### Key Backend Files

**server.ts**
- Application entry point
- Starts HTTP server
- Initializes database connections
- Sets up error handling

**app.ts**
- Express application configuration
- Middleware setup
- Route registration
- CORS configuration

**Controllers**
- Handle HTTP requests
- Input validation
- Call services
- Return responses

**Services**
- Business logic
- Database operations
- External API calls
- Complex calculations

**Models**
- Database entity definitions
- ORM configurations
- Type definitions

**Middleware**
- Authentication
- Authorization
- Request validation
- Error handling
- Logging

---

## POS Client (Desktop Application)

```
pos-client/
├── package.json
├── tsconfig.json
├── .env
├── electron.js               # Electron main process
├── electron-preload.js       # Preload script for security
├── electron-builder.json     # Build configuration
├── public/
│   ├── index.html
│   ├── electron.html
│   └── assets/
│       ├── icons/
│       │   ├── app-icon.png
│       │   └── tray-icon.png
│       └── sounds/
│           ├── beep.mp3
│           └── error.mp3
├── src/
│   ├── index.tsx             # React entry point
│   ├── App.tsx               # Root component
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── Product/
│   │   │   ├── ProductSearch.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── ProductDetails.tsx
│   │   │   └── QuickAdd.tsx
│   │   ├── Cart/
│   │   │   ├── Cart.tsx
│   │   │   ├── CartItem.tsx
│   │   │   ├── CartSummary.tsx
│   │   │   ├── CartActions.tsx
│   │   │   └── CartEmpty.tsx
│   │   ├── Payment/
│   │   │   ├── PaymentMethod.tsx
│   │   │   ├── CashPayment.tsx
│   │   │   ├── CheckPayment.tsx
│   │   │   ├── CardPayment.tsx
│   │   │   ├── SplitPayment.tsx
│   │   │   └── PaymentSuccess.tsx
│   │   ├── Customer/
│   │   │   ├── CustomerLookup.tsx
│   │   │   ├── CustomerInfo.tsx
│   │   │   └── CustomerCreate.tsx
│   │   ├── Receipt/
│   │   │   ├── ReceiptPreview.tsx
│   │   │   ├── ReceiptTemplate.tsx
│   │   │   └── ReceiptOptions.tsx
│   │   ├── Scanner/
│   │   │   ├── BarcodeScanner.tsx
│   │   │   ├── ManualEntry.tsx
│   │   │   └── ScannerStatus.tsx
│   │   ├── Auth/
│   │   │   ├── Login.tsx
│   │   │   ├── PinEntry.tsx
│   │   │   └── SessionTimeout.tsx
│   │   ├── Transaction/
│   │   │   ├── TransactionList.tsx
│   │   │   ├── TransactionDetails.tsx
│   │   │   └── TransactionSearch.tsx
│   │   └── Common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx
│   │       ├── Loading.tsx
│   │       ├── Alert.tsx
│   │       └── Tooltip.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── POSPage.tsx           # Main POS interface
│   │   ├── TransactionHistory.tsx
│   │   ├── Settings.tsx
│   │   ├── CloseOut.tsx          # End of day
│   │   └── Help.tsx
│   ├── services/
│   │   ├── api/
│   │   │   ├── api.service.ts    # Base API client
│   │   │   ├── products.api.ts
│   │   │   ├── transactions.api.ts
│   │   │   ├── payments.api.ts
│   │   │   ├── auth.api.ts
│   │   │   └── interceptors.ts
│   │   ├── hardware/
│   │   │   ├── barcode.service.ts
│   │   │   ├── printer.service.ts
│   │   │   ├── cashdrawer.service.ts
│   │   │   └── display.service.ts
│   │   ├── offline/
│   │   │   ├── offline.service.ts
│   │   │   ├── database.service.ts
│   │   │   └── queue.service.ts
│   │   ├── sync/
│   │   │   ├── sync.service.ts
│   │   │   └── conflict.service.ts
│   │   ├── payment/
│   │   │   ├── square.service.ts
│   │   │   └── payment.service.ts
│   │   └── utils/
│   │       ├── storage.service.ts
│   │       ├── encryption.service.ts
│   │       └── logger.service.ts
│   ├── store/
│   │   ├── index.ts              # Redux store
│   │   ├── slices/
│   │   │   ├── auth.slice.ts
│   │   │   ├── products.slice.ts
│   │   │   ├── cart.slice.ts
│   │   │   ├── transactions.slice.ts
│   │   │   ├── settings.slice.ts
│   │   │   ├── ui.slice.ts
│   │   │   └── sync.slice.ts
│   │   └── middleware/
│   │       ├── offline.middleware.ts
│   │       ├── logger.middleware.ts
│   │       └── sync.middleware.ts
│   ├── hooks/
│   │   ├── useCart.ts
│   │   ├── useProducts.ts
│   │   ├── usePayment.ts
│   │   ├── useScanner.ts
│   │   ├── useOffline.ts
│   │   ├── useSync.ts
│   │   ├── useAuth.ts
│   │   └── useLocalStorage.ts
│   ├── types/
│   │   ├── product.types.ts
│   │   ├── transaction.types.ts
│   │   ├── payment.types.ts
│   │   ├── user.types.ts
│   │   ├── hardware.types.ts
│   │   └── api.types.ts
│   ├── utils/
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   ├── calculations.ts
│   │   ├── constants.ts
│   │   └── helpers.ts
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── api.config.ts
│   │   └── hardware.config.ts
│   └── styles/
│       ├── global.css
│       ├── theme.ts
│       ├── variables.css
│       └── components/
│           └── ...
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── dist/                         # Built application (not committed)
```

---

## Admin Dashboard

```
admin-dashboard/
├── package.json
├── tsconfig.json
├── .env
├── public/
│   ├── index.html
│   └── assets/
│       └── images/
├── src/
│   ├── index.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── Dashboard/
│   │   │   ├── StatCard.tsx
│   │   │   ├── SalesWidget.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   ├── TopProducts.tsx
│   │   │   └── RecentTransactions.tsx
│   │   ├── Charts/
│   │   │   ├── SalesChart.tsx
│   │   │   ├── InventoryChart.tsx
│   │   │   ├── PerformanceChart.tsx
│   │   │   └── TrendChart.tsx
│   │   ├── Tables/
│   │   │   ├── DataTable.tsx
│   │   │   ├── ExportButton.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   └── Pagination.tsx
│   │   ├── Forms/
│   │   │   ├── ProductForm.tsx
│   │   │   ├── UserForm.tsx
│   │   │   ├── CategoryForm.tsx
│   │   │   └── TerminalForm.tsx
│   │   └── Common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       ├── DatePicker.tsx
│   │       ├── Modal.tsx
│   │       └── Toast.tsx
│   ├── pages/
│   │   ├── Dashboard/
│   │   │   └── Overview.tsx
│   │   ├── Reports/
│   │   │   ├── SalesReports.tsx
│   │   │   ├── InventoryReports.tsx
│   │   │   ├── EmployeeReports.tsx
│   │   │   └── FinancialReports.tsx
│   │   ├── Inventory/
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductEdit.tsx
│   │   │   ├── Categories.tsx
│   │   │   ├── StockAdjustments.tsx
│   │   │   └── BulkImport.tsx
│   │   ├── Users/
│   │   │   ├── UserList.tsx
│   │   │   ├── UserEdit.tsx
│   │   │   └── ActivityLog.tsx
│   │   ├── Terminals/
│   │   │   ├── TerminalList.tsx
│   │   │   ├── TerminalConfig.tsx
│   │   │   └── TerminalMonitor.tsx
│   │   ├── Transactions/
│   │   │   ├── TransactionList.tsx
│   │   │   ├── TransactionDetails.tsx
│   │   │   └── RefundManagement.tsx
│   │   └── Settings/
│   │       ├── GeneralSettings.tsx
│   │       ├── PaymentSettings.tsx
│   │       ├── TaxSettings.tsx
│   │       └── SecuritySettings.tsx
│   ├── services/
│   │   ├── api.service.ts
│   │   ├── auth.service.ts
│   │   ├── reports.service.ts
│   │   └── websocket.service.ts
│   ├── store/
│   │   ├── index.ts
│   │   └── slices/
│   │       ├── auth.slice.ts
│   │       ├── products.slice.ts
│   │       ├── users.slice.ts
│   │       ├── terminals.slice.ts
│   │       └── reports.slice.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useProducts.ts
│   │   ├── useReports.ts
│   │   └── useWebSocket.ts
│   ├── types/
│   │   └── ...
│   ├── utils/
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   ├── export.ts
│   │   └── constants.ts
│   └── styles/
│       ├── global.css
│       └── theme.ts
└── tests/
    ├── unit/
    └── e2e/
```

---

## Scripts Directory

```
scripts/
├── schema.sql                    # Database schema
├── seed.sql                      # Seed data
├── migration-scripts/
│   ├── migrate-up.sh
│   └── migrate-down.sh
├── backup/
│   ├── backup-db.sh
│   └── restore-db.sh
├── deployment/
│   ├── deploy-prod.sh
│   └── deploy-staging.sh
└── utilities/
    ├── generate-mock-data.js
    └── cleanup-old-logs.sh
```

---

## Infrastructure

```
infrastructure/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── modules/
│   │   ├── vpc/
│   │   ├── alb/
│   │   ├── ecs/
│   │   ├── rds/
│   │   └── elasticache/
│   └── environments/
│       ├── dev/
│       ├── staging/
│       └── production/
├── kubernetes/
│   ├── deployments/
│   ├── services/
│   ├── configmaps/
│   └── secrets/
└── monitoring/
    ├── prometheus/
    └── grafana/
```

---

## Configuration Files

### Root Level

**.gitignore**
```
# Dependencies
node_modules/
npm-debug.log*

# Environment variables
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
*.tsbuildinfo

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Database
*.sqlite
*.db

# Uploads
uploads/
temp/
```

**package.json** (Root)
```json
{
  "name": "pos-system",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "docker-compose up",
    "dev:backend": "cd backend && npm run dev",
    "dev:pos": "cd pos-client && npm start",
    "dev:admin": "cd admin-dashboard && npm start",
    "build": "npm run build --workspaces",
    "test": "npm test --workspaces",
    "lint": "npm run lint --workspaces",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md}\""
  },
  "workspaces": [
    "backend",
    "pos-client",
    "admin-dashboard"
  ]
}
```

---

## Build Outputs

```
# Not committed to Git, generated during build

backend/dist/                 # Compiled JavaScript
pos-client/dist/             # Electron build output
admin-dashboard/build/       # React production build
```

---

## Development vs Production Structure

### Development
- Source files in `src/`
- Hot reload enabled
- Debug logging
- Local database
- Development API keys

### Production
- Compiled files in `dist/` or `build/`
- Minified and optimized
- Production logging
- Production database
- Production API keys
- Docker containers

---

## File Naming Conventions

- **React Components:** PascalCase (e.g., `ProductCard.tsx`)
- **Services:** camelCase (e.g., `authService.ts`)
- **Utils:** camelCase (e.g., `formatPrice.ts`)
- **Types:** PascalCase with `.types.ts` suffix
- **Tests:** Same name as file being tested with `.test.ts` or `.spec.ts`
- **CSS Modules:** Same name as component with `.module.css`

---

## Import Guidelines

```typescript
// React and third-party imports
import React from 'react';
import { useSelector } from 'react-redux';

// Types
import type { IProduct } from '@/types/product.types';

// Components
import { ProductCard } from '@/components/Product';

// Services
import { productService } from '@/services/products.service';

// Utils
import { formatPrice } from '@/utils/formatting';

// Styles
import styles from './ProductList.module.css';
```

---

This structure provides a scalable, maintainable organization for the entire POS system.
