# Phase 1: Critical Security Fixes -- Implementation Plans

**Generated:** 2026-02-15 by Opus 4.6
**Total Estimated Effort:** 15-19 hours (2-3 days)
**Status:** Ready for Implementation

---

## Implementation Order and Dependencies

The 6 issues should be implemented in the following order due to interdependencies:

1. **ISSUE-003** (Hardcoded JWT Secrets) -- 1 hour -- No dependencies, simplest, foundational
2. **ISSUE-009** (Hardcoded Admin Password) -- 1 hour -- No dependencies, independent
3. **ISSUE-006** (CORS All Origins) -- 1 hour -- No dependencies, quick win
4. **ISSUE-007** (No Rate Limiting) -- 2 hours -- No dependencies, quick win
5. **ISSUE-001** (RBAC Not Enforced) -- 4-6 hours -- No dependencies, but largest scope
6. **ISSUE-002** (JWT in localStorage) -- 6-8 hours -- **Must be last** (requires CORS credentials:true from ISSUE-006)

---

## ISSUE-003: Hardcoded JWT Secrets -- Remove Fallback Values, Require Env Vars

**GitHub Issue:** [#26](https://github.com/agastya71/mysl-pos-project/issues/26)
**Estimated Effort:** 1 hour
**Priority:** 1 (within Phase 1)
**Dependencies:** None

### Step-by-Step Implementation

**1. Create a centralized config validation module**

Create: `/Users/u0102180/Code/personal-project/pos-system/backend/src/config/env.ts`

```typescript
// backend/src/config/env.ts

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Required environment variable ${name} is not set. ` +
      `Please set it in your .env file or environment.`
    );
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const env = {
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: parseInt(optionalEnv('PORT', '3000'), 10),

  // JWT - REQUIRED, no fallbacks
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRY: optionalEnv('JWT_ACCESS_EXPIRY', '15m'),
  JWT_REFRESH_EXPIRY: optionalEnv('JWT_REFRESH_EXPIRY', '7d'),
};
```

**2. Update auth.middleware.ts (line 6)**

File: `backend/src/middleware/auth.middleware.ts`

Before:
```typescript
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
```

After:
```typescript
import { env } from '../config/env';
// Use env.JWT_ACCESS_SECRET throughout
const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
```

**3. Update auth.service.ts (lines 36-37)**

File: `backend/src/services/auth.service.ts`

Before:
```typescript
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
```

After:
```typescript
import { env } from '../config/env';
// Use env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET throughout
```

**4. Update .env and .env.example**

`.env`:
```
JWT_ACCESS_SECRET=dev_access_secret_change_in_production_min_32_chars
JWT_REFRESH_SECRET=dev_refresh_secret_change_in_production_min_32_chars
```

`.env.example`:
```
# REQUIRED - Application will not start without these
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
```

**5. Update test setup**

File: `backend/src/__tests__/setup.ts` (lines 6-7)

Before:
```typescript
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
```

After:
```typescript
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
```

### Validation Checklist

- [ ] No `|| 'dev_access_secret'` in any source file
- [ ] Server fails to start when JWT env vars are missing
- [ ] Error message clearly states which variable is missing
- [ ] All 106+ existing tests still pass
- [ ] `.env.example` documents the requirement

### Testing

```bash
# Test 1: Remove JWT_ACCESS_SECRET and verify startup fails
# Test 2: Run all tests: cd backend && npm test
```

---

## ISSUE-009: Hardcoded Admin Password -- Use Environment Variable

**GitHub Issue:** [#32](https://github.com/agastya71/mysl-pos-project/issues/32)
**Estimated Effort:** 1 hour
**Priority:** 2
**Dependencies:** None

### Step-by-Step Implementation

**1. Update seed.ts (line 33)**

File: `backend/src/database/seed.ts`

Before:
```typescript
const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
```

After:
```typescript
const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
if (!adminPassword) {
  logger.warn('ADMIN_INITIAL_PASSWORD not set. Skipping admin user creation.');
} else {
  if (adminPassword.length < 8) {
    throw new Error('ADMIN_INITIAL_PASSWORD must be at least 8 characters');
  }
  const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);
  // ... rest of user creation
}
```

**2. Update .env**

```
ADMIN_INITIAL_PASSWORD=admin123
```

**3. Update .env.example**

```
# REQUIRED for first-time setup - Initial admin password (min 8 characters)
ADMIN_INITIAL_PASSWORD=change_this_before_production
```

### Validation Checklist

- [ ] No hardcoded `'admin123'` in source
- [ ] Minimum 8 character validation
- [ ] Graceful warning when missing
- [ ] `.env.example` documents the variable

---

## ISSUE-006: CORS All Origins -- Configure Specific Allowed Origins

**GitHub Issue:** [#29](https://github.com/agastya71/mysl-pos-project/issues/29)
**Estimated Effort:** 1 hour
**Priority:** 3
**Dependencies:** Must be done before ISSUE-002

### Step-by-Step Implementation

**1. Update app.ts (line 13)**

File: `backend/src/app.ts`

Before:
```typescript
app.use(cors());
```

After:
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

**2. Update .env**

```
ALLOWED_ORIGINS=http://localhost:3001
```

### Validation Checklist

- [ ] Origins read from ALLOWED_ORIGINS env var
- [ ] `credentials: true` set
- [ ] Requests from unlisted origins rejected
- [ ] Frontend still works

---

## ISSUE-007: No Rate Limiting -- Add express-rate-limit Middleware

**GitHub Issue:** [#30](https://github.com/agastya71/mysl-pos-project/issues/30)
**Estimated Effort:** 2 hours
**Priority:** 4
**Dependencies:** None

### Step-by-Step Implementation

**1. Install dependencies**

```bash
cd backend
npm install express-rate-limit
```

**2. Create rate limiting middleware**

Create: `backend/src/middleware/rateLimit.middleware.ts`

```typescript
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts, please try again after 15 minutes.',
    },
  },
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many refresh attempts, please try again later.',
    },
  },
});
```

**3. Apply in app.ts**

```typescript
import { apiLimiter, loginLimiter, refreshLimiter } from './middleware/rateLimit.middleware';

