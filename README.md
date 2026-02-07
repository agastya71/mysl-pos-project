# Point of Sale Application

A comprehensive, distributed Point of Sale system with centralized data management, multiple terminal support, and integrated payment processing.

## Project Overview

This POS application provides a complete retail solution with:
- **Multiple POS terminals** running on desktop computers (Windows, macOS, Linux)
- **Centralized database** for inventory, transactions, and reporting
- **Payment integration** with Square (and other processors)
- **Admin dashboard** for management and analytics
- **Offline capability** for uninterrupted service
- **Barcode/SKU scanning** for inventory tracking
- **Multiple payment methods** (cash, check, credit/debit cards)

## Documentation

- **[Architecture Document](./docs/ARCHITECTURE.md)** - Comprehensive system architecture and design
- **[Getting Started Guide](./docs/GETTING_STARTED.md)** - Setup and development instructions
- **[Project Structure](./docs/PROJECT_STRUCTURE.md)** - Code organization and folder structure

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Docker & Docker Compose (recommended)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd pos-system

# Install all dependencies (root + workspaces)
npm install --legacy-peer-deps
```

### Development

#### Option 1: Using Docker Compose (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run backend in development mode
cd backend
npm run dev

# In another terminal, run admin dashboard
cd admin-dashboard
npm start

# In another terminal, run POS client
cd pos-client
npm run electron:dev
```

#### Option 2: Individual Services

```bash
# Start all infrastructure services
docker-compose up -d

# Backend API (runs migrations and seeds automatically)
cd backend
npm run dev

# POS Terminal Client
cd pos-client
npm run electron:dev

# Admin Dashboard (accessible at http://localhost:3002)
cd admin-dashboard
npm start
```

### Default Credentials

- **Username:** admin
- **Password:** admin123

### Service URLs

- **Backend API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health
- **API Endpoints:** http://localhost:3000/api/v1
- **Admin Dashboard:** http://localhost:3002
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

## Project Status

**Current Phase:** Bootstrap Complete ✅

The project has been successfully bootstrapped with:
- ✅ Backend API service with Express/TypeScript
- ✅ PostgreSQL database with full schema (30+ tables)
- ✅ Redis for caching and sessions
- ✅ JWT authentication system
- ✅ POS Client desktop app (Electron + React)
- ✅ Admin Dashboard web app (React)
- ✅ Docker Compose orchestration
- ✅ Database migrations and seed data
- ✅ Health check endpoints
- ✅ Login/logout/token refresh functionality

**Next Steps:** Phase 1 - Core Feature Development
- Product management APIs
- POS transaction processing
- Receipt generation
- Inventory management

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed implementation roadmap.

## Tech Stack

### Backend
- **API Framework:** Node.js with Express (or Python with FastAPI)
- **Database:** PostgreSQL
- **Cache:** Redis
- **Message Queue:** RabbitMQ or Redis Pub/Sub

### POS Terminal Client
- **Framework:** Electron (cross-platform desktop)
- **UI:** React with TypeScript
- **State Management:** Redux Toolkit
- **Offline Storage:** IndexedDB (Dexie.js)

### Admin Dashboard
- **Frontend:** React with TypeScript
- **UI Components:** Material-UI
- **Charts:** Recharts or Chart.js
- **Real-time:** WebSockets (Socket.io)

### Infrastructure
- **Containerization:** Docker
- **Cloud Provider:** AWS (or Azure/GCP)
- **Monitoring:** Prometheus + Grafana
- **Logging:** ELK Stack

## Features

### Core Features (Phase 1)
- [x] System architecture designed
- [x] Database schema implemented (30+ tables)
- [x] Basic POS terminal application
- [x] User authentication and authorization
- [ ] Product catalog management
- [ ] Transaction processing (cash)
- [ ] Receipt printing

### Payment Integration (Phase 2)
- [ ] Square payment integration
- [ ] Multiple payment methods
- [ ] Refund processing
- [ ] Payment reconciliation

### Admin Dashboard (Phase 3)
- [ ] Real-time dashboard
- [ ] Sales reporting
- [ ] Inventory management
- [ ] User management
- [ ] Terminal monitoring

### Advanced Features (Phase 4)
- [ ] Offline mode support
- [ ] Data synchronization
- [ ] Advanced analytics
- [ ] Customer loyalty program
- [ ] Multi-location support

## Contributing

This is a private project. For team members:

1. Create a feature branch from `develop`
2. Make your changes following the code style guide
3. Write tests for new functionality
4. Submit a pull request for review

## Development Workflow

We follow a sprint-based development approach with 2-week sprints:

1. **Sprint Planning:** Review tasks from roadmap
2. **Daily Standups:** Quick sync on progress and blockers
3. **Development:** Feature implementation with tests
4. **Code Review:** Peer review of pull requests
5. **Sprint Review:** Demo completed features
6. **Retrospective:** Discuss improvements

## Testing

```bash
# Backend tests
cd backend
npm test

# POS Client tests
cd pos-client
npm test

# Admin Dashboard tests
cd admin-dashboard
npm test

# E2E tests
npm run test:e2e
```

## Deployment

See [ARCHITECTURE.md - Deployment Section](./docs/ARCHITECTURE.md#deployment-architecture) for detailed deployment instructions.

### Quick Deploy (Production)

```bash
# Build and deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# Or use CI/CD pipeline (GitHub Actions)
git push origin main
```

## Support

- **Technical Issues:** Create an issue in the project repository
- **Questions:** Contact the development team
- **Documentation:** See `/docs` folder

## License

Proprietary - All rights reserved

## Roadmap

- **Q1 2026:** Phase 1 - Core Functionality
- **Q2 2026:** Phase 2 - Payment Integration
- **Q3 2026:** Phase 3 - Admin Dashboard
- **Q4 2026:** Phase 4 - Advanced Features
- **Q1 2027:** Phase 5 - Optimization & Launch

See [ARCHITECTURE.md - Implementation Roadmap](./docs/ARCHITECTURE.md#implementation-roadmap) for detailed timeline.

---

**Last Updated:** 2026-01-12
