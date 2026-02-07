import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse, LoginRequest, LoginResponse, RefreshTokenRequest, AuthTokens } from '../types/api.types';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(req: Request<{}, {}, LoginRequest>, res: Response<ApiResponse<LoginResponse>>) {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    const { username, password } = validation.data;
    const result = await this.authService.login(username, password);

    res.json({
      success: true,
      data: result,
    });
  }

  async refresh(req: Request<{}, {}, RefreshTokenRequest>, res: Response<ApiResponse<AuthTokens>>) {
    const validation = refreshTokenSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    const { refreshToken } = validation.data;
    const tokens = await this.authService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: tokens,
    });
  }

  async logout(req: Request<{}, {}, RefreshTokenRequest>, res: Response<ApiResponse>) {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const validation = refreshTokenSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    const { refreshToken } = validation.data;
    await this.authService.logout(req.user.userId, refreshToken);

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  }
}
