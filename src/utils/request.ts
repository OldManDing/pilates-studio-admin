const API_BASE_URL = process.env.API_BASE_URL || '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  responseType?: 'json' | 'blob';
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

const isFormDataBody = (body: unknown): body is FormData =>
  typeof FormData !== 'undefined' && body instanceof FormData;

const serializeBody = (body: unknown) => {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (isFormDataBody(body)) {
    return body;
  }

  return JSON.stringify(body);
};

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const extractApiErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json() as ApiResponse<unknown> | { message?: string };

    if ('success' in payload && payload.success === false && payload.error?.message) {
      return payload.error.message;
    }

    if ('message' in payload && typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // ignore parse errors
  }

  return null;
};

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pilates_access_token');
};

const getRefreshToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pilates_refresh_token');
};

const storeTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pilates_access_token', accessToken);
  localStorage.setItem('pilates_refresh_token', refreshToken);
};

const clearTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('pilates_access_token');
  localStorage.removeItem('pilates_refresh_token');
};

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;
  const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.href = `/login?next=${encodeURIComponent(next || '/')}`;
};

let refreshingPromise: Promise<boolean> | null = null;

const refreshAccessToken = async () => {
  if (refreshingPromise) {
    return refreshingPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  refreshingPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as ApiResponse<{ accessToken: string; refreshToken: string }>;
      if (!data.success || !data.data?.accessToken || !data.data?.refreshToken) {
        return false;
      }

      storeTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshingPromise = null;
    }
  })();

  return refreshingPromise;
};

const buildUrl = (endpoint: string, params?: Record<string, string | number | boolean | undefined>) => {
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
  const { params, responseType = 'json', ...fetchOptions } = options;

  const url = `${API_BASE_URL}${buildUrl(endpoint, params)}`;

  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  // Don't set Content-Type for FormData (let browser set it with boundary)
  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    let response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (response.status === 401 && endpoint !== '/auth/refresh') {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const retryToken = getToken();
        const retryHeaders: Record<string, string> = {
          ...(retryToken && { Authorization: `Bearer ${retryToken}` }),
          ...((fetchOptions.headers as Record<string, string>) || {}),
        };
        if (!(fetchOptions.body instanceof FormData)) {
          retryHeaders['Content-Type'] = 'application/json';
        }

        response = await fetch(url, {
          ...fetchOptions,
          headers: retryHeaders,
        });
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError('UNAUTHORIZED', '登录状态已失效，请重新登录');
      }
      const apiErrorMessage = await extractApiErrorMessage(response);
      throw new ApiError('HTTP_ERROR', apiErrorMessage || `请求失败（${response.status}）`);
    }

    if (responseType === 'blob') {
      return response.blob() as Promise<T>;
    }

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new ApiError(data.error?.code || 'UNKNOWN_ERROR', data.error?.message || '请求失败');
    }

    return data.data;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === 'UNAUTHORIZED') {
        clearTokens();
        redirectToLogin();
      }
      throw error;
    }

    throw new ApiError('NETWORK_ERROR', '网络请求失败');
  }
};

export const requestWithMeta = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiSuccessEnvelope<T>> => {
  const token = getToken();
  const { params, responseType = 'json', ...fetchOptions } = options;

  const url = `${API_BASE_URL}${buildUrl(endpoint, params)}`;

  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    let response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (response.status === 401 && endpoint !== '/auth/refresh') {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const retryToken = getToken();
        const retryHeaders: Record<string, string> = {
          ...(retryToken && { Authorization: `Bearer ${retryToken}` }),
          ...((fetchOptions.headers as Record<string, string>) || {}),
        };
        if (!(fetchOptions.body instanceof FormData)) {
          retryHeaders['Content-Type'] = 'application/json';
        }

        response = await fetch(url, {
          ...fetchOptions,
          headers: retryHeaders,
        });
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError('UNAUTHORIZED', '登录状态已失效，请重新登录');
      }
      const apiErrorMessage = await extractApiErrorMessage(response);
      throw new ApiError('HTTP_ERROR', apiErrorMessage || `请求失败（${response.status}）`);
    }

    if (responseType === 'blob') {
      return { data: await response.blob() as T };
    }

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new ApiError(data.error?.code || 'UNKNOWN_ERROR', data.error?.message || '请求失败');
    }

    return {
      data: data.data,
      meta: data.meta,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === 'UNAUTHORIZED') {
        clearTokens();
        redirectToLogin();
      }
      throw error;
    }

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
      body: serializeBody(body),
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: serializeBody(body),
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: serializeBody(body),
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