// After CORS, before routes:
app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth/refresh', refreshLimiter);
app.use('/api/v1/', apiLimiter);
```

### Validation Checklist

- [ ] Login limited to 5 attempts per 15 min
- [ ] API limited to 100 requests per 15 min
- [ ] Health endpoint NOT rate limited
- [ ] 429 responses formatted correctly

---

## ISSUE-001: RBAC Not Enforced -- Create requirePermission Middleware

**GitHub Issue:** [#24](https://github.com/agastya71/mysl-pos-project/issues/24)
**Estimated Effort:** 4-6 hours
**Priority:** 5
**Dependencies:** None

### Step-by-Step Implementation

**1. Create requirePermission middleware**

File: `backend/src/middleware/auth.middleware.ts`

Add after `authorizeRoles`:

```typescript
import { checkPermission } from '../services/role.service';

export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    if (req.user.role === 'admin') {
      return next();
    }

    try {
      const hasPermission = await checkPermission(
        req.user.userId,
        resource,
        action
      );

      if (!hasPermission) {
        throw new AppError(
          403,
          'FORBIDDEN',
          `You do not have permission to ${action} ${resource}`
        );
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'INTERNAL_ERROR', 'Permission check failed');
    }
  };
};
```

**2. Apply to all route files**

Update every route file to add `requirePermission(resource, action)`:

Example for `product.routes.ts`:
```typescript
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

router.post('/', authenticateToken, requirePermission('products', 'create'), handler);
router.get('/', authenticateToken, requirePermission('products', 'read'), handler);
router.put('/:id', authenticateToken, requirePermission('products', 'update'), handler);
router.delete('/:id', authenticateToken, requirePermission('products', 'delete'), handler);
```

Repeat for all route files:
- transaction.routes.ts
- customer.routes.ts (add authenticateToken too!)
- category.routes.ts
- inventory.routes.ts
- vendor.routes.ts
- purchaseOrder.routes.ts
- employee.routes.ts
- role.routes.ts

### Validation Checklist

- [ ] `requirePermission` middleware created
- [ ] Every route has permission check
- [ ] Customer routes now authenticated
- [ ] Admin role bypasses checks
- [ ] 403 errors returned correctly
- [ ] All existing tests pass

---

## ISSUE-002: JWT in localStorage -- Move to httpOnly Cookies

**GitHub Issue:** [#25](https://github.com/agastya71/mysl-pos-project/issues/25)
**Estimated Effort:** 6-8 hours
**Priority:** 6 (LAST - most complex)
**Dependencies:** ISSUE-006 (requires credentials: true)

### Step-by-Step Implementation

**BACKEND CHANGES**

**1. Install cookie-parser**

```bash
cd backend
npm install cookie-parser
npm install --save-dev @types/cookie-parser
```

**2. Add to app.ts**

```typescript
import cookieParser from 'cookie-parser';

