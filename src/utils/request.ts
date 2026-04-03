import { message } from 'antd';

const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000/api'
  : '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pilates_access_token');
};

const buildUrl = (endpoint: string, params?: Record<string, string | number | undefined>) => {
  const url = new URL(endpoint, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.pathname + url.search;
};

export const request = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const token = getToken();
  const { params, ...fetchOptions } = options;

  const url = `${API_BASE_URL}${buildUrl(endpoint, params)}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new ApiError(data.error?.code || 'UNKNOWN_ERROR', data.error?.message || '请求失败');
    }

    return data.data;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === 'UNAUTHORIZED') {
        localStorage.removeItem('pilates_access_token');
        localStorage.removeItem('pilates_refresh_token');
        window.location.href = '/login';
      }
      throw error;
    }

    message.error('网络请求失败，请检查网络连接');
    throw new ApiError('NETWORK_ERROR', '网络请求失败');
  }
};

// HTTP methods helpers
export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
