import { api } from '@/utils/request';
import {
  ADMIN_ACCESS_TOKEN_KEY,
  ADMIN_REFRESH_TOKEN_KEY,
  clearAdminSession,
  touchAdminSession,
} from '@/utils/session';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: {
      id: string;
      code: string;
      name: string;
      permissions: string[];
    };
  };
}

export interface LoginMfaChallenge {
  requiresTwoFactor: true;
  mfaToken: string;
  message: string;
}

export const authApi = {
  login: (credentials: LoginCredentials) =>
    api.post<AuthResponse | LoginMfaChallenge>('/auth/login', credentials),

  verifyLoginTwoFactor: (data: { mfaToken: string; code: string }) =>
    api.post<AuthResponse>('/auth/2fa/verify-login', data),

  refresh: (refreshToken: string) =>
    api.post<Pick<AuthResponse, 'accessToken' | 'refreshToken' | 'expiresIn'>>('/auth/refresh', {
      refreshToken,
    }),

  logout: () => api.post('/auth/logout', {}),

  getMe: () => api.get<AuthResponse['user']>('/auth/me'),

  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api.post<{ success: boolean; message: string }>('/auth/change-password', data),

  getTwoFactorStatus: () =>
    api.get<{ enabled: boolean; hasSecret: boolean }>('/auth/2fa/status'),

  generateTwoFactorSecret: () =>
    api.post<{ secret: string; message: string }>('/auth/2fa/generate', {}),

  verifyTwoFactor: (code: string) =>
    api.post<{ success: boolean; message: string }>('/auth/2fa/verify', { code }),

  disableTwoFactor: (password: string) =>
    api.post<{ success: boolean; message: string }>('/auth/2fa/disable', { password }),
};

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, refreshToken);
  touchAdminSession();
};

export const clearTokens = () => {
  clearAdminSession();
};

export const getTokens = () => ({
  accessToken: localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY),
  refreshToken: localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY),
});
