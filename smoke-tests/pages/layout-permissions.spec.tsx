import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AppLayout from '@/layouts';
import ForbiddenPage from '@/pages/forbidden';

const getMeMock = vi.fn();

vi.mock('@/services/auth', () => ({
  authApi: {
    getMe: () => getMeMock(),
  },
  clearTokens: vi.fn(),
}));

describe('AppLayout permission flow', () => {
  beforeEach(() => {
    localStorage.setItem('pilates_access_token', 'access-token');
    getMeMock.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
    const warnMock = console.warn as unknown as { mockRestore?: () => void };
    const errorMock = console.error as unknown as { mockRestore?: () => void };
    warnMock.mockRestore?.();
    errorMock.mockRestore?.();
  });

  it('redirects forbidden users without navigation warnings during render', async () => {
    getMeMock.mockResolvedValue({
      role: {
        code: 'FRONTDESK',
        permissions: ['READ:MEMBERS'],
      },
    });
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/roles']} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App>
          <Routes>
            <Route path="/roles" element={<AppLayout>Role page</AppLayout>} />
            <Route path="/403" element={<ForbiddenPage />} />
          </Routes>
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('403 · 无权访问')).toBeInTheDocument();
    });

    expect(consoleWarn).not.toHaveBeenCalledWith(expect.stringContaining('navigate()'));
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining('Cannot update'));
  });
});
