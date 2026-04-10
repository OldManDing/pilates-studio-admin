import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsPage from '@/pages/analytics';

vi.mock('@/services/reports', () => ({
  reportsApi: {
    getMembers: vi.fn().mockResolvedValue({ totalMembers: 12, activeMembers: 8, newMembersThisMonth: 2 }),
    getBookings: vi.fn().mockResolvedValue({ totalBookings: 10, confirmedBookings: 8 }),
    getTransactions: vi.fn().mockResolvedValue({
      transactionsByKind: [
        { kind: 'MEMBERSHIP_PURCHASE', _count: { id: 6 } },
      ],
    }),
  },
}));

describe('AnalyticsPage smoke test', () => {
  it('renders analytics page shell with mocked data', async () => {
    render(
      <MemoryRouter>
        <App>
          <AnalyticsPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '数据分析' })).toBeInTheDocument();
      expect(screen.getByText('目标达成率')).toBeInTheDocument();
      expect(screen.getByText('交易类型热度')).toBeInTheDocument();
    });
  });
});
