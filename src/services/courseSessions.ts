import { api } from '@/utils/request';

export interface CourseSession {
  id: string;
  sessionCode: string;
  courseId: string;
  coachId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
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
  isActive?: boolean;
}

export const courseSessionsApi = {
  getAll: (params?: { from?: string; to?: string; courseId?: string; coachId?: string }) =>
    api.get<CourseSession[]>('/course-sessions', { params }),

  getUpcoming: () =>
    api.get<CourseSession[]>('/course-sessions/upcoming'),

  getById: (id: string) =>
    api.get<CourseSession>(`/course-sessions/${id}`),

  create: (data: CreateCourseSessionData) =>
    api.post<CourseSession>('/course-sessions', data),

  update: (id: string, data: Partial<CreateCourseSessionData>) =>
    api.patch<CourseSession>(`/course-sessions/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/course-sessions/${id}`),
};
