import { api } from '@/utils/request';

export const analyticsApi = {
  getDashboardOverview: (from?: string, to?: string) =>
    api.get<{
      stats: {
        goalAchievement: number;
        retentionRate: number;
        avgOccupancy: number;
        satisfaction: number | null;
      };
      transactionPopularity: Array<{ label: string; value: number }>;
    }>('/analytics/dashboard', {
      params: { from, to },
    }),

  getBookingDistribution: (from?: string, to?: string) =>
    api.get<Array<{ label: string; value: number }>>('/analytics/booking-distribution', {
      params: { from, to },
    }),

  getMemberRetentionTrend: () =>
    api.get<Array<{ month: string; totalMembers: number; activeMembers: number; newMembers: number }>>(
      '/analytics/member-retention-trend',
    ),
};
