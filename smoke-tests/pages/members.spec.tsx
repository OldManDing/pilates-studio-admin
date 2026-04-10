import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import MembersPage from '@/pages/members';

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
  },
}));

describe('MembersPage smoke test', () => {
  it('renders members management shell with mocked data', async () => {
    render(
      <MemoryRouter>
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
  });
});
