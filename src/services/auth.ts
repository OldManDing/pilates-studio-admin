import { api } from '@/utils/request';

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

export const authApi = {
  login: (credentials: LoginCredentials) =>
    api.post<AuthResponse>('/auth/login', credentials),

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
    api.post<{ secret: string; backupCode: string; message: string }>('/auth/2fa/generate', {}),

  verifyTwoFactor: (code: string) =>
    api.post<{ success: boolean; message: string }>('/auth/2fa/verify', { code }),

  disableTwoFactor: (password: string) =>
    api.post<{ success: boolean; message: string }>('/auth/2fa/disable', { password }),
};

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('pilates_access_token', accessToken);
  localStorage.setItem('pilates_refresh_token', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('pilates_access_token');
  localStorage.removeItem('pilates_refresh_token');
};

export const getTokens = () => ({
  accessToken: localStorage.getItem('pilates_access_token'),
  refreshToken: localStorage.getItem('pilates_refresh_token'),
});
