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
- PostgreSQL Transparent Data Encryption (TDE)
- AWS RDS encryption enabled
- Encrypted EBS volumes for database storage

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
- **Database:** Daily full + hourly incrementals
- **File Storage:** Daily backups to S3 Glacier
- **Audit Logs:** Continuous archival

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

**CloudFlare Protection:**
- WAF (Web Application Firewall)
- Rate limiting at edge
- Bot detection
- Challenge pages for suspicious traffic

**AWS Shield:**
- Standard (free) - Basic DDoS protection
- Advanced (paid) - Enhanced protection + support

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
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **CloudWatch** Logs (AWS)
- **Datadog** or **New Relic**
- **Sentry** for error tracking

---

## Deployment Architectures

### Cloud Deployment (AWS)

**Architecture Diagram:**
```
┌──────────────────────────────────────────────────────┐
│                    Route 53 (DNS)                     │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│            CloudFront (CDN) / WAF                     │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│        Application Load Balancer (ALB)               │
│        - SSL Termination                              │
│        - Health Checks                                │
│        - Auto-scaling triggers                        │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│           ECS/EKS Cluster (Application Layer)        │
│  ┌────────────────┐  ┌────────────────┐             │
│  │  API Service   │  │ Admin Service  │             │
│  │  (Auto-scaled) │  │  (Auto-scaled) │             │
│  │  2-10 instances│  │  1-3 instances │             │
│  └────────────────┘  └────────────────┘             │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│                   Data Layer                          │
│  ┌────────────────┐  ┌────────────────┐             │
│  │ RDS PostgreSQL │  │ ElastiCache    │             │
│  │ - Multi-AZ     │  │ Redis          │             │
│  │ - Read Replica │  │ - Replication  │             │
│  └────────────────┘  └────────────────┘             │
│  ┌────────────────┐  ┌────────────────┐             │
│  │  S3 Storage    │  │  SQS Queues    │             │
│  │  - Receipts    │  │  - Async Jobs  │             │
│  │  - Reports     │  │  - Imports     │             │
│  └────────────────┘  └────────────────┘             │
└──────────────────────────────────────────────────────┘
```

**Services Used:**
- **Route 53:** DNS management
- **CloudFront:** CDN + caching
- **WAF:** Web Application Firewall
- **ALB:** Load balancing
- **ECS/EKS:** Container orchestration
- **RDS:** Managed PostgreSQL
- **ElastiCache:** Managed Redis
- **S3:** Object storage
- **SQS:** Message queuing
- **CloudWatch:** Monitoring & logging

### On-Premise Deployment

**Architecture:**
```
┌──────────────────────────────────────────┐
│          HAProxy Load Balancer           │
│          (2 instances, keepalived)       │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│        Application Servers (3+)          │
│        - Docker containers               │
│        - Nginx reverse proxy             │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│      PostgreSQL Cluster (Primary +        │
│      2 replicas with pgpool)             │
└──────────────────────────────────────────┘
```

**Requirements:**
- Minimum 3 application servers
- PostgreSQL cluster (primary + 2 replicas)
- Redis cluster (3 nodes)
- Load balancer (HAProxy or Nginx)
- Shared storage (NFS or similar)
- Backup server
- Monitoring server (Prometheus + Grafana)

### Hybrid Deployment

**Scenario:** Cloud backend + On-premise terminals

- **Cloud:** Database, API services
- **On-premise:** POS terminals with local caching
- **Sync:** Periodic synchronization
- **Failover:** Local SQLite for offline mode

---

## Infrastructure as Code

### Terraform Structure

```
terraform/
├── main.tf                 # Main configuration
├── variables.tf            # Variable definitions
├── outputs.tf              # Output values
├── provider.tf             # Provider configuration
├── backend.tf              # State backend configuration
├── modules/
│   ├── vpc/               # VPC, subnets, routing
│   ├── alb/               # Application Load Balancer
│   ├── ecs/               # ECS cluster & services
│   ├── rds/               # RDS PostgreSQL
│   ├── elasticache/       # Redis cluster
│   ├── s3/                # S3 buckets
│   ├── cloudfront/        # CDN configuration
│   └── iam/               # IAM roles & policies
└── environments/
    ├── dev/               # Development environment
    ├── staging/           # Staging environment
    └── production/        # Production environment
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

**Option 1: Prometheus + Grafana**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['api:3000']
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
```

**Option 2: Datadog**
```typescript
import { StatsD } from 'hot-shots';

const statsd = new StatsD({ host: 'localhost', port: 8125 });

// Track metrics
statsd.increment('api.requests');
statsd.timing('api.response_time', responseTime);
statsd.gauge('api.active_connections', activeConnections);
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
- Full backup: Daily at 2 AM
- Incremental backup: Every hour
- WAL archiving: Continuous
- Retention: 90 days

**Application:**
- Docker images: Versioned in registry
- Configuration: Git repository
- Secrets: AWS Secrets Manager / HashiCorp Vault

### Failover Procedures

1. **Database Failover:**
   - Promote read replica to primary
   - Update DNS/connection strings
   - Verify data integrity

2. **Application Failover:**
   - Redirect traffic to backup region
   - Scale up instances
   - Verify health checks

3. **Terminal Offline Mode:**
   - Use local SQLite cache
   - Queue transactions locally
   - Sync when connection restored

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
