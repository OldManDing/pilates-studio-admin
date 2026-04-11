import { AnalyticsController } from './analytics.controller';

describe('AnalyticsController', () => {
  const analyticsService = {
    getDashboardOverview: jest.fn(),
    getBookingDistribution: jest.fn(),
    getMemberRetentionTrend: jest.fn(),
  };

  const controller = new AnalyticsController(analyticsService as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegates dashboard overview and booking distribution queries', async () => {
    analyticsService.getDashboardOverview.mockResolvedValue({ stats: {}, transactionPopularity: [] });
    analyticsService.getBookingDistribution.mockResolvedValue([{ label: '上午', value: 3 }]);

    await expect(controller.getDashboardOverview({ from: '2026-04-01', to: '2026-04-30' } as never)).resolves.toEqual({
      stats: {},
      transactionPopularity: [],
    });
    await expect(controller.getBookingDistribution({ from: '2026-04-01', to: '2026-04-30' } as never)).resolves.toEqual([
      { label: '上午', value: 3 },
    ]);

    expect(analyticsService.getDashboardOverview).toHaveBeenCalledWith('2026-04-01', '2026-04-30');
    expect(analyticsService.getBookingDistribution).toHaveBeenCalledWith('2026-04-01', '2026-04-30');
  });

  it('delegates retention trend queries', async () => {
    analyticsService.getMemberRetentionTrend.mockResolvedValue([{ month: '4月', totalMembers: 4, activeMembers: 3, newMembers: 1 }]);

    await expect(controller.getMemberRetentionTrend()).resolves.toEqual([
      { month: '4月', totalMembers: 4, activeMembers: 3, newMembers: 1 },
    ]);
    expect(analyticsService.getMemberRetentionTrend).toHaveBeenCalled();
  });
});
