import { api, requestWithMeta } from '@/utils/request';
import type { PaginatedResponse } from './members';

export interface CourseSession {
  id: string;
  sessionCode: string;
  courseId: string;
  coachId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount?: number;
  location?: string;
  isActive: boolean;
  course?: {
    id: string;
    name: string;
    type: string;
    level: string;
    durationMinutes: number;
  };
  coach?: {
    id: string;
    name: string;
  };
  _count?: {
    bookings: number;
  };
}

export interface CreateCourseSessionData {
  courseId: string;
  coachId: string;
  startsAt: string;
  endsAt: string;
  capacity?: number;
  location?: string;
  isActive?: boolean;
}

export const courseSessionsApi = {
  getAll: async (params?: { from?: string; to?: string; courseId?: string; coachId?: string; isActive?: boolean }) => {
    const res = await requestWithMeta<CourseSession[]>('/course-sessions', { params });
    return res.data || [];
  },

  getPaged: async (params?: { page?: number; pageSize?: number; from?: string; to?: string; courseId?: string; coachId?: string; isActive?: boolean; upcoming?: boolean }) => {
    const res = await requestWithMeta<CourseSession[]>('/course-sessions', { params: params || {} });
    return {
      data: res.data || [],
      meta: res.meta ?? {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 10,
        total: res.data?.length ?? 0,
        totalPages: res.data?.length ? 1 : 0,
      },
    } as PaginatedResponse<CourseSession>;
  },

  getUpcoming: async () => {
    const res = await requestWithMeta<CourseSession[]>('/course-sessions/upcoming', {
      params: { pageSize: 100 },
    });
    return res.data || [];
  },

  getById: (id: string) =>
    api.get<CourseSession>(`/course-sessions/${id}`),

  create: (data: CreateCourseSessionData) =>
    api.post<CourseSession>('/course-sessions', data),

  update: (id: string, data: Partial<CreateCourseSessionData>) =>
    api.patch<CourseSession>(`/course-sessions/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/course-sessions/${id}`),
};
