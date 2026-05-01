import { api, requestWithMeta } from '@/utils/request';
import type { BookingStatus } from '@/types';
import type { PaginatedResponse } from './members';

const mapBooking = (raw: any): Booking => ({
  ...raw,
  status: raw.status,
});

export interface Booking {
  id: string;
  bookingCode: string;
  memberId: string;
  sessionId: string;
  source: 'ADMIN' | 'MINI_PROGRAM';
  status: BookingStatus;
  bookedAt: string;
  member: {
    id: string;
    name: string;
    phone: string;
  };
  session: {
    id: string;
    course: {
      id: string;
      name: string;
    };
    coach: {
      id: string;
      name: string;
    };
    startsAt: string;
    endsAt: string;
  };
  attendance?: {
    id: string;
    status: string;
  };
}

export interface CreateBookingData {
  memberId: string;
  sessionId: string;
  status?: BookingStatus;
  source?: 'ADMIN' | 'MINI_PROGRAM';
}

export interface BookingSummary {
  todayCount: number;
  weekTotal: number;
  pendingCount: number;
  confirmedCount: number;
  completedCount: number;
  noShowCount: number;
}

export const bookingsApi = {
  getAll: async (params?: { page?: number; pageSize?: number; status?: BookingStatus; from?: string; to?: string; search?: string }) => {
    const res = await requestWithMeta<any[]>('/bookings', { params: params || {} });
    return {
      ...res,
      data: (res.data || []).map(mapBooking),
      meta: res.meta ?? {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 10,
        total: res.data?.length ?? 0,
        totalPages: res.data?.length ? 1 : 0,
      },
    } as PaginatedResponse<Booking>;
  },

  getSummary: (params?: { status?: BookingStatus; from?: string; to?: string; search?: string }) =>
    api.get<BookingSummary>('/bookings/summary', { params: params || {} }),

  getById: async (id: string) => {
    const res = await api.get<any>(`/bookings/${id}`);
    return mapBooking(res);
  },

  getMemberOptions: () =>
    api.get<any[]>('/bookings/members/options'),

  create: async (data: CreateBookingData) => {
    const res = await api.post<any>('/bookings', data);
    return mapBooking(res);
  },

  updateStatus: async (id: string, status: BookingStatus) => {
    const res = await api.patch<any>(`/bookings/${id}/status`, { status });
    return mapBooking(res);
  },

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/bookings/${id}`),
};
