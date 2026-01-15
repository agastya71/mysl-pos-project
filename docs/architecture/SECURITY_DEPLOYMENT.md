# Security & Deployment Architecture

**Part of:** [POS System Architecture](../ARCHITECTURE.md)
**Version:** 2.0
**Last Updated:** 2026-01-13

## Overview

This document outlines security requirements, deployment architectures, and infrastructure considerations for the POS system. It covers authentication, authorization, data protection, network security, and various deployment options (cloud, on-premise, hybrid).

---

## Table of Contents

- [Authentication & Authorization](#authentication--authorization)
- [Data Security](#data-security)
- [API Security](#api-security)
- [Network Security](#network-security)
- [Audit Logging](#audit-logging)
- [Deployment Architectures](#deployment-architectures)
- [Infrastructure as Code](#infrastructure-as-code)
- [Scalability](#scalability-considerations)
- [Monitoring & Observability](#monitoring--observability)
- [Disaster Recovery](#disaster-recovery)

---

## Authentication & Authorization

### JWT Implementation

The system uses JSON Web Tokens (JWT) for stateless authentication.

**Token Structure:**
```typescript
{
    userId: 'uuid',
    username: 'string',
    email: 'string',
    role: 'cashier' | 'manager' | 'admin',
    terminalId: 'uuid',
    permissions: string[],
    iat: timestamp,      // Issued at
    exp: timestamp       // Expiration
}
```

**Token Expiration:**
- **Access Token:** 15 minutes
- **Refresh Token:** 7 days
- **Terminal Token:** 24 hours (for POS terminals)

**Token Storage:**
- **Server:** Redis (for blacklisting/revocation)
- **Client:** Secure HTTP-only cookies (web)
- **POS Terminal:** Encrypted local storage

### Role-Based Access Control (RBAC)

**Permission Structure:**
```typescript
const PERMISSIONS = {
    CASHIER: [
        'transaction.create',
        'transaction.view',
        'product.view',
        'customer.view',
        'payment.process'
    ],
    MANAGER: [
        ...CASHIER,
        'transaction.void',
        'transaction.refund',
        'inventory.adjust',
        'inventory.count',
        'reports.view',
        'user.view',
        'vendor.view'
    ],
    ADMIN: [
        ...MANAGER,
        'product.create',
        'product.edit',
        'product.delete',
        'user.create',
        'user.edit',
        'user.delete',
        'vendor.create',
        'vendor.edit',
        'purchase_order.approve',
        'terminal.manage',
        'settings.edit',
        'system.configure'
    ]
};
```

**Permission Enforcement:**
```typescript
// Middleware example
function requirePermission(permission: string) {
    return (req, res, next) => {
        const user = req.user; // From JWT
        if (!user.permissions.includes(permission)) {
            return res.status(403).json({
                error: 'Insufficient permissions'
            });
        }
        next();
    };
}

// Usage
app.post('/api/v1/products',
    authenticate,
    requirePermission('product.create'),
    createProduct
);
```

### Multi-Factor Authentication (Optional)

For admin users, optional MFA via:
- **Time-based One-Time Passwords (TOTP)** - Google Authenticator, Authy
- **SMS** - Twilio integration
- **Email** - Verification codes

### Password Security

**Requirements:**
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Cannot be same as last 5 passwords

**Hashing:**
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// Hash password
const hash = await bcrypt.hash(password, SALT_ROUNDS);

// Verify password
const isValid = await bcrypt.compare(password, hash);
```

---

## Data Security

### Encryption at Rest

**Database Encryption:**
- PostgreSQL Transparent Data Encryption (TDE) or pgcrypto extension
- Full disk encryption on local server (BitLocker for Windows, FileVault for Mac, LUKS for Linux)
- Encrypted storage volumes for database files

**Sensitive Fields:**
Fields requiring application-level encryption:
- `vendors.tax_id` (SSN/EIN)
- `vendors.account_number`
- `vendors.routing_number`
- `payment_details.card_last_four`
- `users.password_hash` (already hashed)

**Encryption Implementation:**
```typescript
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const keyLength = 32;

function encrypt(text: string, key: Buffer): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
}

function decrypt(encryptedData: EncryptedData, key: Buffer): string {
    const decipher = crypto.createDecipheriv(
        algorithm,
        key,
        Buffer.from(encryptedData.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
```

### Encryption in Transit

**TLS Configuration:**
- TLS 1.3 (preferred) or TLS 1.2 (minimum)
- Strong cipher suites only
- Perfect Forward Secrecy (PFS)
- HSTS headers enabled

**Certificate Management:**
- Let's Encrypt for free SSL certificates
- Auto-renewal via certbot
- Certificate pinning for mobile apps (optional)

### PCI DSS Compliance

The system delegates payment processing to Square, which is PCI Level 1 certified.

**Compliance Requirements:**
- Never store full credit card numbers
- Never store CVV/CVC codes
- Tokenize all payment methods via Square
- Secure key management (AWS KMS or HashiCorp Vault)
- Regular security audits
- Encrypted logging (no sensitive data)

**Tokenization Flow:**
```
Customer Card → Square Terminal → Tokenized
                                      ↓
                            Store token only in database
                            (Never store raw card data)
```

### Data Backup & Retention

**Backup Schedule:**
- **Database:** Daily full + hourly incrementals to local NAS or external drive
- **File Storage:** Daily backups to secondary local storage or NAS
- **Audit Logs:** Continuous archival to local storage

**Retention Policies:**
- Transactions: 7 years (tax/audit requirements)
- Audit logs: 7 years
- Backups: 90 days online, 7 years in cold storage
- Session logs: 30 days

---

## API Security

### Rate Limiting

Protect against abuse and DDoS attacks:

```typescript
const rateLimits = {
    login: {
        windowMs: 15 * 60 * 1000,  // 15 minutes
        max: 5,                      // 5 attempts
        message: 'Too many login attempts'
    },
    api: {
        windowMs: 60 * 1000,        // 1 minute
        max: 100,                    // 100 requests
        message: 'Too many requests'
    },
    payment: {
        windowMs: 60 * 1000,        // 1 minute
        max: 10,                     // 10 payments
        message: 'Too many payment requests'
    },
    bulkImport: {
        windowMs: 60 * 1000,        // 1 minute
        max: 5,                      // 5 imports
        message: 'Too many import requests'
    }
};
```

**Implementation:**
```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit(rateLimits.login);
app.post('/api/v1/auth/login', loginLimiter, loginHandler);
```

### Input Validation & Sanitization

**Validation Library:** Use joi, yup, or zod

```typescript
import Joi from 'joi';

const productSchema = Joi.object({
    sku: Joi.string().max(100).required(),
    name: Joi.string().max(255).required(),
    basePrice: Joi.number().min(0).required(),
    quantity: Joi.number().integer().min(0).required()
});

// Validate request
const { error, value } = productSchema.validate(req.body);
if (error) {
    return res.status(400).json({ error: error.details });
}
```

**Sanitization:**
- Strip HTML tags from text fields
- Remove special characters from SKUs
- Validate email formats
- Validate phone number formats
- Escape SQL parameters (use parameterized queries)

### SQL Injection Prevention

**Always use parameterized queries:**
```typescript
// ✅ GOOD - Parameterized query
const result = await db.query(
    'SELECT * FROM products WHERE sku = $1',
    [sku]
);

// ❌ BAD - String concatenation
const result = await db.query(
    `SELECT * FROM products WHERE sku = '${sku}'`
);
```

### XSS Prevention

**Output Encoding:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize HTML input
const clean = DOMPurify.sanitize(userInput);
```

**Content Security Policy (CSP):**
```typescript
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.squareup.com"]
    }
}));
```

### CORS Configuration

```typescript
const corsOptions = {
    origin: [
        'https://admin.yourpos.com',
        'https://yourpos.com'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

---

## Network Security

### Firewall Rules

**Allowed Ports:**
- **443 (HTTPS)** - API access
- **22 (SSH)** - Admin access only (VPN required)
- **5432 (PostgreSQL)** - Database access (internal only)
- **6379 (Redis)** - Cache access (internal only)

**Denied:**
- All other inbound traffic

### IP Whitelisting (Optional)

For POS terminals:
```typescript
const allowedIPs = [
    '192.168.1.0/24',    // Office network
    '10.0.0.0/16',        // Store locations
    '203.0.113.0/24'      // Specific vendor IPs
];

function ipWhitelist(req, res, next) {
    const clientIP = req.ip;
    if (!isIPAllowed(clientIP, allowedIPs)) {
        return res.status(403).json({
            error: 'Access denied from this IP'
        });
    }
    next();
}
```

### VPN Access

For remote administration:
- **OpenVPN** or **WireGuard**
- MFA required for VPN connection
- Time-limited access tokens

### DDoS Protection

**Local Network Protection:**
- Firewall rules on local server and router
- Rate limiting at application level
- Network intrusion detection system (IDS) like Snort or Suricata (optional)
- Restrict external access - system should only be accessible on local network
- VPN required for any remote administration
- Monitor for unusual traffic patterns

---

## Audit Logging

### Logged Events

All sensitive operations are logged:

```typescript
const auditEvents = [
    // Authentication
    'user.login.success',
    'user.login.failure',
    'user.logout',
    'token.refresh',

    // Transactions
    'transaction.create',
    'transaction.complete',
    'transaction.void',
    'transaction.refund',

    // Inventory
    'inventory.adjustment',
    'inventory.count.start',
    'inventory.count.complete',
    'inventory.reconciliation',

    // User Management
    'user.create',
    'user.update',
    'user.delete',
    'user.role.change',

    // Settings
    'settings.update',
    'terminal.register',
    'terminal.deactivate',

    // Payments
    'payment.process',
    'payment.refund',
    'payment.failure',

    // Vendor Management
    'vendor.create',
    'vendor.update',
    'purchase_order.create',
    'purchase_order.approve',
    'donation.receive',
    'donation.receipt.generate'
];
```

### Audit Log Structure

```typescript
interface AuditLog {
    id: string;
    timestamp: Date;
    userId: string;
    username: string;
    action: string;
    entityType: string;      // 'transaction', 'product', 'user', etc.
    entityId: string;
    oldValues: object | null;
    newValues: object | null;
    ipAddress: string;
    userAgent: string;
    terminalId: string | null;
    success: boolean;
    errorMessage: string | null;
}
```

### Log Retention

- **Standard logs:** 30 days online, 1 year archived
- **Audit logs:** 7 years (compliance requirement)
- **Security logs:** 1 year
- **Performance logs:** 90 days

### Log Analysis

Tools:
- **ELK Stack** (Elasticsearch, Logstash, Kibana) - self-hosted on local server
- **Graylog** - self-hosted alternative to ELK
- **Simple file-based logging** with log rotation
- **Sentry** (self-hosted) for error tracking
- **Grafana Loki** - lightweight log aggregation (self-hosted)

---

## Deployment Architectures

### Local Server Deployment (Recommended)

**Architecture Diagram:**
```
┌──────────────────────────────────────────────────────┐
│              LOCAL NETWORK (192.168.x.x)             │
│                                                       │
│  ┌────────────────────────────────────────────────┐ │
│  │          LOCAL SERVER (Win/Mac/Linux)          │ │
│  │                                                 │ │
│  │  ┌──────────────────────────────────────────┐ │ │
│  │  │     Application Layer (Docker/Native)    │ │ │
│  │  │  ┌────────────┐    ┌────────────┐       │ │ │
│  │  │  │  POS API   │    │  Admin API │       │ │ │
│  │  │  │  Service   │    │  Service   │       │ │ │
│  │  │  │  (Node.js) │    │  (Node.js) │       │ │ │
│  │  │  └────────────┘    └────────────┘       │ │ │
│  │  └──────────────────────────────────────────┘ │ │
│  │                                                 │ │
│  │  ┌──────────────────────────────────────────┐ │ │
│  │  │            Data Layer                    │ │ │
│  │  │  ┌────────────┐    ┌────────────┐       │ │ │
│  │  │  │PostgreSQL  │    │   Redis    │       │ │ │
│  │  │  │  Database  │    │   Cache    │       │ │ │
│  │  │  └────────────┘    └────────────┘       │ │ │
│  │  │  ┌────────────┐    ┌────────────┐       │ │ │
│  │  │  │ RabbitMQ   │    │   Local    │       │ │ │
│  │  │  │   Queue    │    │  Storage   │       │ │ │
│  │  │  └────────────┘    └────────────┘       │ │ │
│  │  └──────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────┘ │
│                        ↑                             │
│                        │                             │
│  ┌─────────────────────┴──────────────────────────┐ │
│  │          POS Terminals (Win/Mac Laptops)       │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐      │ │
│  │  │Terminal 1│ │Terminal 2│ │Terminal N│      │ │
│  │  │(Electron)│ │(Electron)│ │(Electron)│      │ │
│  │  └──────────┘ └──────────┘ └──────────┘      │ │
│  └────────────────────────────────────────────────┘ │
│                                                       │
│  ┌────────────────────────────────────────────────┐ │
│  │     Admin Workstation (Any PC on network)     │ │
│  │        Access admin dashboard via browser      │ │
│  └────────────────────────────────────────────────┘ │
│                                                       │
│  ┌────────────────────────────────────────────────┐ │
│  │   Backup Storage (NAS or External Drive)      │ │
│  │   - Database backups                           │ │
│  │   - File backups                               │ │
│  │   - Audit logs                                 │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
              ↓ (Internet - only for payments)
┌──────────────────────────────────────────────────────┐
│          External Payment Services (Optional)        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │   Square   │  │   Stripe   │  │   PayPal   │    │
│  └────────────┘  └────────────┘  └────────────┘    │
└──────────────────────────────────────────────────────┘
```

**Components:**
- **Local Server:** Dedicated server machine running all backend services
- **PostgreSQL:** Self-hosted database on local server
- **Redis:** Self-hosted cache on local server
- **RabbitMQ:** Self-hosted message queue on local server
- **File Storage:** Local file system or mounted NAS
- **Backup Storage:** NAS, external drives, or dedicated backup server
- **Network:** Local Ethernet/WiFi network (isolated from internet if desired)

### High-Availability On-Premise Deployment (Optional)

**For larger deployments requiring redundancy:**
```
┌──────────────────────────────────────────┐
│          Nginx Load Balancer             │
│          (with backup server)            │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│        Application Servers (2+)          │
│        - Docker containers               │
│        - Service replication             │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│      PostgreSQL with Replication         │
│      (Primary + Standby with pg_pool)    │
└──────────────────────────────────────────┘
```

**Requirements:**
- 2+ application servers for redundancy
- PostgreSQL with streaming replication (primary + standby)
- Redis cluster (3 nodes) or Redis Sentinel for failover
- Load balancer (Nginx)
- Shared storage (NAS or SAN)
- Dedicated backup server or NAS
- Monitoring server (Prometheus + Grafana)

### Single-Server Deployment (Small Deployments)

**For small businesses or single location:**
- Single server running all services (API, PostgreSQL, Redis, RabbitMQ)
- POS terminals connect directly to server
- Regular backups to external storage
- UPS for power protection
- Simpler to manage but no high availability

---

## Infrastructure as Code

### Ansible Configuration (Recommended for Local Deployment)

```
ansible/
├── inventory/
│   ├── production.yml     # Production servers
│   ├── staging.yml        # Staging servers
│   └── development.yml    # Development servers
├── playbooks/
│   ├── setup_server.yml   # Initial server setup
│   ├── deploy_app.yml     # Application deployment
│   ├── backup.yml         # Backup configuration
│   └── monitoring.yml     # Monitoring setup
├── roles/
│   ├── postgresql/        # PostgreSQL installation
│   ├── redis/             # Redis installation
│   ├── rabbitmq/          # RabbitMQ installation
│   ├── nodejs/            # Node.js installation
│   ├── nginx/             # Nginx configuration
│   └── backup/            # Backup scripts
└── group_vars/
    ├── all.yml            # Common variables
    └── production.yml     # Production variables
```

### Docker Configuration

**API Service Dockerfile:**
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js
CMD ["node", "dist/server.js"]
```

**Docker Compose (Development):**
```yaml
version: '3.8'

services:
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/pos
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=pos
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## Scalability Considerations

### Horizontal Scaling

**Application Layer:**
- Stateless services (scale infinitely)
- Auto-scaling based on:
  - CPU utilization > 70%
  - Memory utilization > 80%
  - Request count > 1000/min per instance
- Load balancer distributes traffic

**Database Layer:**
- Read replicas for reporting
- Connection pooling (PgBouncer)
- Query optimization
- Table partitioning

### Caching Strategy

**Multi-Level Caching:**
```typescript
// L1: Application memory (fast, small)
const appCache = new NodeCache({ stdTTL: 300 });

// L2: Redis (fast, larger)
const redisCache = new Redis({ host: 'localhost', port: 6379 });

// Cache hierarchy
async function getProduct(id: string) {
    // Check L1
    let product = appCache.get(id);
    if (product) return product;

    // Check L2
    product = await redisCache.get(`product:${id}`);
    if (product) {
        appCache.set(id, product);
        return JSON.parse(product);
    }

    // Fetch from database
    product = await db.products.findById(id);
    await redisCache.setex(`product:${id}`, 900, JSON.stringify(product));
    appCache.set(id, product);

    return product;
}
```

### Database Optimization

**Indexing:**
```sql
-- Transaction lookups
CREATE INDEX CONCURRENTLY idx_transactions_date_terminal
    ON transactions(transaction_date, terminal_id)
    WHERE status = 'completed';

-- Full-text search
CREATE INDEX CONCURRENTLY idx_products_search
    ON products USING gin(to_tsvector('english', name || ' ' || description));

-- Covering index
CREATE INDEX CONCURRENTLY idx_products_active_price
    ON products(is_active, base_price)
    INCLUDE (name, sku);
```

**Partitioning:**
```sql
-- Partition transactions by month
CREATE TABLE transactions_2026_01 PARTITION OF transactions
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

### Performance Targets

```
API Response Times:
- Product lookup:         < 50ms (95th percentile)
- Transaction creation:   < 200ms (95th percentile)
- Payment processing:     < 3s (depends on Square)
- Simple reports:         < 5s
- Complex reports:        < 30s

System Capacity:
- Transactions/hour/terminal: 100+
- Concurrent terminals:        1000+
- Database connections:        500+ (with pooling)
- API requests/second:         1000+
```

---

## Monitoring & Observability

### Metrics to Track

**Application Metrics:**
- Request rate
- Response time (p50, p95, p99)
- Error rate
- Active users/terminals
- Queue depth (for async jobs)

**Database Metrics:**
- Query execution time
- Connection pool usage
- Cache hit rate
- Replication lag
- Disk usage

**Business Metrics:**
- Transactions per hour
- Average transaction value
- Payment success rate
- Inventory turnover

### Monitoring Stack

**Recommended: Prometheus + Grafana (Self-Hosted)**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['localhost:3000']
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']  # postgres_exporter
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']  # redis_exporter
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']  # node_exporter
```

**Docker Compose for Monitoring:**
```yaml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=changeme
```

### Alerting Rules

**Critical Alerts:**
- API error rate > 5%
- Database connection failure
- Payment processor down
- Disk space < 10%
- Memory usage > 90%

**Warning Alerts:**
- API response time > 500ms
- Database replication lag > 60s
- Queue depth > 1000
- CPU usage > 80%

---

## Disaster Recovery

### RTO & RPO Targets

- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 15 minutes

### Backup Strategy

**Database:**
- Full backup: Daily at 2 AM to local NAS/external drive
- Incremental backup: Every 6 hours
- WAL archiving: Continuous to backup storage
- Retention: 90 days online, longer in cold storage
- Off-site backup: Weekly to external location or cloud backup service

**Application:**
- Docker images: Versioned in local registry or Docker Hub
- Configuration: Git repository (self-hosted or GitHub)
- Secrets: HashiCorp Vault (self-hosted) or encrypted configuration files
- File storage: Daily sync to backup NAS

### Failover Procedures

1. **Database Failover:**
   - Promote standby replica to primary (if using replication)
   - Update connection strings in application configuration
   - Verify data integrity
   - Redirect application to new primary database

2. **Server Failover:**
   - Switch to backup server (if available in HA setup)
   - Restore from latest backup if primary server fails
   - Update network configuration to point to backup server
   - Verify all services are running

3. **Terminal Offline Mode:**
   - Terminals automatically switch to local SQLite cache when server is unreachable
   - Queue transactions locally in IndexedDB
   - Continue basic operations (cash transactions, product lookup from cache)
   - Auto-sync when connection restored

4. **Network Failure:**
   - Terminals continue operating in offline mode
   - Investigate network issues (router, switch, cables)
   - Restore network connectivity
   - Verify synchronization of queued transactions

---

## Related Documents

- [Main Architecture](../ARCHITECTURE.md) - System overview
- [Data Model](DATA_MODEL.md) - Database schema
- [API Endpoints](API_ENDPOINTS.md) - API specifications
- [Implementation Roadmap](IMPLEMENTATION.md) - Deployment guide

---

**Document Version:** 2.0
**Last Updated:** 2026-01-13
**Maintained By:** DevOps & Security Team
