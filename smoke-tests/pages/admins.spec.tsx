import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import AdminsPage from '@/pages/admins';

vi.mock('@/services/auth', () => ({
  authApi: {
    getMe: vi.fn().mockResolvedValue({
      id: 'admin-1',
      email: 'owner@pilates.com',
      displayName: 'Owner',
      role: {
        id: 'role-1',
        code: 'OWNER',
        name: 'Owner',
        permissions: ['READ:ADMINS', 'MANAGE:ADMINS', 'READ:ROLES'],
      },
    }),
  },
}));

vi.mock('@/services/admins', () => ({
  adminsApi: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: 'admin-1',
        email: 'owner@pilates.com',
        phone: '13800000000',
        displayName: '门店店长',
        roleId: 'role-1',
        role: { id: 'role-1', code: 'OWNER', name: '店长' },
        createdAt: '2026-04-01T08:00:00.000Z',
        updatedAt: '2026-04-01T08:00:00.000Z',
      },
    ]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock('@/services/roles', () => ({
  rolesApi: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: 'role-1',
        code: 'OWNER',
        name: '店长',
        permissions: [],
      },
    ]),
  },
}));

describe('AdminsPage smoke test', () => {
  it('renders admin account management shell with mocked data', async () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App>
          <AdminsPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '管理员账号' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /新增管理员/ })).toBeInTheDocument();
      expect(screen.getByText('门店店长')).toBeInTheDocument();
      expect(screen.getByText('owner@pilates.com')).toBeInTheDocument();
    }, { timeout: 20000 });
  }, 30000);
});
