export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  status: string;
  assigned_terminal_id?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  services: {
    database: string;
    redis: string;
  };
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  terminalId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