app.use(cookieParser());
```

**3. Update auth.controller.ts**

Add cookie constants:
```typescript
export const REFRESH_TOKEN_COOKIE = 'refreshToken';
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
```

Update login method:
```typescript
async login(req: Request, res: Response) {
  // ... existing validation ...
  const result = await this.authService.login(username, password);

  // Set refresh token as httpOnly cookie
  res.cookie(REFRESH_TOKEN_COOKIE, result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/api/v1/auth',
  });

  // Return only access token
  res.json({
    success: true,
    data: {
      user: result.user,
      tokens: {
        accessToken: result.tokens.accessToken,
      },
    },
  });
}
```

Update refresh method:
```typescript
async refresh(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
  if (!refreshToken) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token not found');
  }

  const tokens = await this.authService.refreshToken(refreshToken);

  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/api/v1/auth',
  });

  res.json({
    success: true,
    data: { accessToken: tokens.accessToken },
  });
}
```

Update logout method:
```typescript
async logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
  if (refreshToken) {
    await this.authService.logout(req.user!.userId, refreshToken);
  }

  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
  });

  res.json({ success: true, data: { message: 'Logged out successfully' } });
}
```

**FRONTEND CHANGES**

**4. Update auth.slice.ts**

Add in-memory token storage:
```typescript
let accessTokenInMemory: string | null = null;

export const getAccessToken = (): string | null => accessTokenInMemory;
export const setAccessToken = (token: string | null): void => {
  accessTokenInMemory = token;
};
```

Update login thunk:
```typescript
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      setAccessToken(response.tokens.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Login failed');
    }
  }
);
```

Update logout thunk:
```typescript
export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } catch (error) {}
  setAccessToken(null);
  localStorage.removeItem('user');
});
```

Add refreshSession thunk:
```typescript
export const refreshSession = createAsyncThunk(
  'auth/refreshSession',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.refresh();
      setAccessToken(response.accessToken);
      return true;
    } catch (error: any) {
      setAccessToken(null);
      localStorage.removeItem('user');
      return rejectWithValue('Session expired');
    }
  }
);
```

**5. Update api.client.ts**

Update constructor:
```typescript
constructor() {
  this.client = axios.create({
    baseURL: this.baseURL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
  });
}
```

Update request interceptor:
```typescript
import { getAccessToken, setAccessToken } from '../../store/slices/auth.slice';

this.client.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
```

Update response interceptor:
```typescript
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;
  try {
    const response = await axios.post(
      `${this.baseURL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    const { accessToken } = response.data.data;
    setAccessToken(accessToken);
    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
    return this.client(originalRequest);
  } catch (refreshError) {
    setAccessToken(null);
    localStorage.removeItem('user');
    window.location.href = '/login';
    return Promise.reject(refreshError);
  }
}
```

**6. Update App.tsx**

Add session refresh on mount:
```typescript
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { refreshSession } from './store/slices/auth.slice';

const App: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      dispatch(refreshSession());
    }
  }, [dispatch]);

  return <Router>{/* routes */}</Router>;
};
```

### Validation Checklist

- [ ] Refresh token set as httpOnly cookie
- [ ] Login response excludes refreshToken
- [ ] localStorage has NO tokens (only user info)
- [ ] Access token in memory only
- [ ] `withCredentials: true` on axios
- [ ] Session survives page refresh
- [ ] Logout clears cookie
- [ ] All tests updated and passing

### Testing

**Manual E2E Test (CRITICAL):**
1. Login → check cookie exists (HttpOnly flag)
2. Check localStorage → NO accessToken or refreshToken
3. Wait for token expiry → verify auto-refresh
4. Refresh page → verify session persists
5. Logout → verify cookie cleared

---

## Summary Timeline

| Order | Issue | Hours | Cumulative |
|-------|-------|-------|------------|
| 1 | ISSUE-003: JWT Secrets | 1h | 1h |
| 2 | ISSUE-009: Admin Password | 1h | 2h |
| 3 | ISSUE-006: CORS | 1h | 3h |
| 4 | ISSUE-007: Rate Limiting | 2h | 5h |
| 5 | ISSUE-001: RBAC | 4-6h | 9-11h |
| 6 | ISSUE-002: JWT Cookies | 6-8h | 15-19h |

**Total: 15-19 hours (2-3 days)**

---

**Document Version:** 1.0
**Generated:** 2026-02-15 by Opus 4.6
**Agent ID:** a9bac6d (resume for follow-up questions)
