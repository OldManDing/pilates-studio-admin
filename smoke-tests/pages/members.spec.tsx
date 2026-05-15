import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import MembersPage from '@/pages/members';
import { membersApi } from '@/services/members';

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
        permissions: ['READ:MEMBERS', 'WRITE:MEMBERS', 'MANAGE:MEMBERS'],
      },
    }),
  },
}));

vi.mock('@/services/reports', () => ({
  reportsApi: {
    getMembers: vi.fn().mockResolvedValue({
      totalMembers: 12,
      activeMembers: 8,
      newMembersThisMonth: 2,
    }),
    getMemberExpiringSoon: vi.fn().mockResolvedValue(2),
  },
}));

vi.mock('@/services/membershipPlans', () => ({
  membershipPlansApi: {
    getAll: vi.fn().mockResolvedValue([{ id: 'plan-1', name: '年卡会员' }]),
  },
}));

vi.mock('@/services/bookings', () => ({
  bookingsApi: {
    getAll: vi.fn(),
  },
}));

vi.mock('@/services/transactions', () => ({
  transactionsApi: {
    getAll: vi.fn(),
  },
}));

vi.mock('@/services/members', () => ({
  membersApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'member-1',
          memberCode: 'M000001',
          name: '林若溪',
          phone: '13800000000',
          email: 'lin@example.com',
          status: 'ACTIVE',
          joinedAt: '2026-01-01T00:00:00.000Z',
          remainingCredits: 8,
          plan: { id: 'plan-1', name: '年卡会员' },
        },
      ],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    }),
    getBookings: vi.fn().mockResolvedValue([]),
    getTransactions: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

describe('MembersPage smoke test', () => {
  it('renders members management shell with mocked data', async () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App>
          <MembersPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '会员管理' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /新增会员/ })).toBeInTheDocument();
      expect(screen.getByText('总会员数')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /新增会员/ }));

    await waitFor(() => {
      const emailLabel = screen.getByText('邮箱');
      expect(emailLabel.closest('.ant-form-item-required')).not.toBeNull();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入会员姓名'), { target: { value: '新会员' } });
    fireEvent.change(screen.getByPlaceholderText('请输入手机号'), { target: { value: '13900000000' } });
    const submitButtons = screen.getAllByRole('button', { name: '新增会员' });
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('请输入邮箱')).toBeInTheDocument();
    });
    expect(membersApi.create).not.toHaveBeenCalled();
  }, 20000);
});
