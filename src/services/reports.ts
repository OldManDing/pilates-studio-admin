import { api } from '@/utils/request';

export const reportsApi = {
  getMembers: () =>
    api.get<{
      totalMembers: number;
      activeMembers: number;
      newMembersThisMonth: number;
      membersByPlan: Array<{ planId: string; planName: string; memberCount: number }>;
    }>('/reports/members'),

  getBookings: (from: string, to: string) =>
    api.get<{
      totalBookings: number;
      confirmedBookings: number;
      cancelledBookings: number;
      noShowBookings: number;
      bookingsByCourse: Array<{ sessionId: string; _count: { id: number } }>;
    }>('/reports/bookings', { params: { from, to } }),

  getTransactions: (from: string, to: string) =>
    api.get<{
      totalTransactions: number;
      completedRevenueCents: number;
      refundedAmountCents: number;
      transactionsByKind: Array<{ kind: string; _sum: { amountCents: number }; _count: { id: number } }>;
    }>('/reports/transactions', { params: { from, to } }),

  getAttendance: (from: string, to: string) =>
    api.get<{
      totalAttendance: number;
      checkedIn: number;
      completed: number;
      absent: number;
      attendanceBySession: Array<{ sessionId: string; _count: { id: number } }>;
    }>('/reports/attendance', { params: { from, to } }),

  getMemberExpiringSoon: async (days = 30) => {
    const res = await api.get<{
      data: any[];
      meta: { total: number };
    }>('/members', { params: { page: 1, pageSize: 500 } });

    const now = Date.now();
    const threshold = now + days * 24 * 60 * 60 * 1000;

    const expiringSoon = (res.data || []).filter((member: any) => {
      if (member.status !== 'ACTIVE') return false;
      if (!member.joinedAt || !member.plan?.durationDays) return false;
      const end = new Date(member.joinedAt).getTime() + Number(member.plan.durationDays) * 24 * 60 * 60 * 1000;
      return end >= now && end <= threshold;
    });

    return expiringSoon.length;
  },
};
