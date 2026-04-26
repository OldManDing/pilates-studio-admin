import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import RolesPage from '@/pages/roles';

vi.mock('@/services/roles', () => ({
  rolesApi: {
    getPermissions: vi.fn().mockResolvedValue([
      { id: 'perm-1', module: 'MEMBERS', action: 'READ', code: 'READ:MEMBERS' },
    ]),
    initializeDefaults: vi.fn(),
    getAll: vi.fn().mockResolvedValue([
      {
        id: 'role-1',
        code: 'OWNER',
        name: '店长',
        description: '门店负责人',
        permissions: [{ permission: { id: 'perm-1', module: 'MEMBERS', action: 'READ', code: 'READ:MEMBERS' } }],
      },
    ]),
    create: vi.fn(),
    assignPermissions: vi.fn(),
  },
}));

describe('RolesPage smoke test', () => {
  it('renders roles page shell with mocked data', async () => {
    render(
      <MemoryRouter>
        <App>
          <RolesPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '角色与权限' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /编辑权限/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /新增角色/ })).not.toBeInTheDocument();
      expect(screen.getByText('角色列表')).toBeInTheDocument();
    });
  });
});
