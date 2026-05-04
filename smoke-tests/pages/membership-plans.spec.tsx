import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import MembershipPlansPage from '@/pages/membership-plans';

vi.mock('@/services/auth', () => ({
  authApi: {
    getMe: vi.fn().mockResolvedValue({
      id: 'admin-1',
      email: 'admin@pilates.com',
      displayName: 'System Admin',
      role: {
        id: 'role-1',
        code: 'OWNER',
        name: 'Owner',
        permissions: ['MANAGE:PLANS'],
      },
    }),
  },
}));

vi.mock('@/services/membershipPlans', () => ({
  membershipPlansApi: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: 'plan-1',
        code: 'ANNUAL',
        name: '年度会员',
        description: '年度不限次训练方案',
        category: 'PERIOD_CARD',
        totalCredits: undefined,
        durationDays: 365,
        priceCents: 799900,
        isActive: true,
      },
    ]),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('MembershipPlansPage smoke test', () => {
  it('renders membership plans management shell with mocked data', async () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App>
          <MembershipPlansPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '会员方案管理' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /新增方案/ })).toBeInTheDocument();
      expect(screen.getByText('年度会员')).toBeInTheDocument();
      expect(screen.getByText('标价')).toBeInTheDocument();
    });

    expect(screen.queryByText('核心权益')).not.toBeInTheDocument();
  }, 20000);
});
