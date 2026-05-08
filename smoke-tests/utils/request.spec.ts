import { api } from '@/utils/request';

describe('request auth error handling', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('does not treat login credential failures as an expired session redirect', async () => {
    localStorage.setItem('pilates_refresh_token', 'stale-refresh-token');
    const initialHref = window.location.href;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '账号或密码错误，请检查后重新输入',
        },
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.post('/auth/login', {
      email: 'owner@pilates.com',
      password: 'wrong-password',
    })).rejects.toThrow('账号或密码错误，请检查后重新输入');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/login');
    expect(window.location.href).toBe(initialHref);
  });
});
