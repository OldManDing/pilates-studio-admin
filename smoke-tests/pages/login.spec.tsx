import { render, screen } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '@/pages/login';

vi.mock('@/services/auth', () => ({
  authApi: {
    login: vi.fn(),
    verifyLoginTwoFactor: vi.fn(),
  },
  setTokens: vi.fn(),
}));

describe('LoginPage smoke test', () => {
  it('renders the login form shell', () => {
    render(
      <MemoryRouter>
        <App>
          <LoginPage />
        </App>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '欢迎登录门店管理后台' })).toBeInTheDocument();
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /进入管理后台/ })).toBeInTheDocument();
  });
});
