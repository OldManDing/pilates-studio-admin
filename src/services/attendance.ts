import { api, requestWithMeta } from '@/utils/request';
import type { PaginatedResponse } from './members';

export type AttendanceStatus = 'PENDING' | 'CHECKED_IN' | 'COMPLETED' | 'ABSENT' | 'CANCELLED';

export interface AttendanceRecord {
  id: string;
  bookingId: string;
  memberId: string;
  sessionId: string;
  status: AttendanceStatus;
  checkedInAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  member?: {
    id: string;
    name: string;
    phone: string;
  };
  session?: {
    id: string;
    startsAt?: string;
    endsAt?: string;
    course?: {
      id: string;
      name: string;
    };
  };
  booking?: {
    id: string;
    bookingCode: string;
  };
}

export interface CheckInData {
  bookingId: string;
  notes?: string;
}

export const attendanceApi = {
  getAll: async (params?: { page?: number; pageSize?: number; sessionId?: string; memberId?: string }) => {
    const res = await requestWithMeta<AttendanceRecord[]>('/attendance', { params: params || {} });
    return {
      data: res.data || [],
      meta: res.meta ?? {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 10,
        total: res.data?.length ?? 0,
        totalPages: res.data?.length ? 1 : 0,
      },
    } as PaginatedResponse<AttendanceRecord>;
  },

  checkIn: (data: CheckInData) =>
    api.post<AttendanceRecord>('/attendance/check-in', data),

  complete: (id: string, notes?: string) =>
    api.post<AttendanceRecord>(`/attendance/${id}/complete`, { notes }),

  update: (id: string, data: Partial<Pick<AttendanceRecord, 'status' | 'notes'>>) =>
    api.patch<AttendanceRecord>(`/attendance/${id}`, data),
};
