import { api } from '@/utils/request';

export const reportsApi = {
  getMembers: () =>
    api.get<{
      totalMembers: number;
      activeMembers: number;
      newMembersThisMonth: number;
      membersByPlan: Array<{ planId: string; planName: string; memberCount: number }>;
    }>('/reports/members'),

  getMemberExpiringSoon: (days = 30) =>
    api.get<number>('/reports/members/expiring-soon', { params: { days } }),

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

};
