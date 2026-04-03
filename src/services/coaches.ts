import { api } from '@/utils/request';
import type { CoachStatus } from '@/types';

export interface Coach {
  id: string;
  coachCode: string;
  name: string;
  phone: string;
  email?: string;
  status: CoachStatus;
  experience?: string;
  rating?: number;
  bio?: string;
  specialties: { value: string }[];
  certificates: { value: string }[];
}

export interface CreateCoachData {
  name: string;
  phone: string;
  email?: string;
  status?: CoachStatus;
  experience?: string;
  bio?: string;
  specialties?: string[];
  certificates?: string[];
}

export const coachesApi = {
  getAll: () =>
    api.get<Coach[]>('/coaches'),

  getActive: () =>
    api.get<Coach[]>('/coaches/active'),

  getById: (id: string) =>
    api.get<Coach>(`/coaches/${id}`),

  create: (data: CreateCoachData) =>
    api.post<Coach>('/coaches', data),

  update: (id: string, data: Partial<CreateCoachData>) =>
    api.patch<Coach>(`/coaches/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/coaches/${id}`),

  getStats: (id: string) =>
    api.get<{ coach: Pick<Coach, 'id' | 'name'>; stats: {
      totalSessions: number;
      completedSessions: number;
      upcomingSessions: number;
      totalBookings: number;
    }}>(`/coaches/${id}/stats`),
};
