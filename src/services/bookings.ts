import { api } from '@/utils/request';
import type { BookingStatus } from '@/types';
import type { PaginatedResponse } from './members';

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
  getAll: (params?: { page?: number; pageSize?: number; status?: BookingStatus; from?: string; to?: string }) =>
    api.get<PaginatedResponse<Booking>>('/bookings', { params }),

  getById: (id: string) =>
    api.get<Booking>(`/bookings/${id}`),

  create: (data: CreateBookingData) =>
    api.post<Booking>('/bookings', data),

  updateStatus: (id: string, status: BookingStatus) =>
    api.patch<Booking>(`/bookings/${id}/status`, { status }),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/bookings/${id}`),
};
