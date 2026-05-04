import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import MiniUsersPage from '@/pages/mini-users';

vi.mock('@/services/miniUsers', () => ({
  miniUsersApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'mini-user-1',
          nickname: '小雅',
          openId: 'openid-001',
          phone: '13800138000',
          status: 'ACTIVE',
          member: {
            id: 'member-1',
            memberCode: 'M0001',
            name: '王小雅',
            phone: '13800138000',
            status: 'ACTIVE',
          },
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-02T10:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    }),
    getById: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    linkMember: vi.fn(),
  },
}));

vi.mock('@/services/members', () => ({
  membersApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    }),
  },
}));

describe('MiniUsersPage smoke test', () => {
  it('renders mini-users page shell with mocked data', async () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App>
          <MiniUsersPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '小程序用户管理' })).toBeInTheDocument();
      expect(screen.getByText('小雅')).toBeInTheDocument();
      expect(screen.getByText(/王小雅/)).toBeInTheDocument();
    });
  });
});
