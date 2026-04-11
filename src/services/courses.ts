import { api } from '@/utils/request';
import type { PaginatedResponse } from './members';

export interface Course {
  id: string;
  courseCode: string;
  name: string;
  type: string;
  level: string;
  durationMinutes: number;
  capacity: number;
  isActive: boolean;
  coach?: {
    id: string;
    name: string;
  };
  _count?: {
    sessions: number;
  };
}

export interface CreateCourseData {
  name: string;
  type: string;
  level: string;
  durationMinutes: number;
  capacity: number;
  coachId?: string;
  isActive?: boolean;
}

export type CoursesQueryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  level?: string;
};

export const coursesApi = {
  getAll: () =>
    api.get<Course[]>('/courses'),

  getPaged: (params?: CoursesQueryParams) =>
    api.get<PaginatedResponse<Course>>('/courses', { params }),

  getActive: () =>
    api.get<Course[]>('/courses/active'),

  getById: (id: string) =>
    api.get<Course>(`/courses/${id}`),

  create: (data: CreateCourseData) =>
    api.post<Course>('/courses', data),

  update: (id: string, data: Partial<CreateCourseData>) =>
    api.patch<Course>(`/courses/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/courses/${id}`),
};
