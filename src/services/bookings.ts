import { api } from '@/utils/request';
import type { BookingStatus } from '@/types';
import type { PaginatedResponse } from './members';

const bookingStatusToApi: Record<BookingStatus, string> = {
  '待确认': 'PENDING',
  '已确认': 'CONFIRMED',
  '已完成': 'COMPLETED',
  '已取消': 'CANCELLED',
};

const bookingStatusFromApi: Record<string, BookingStatus> = {
  PENDING: '待确认',
  CONFIRMED: '已确认',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  NO_SHOW: '已取消',
};

const mapBooking = (raw: any): Booking => ({
  ...raw,
  status: bookingStatusFromApi[raw.status] || '待确认',
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
  source?: 'ADMIN' | 'MINI_PROGRAM';
}

export const bookingsApi = {
  getAll: async (params?: { page?: number; pageSize?: number; status?: BookingStatus; from?: string; to?: string }) => {
    const normalized: any = { ...(params || {}) };
    if (normalized.status) {
      normalized.status = bookingStatusToApi[normalized.status as BookingStatus] || normalized.status;
    }
    const res = await api.get<PaginatedResponse<any>>('/bookings', { params: normalized });
    return {
      ...res,
      data: (res.data || []).map(mapBooking),
    } as PaginatedResponse<Booking>;
  },

  getById: async (id: string) => {
    const res = await api.get<any>(`/bookings/${id}`);
    return mapBooking(res);
  },

  create: async (data: CreateBookingData) => {
    const res = await api.post<any>('/bookings', data);
    return mapBooking(res);
  },

  updateStatus: async (id: string, status: BookingStatus) => {
    const mappedStatus = bookingStatusToApi[status] || status;
    const res = await api.patch<any>(`/bookings/${id}/status`, { status: mappedStatus });
    return mapBooking(res);
  },

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/bookings/${id}`),
};
