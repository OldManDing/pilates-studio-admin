import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsPage from '@/pages/analytics';

vi.mock('@/services/analytics', () => ({
  analyticsApi: {
    getDashboardOverview: vi.fn().mockResolvedValue({
      stats: {
        goalAchievement: 63,
        retentionRate: 50,
        avgOccupancy: 80,
        satisfaction: null,
      },
      transactionPopularity: [{ label: 'MEMBERSHIP_PURCHASE', value: 6 }],
    }),
    getBookingDistribution: vi.fn().mockResolvedValue([
      { label: '上午', value: 3 },
      { label: '中午', value: 2 },
      { label: '下午', value: 4 },
      { label: '晚间', value: 5 },
    ]),
    getMemberRetentionTrend: vi.fn().mockResolvedValue([
      { month: '3月', totalMembers: 10, activeMembers: 8, newMembers: 2 },
      { month: '4月', totalMembers: 12, activeMembers: 9, newMembers: 3 },
    ]),
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
