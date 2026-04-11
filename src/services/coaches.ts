import { api } from '@/utils/request';
import type { CoachStatus } from '@/types';
import type { PaginatedResponse } from './members';

const mapCoach = (raw: any): Coach => ({
  ...raw,
  status: raw.status,
});

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

export type CoachesQueryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CoachStatus;
};

export const coachesApi = {
  getAll: async () => {
    const res = await api.get<any[]>('/coaches');
    return (res || []).map(mapCoach);
  },

  getPaged: async (params?: CoachesQueryParams) => {
    const res = await api.get<PaginatedResponse<any>>('/coaches', { params: params || {} });
    return {
      ...res,
      data: (res.data || []).map(mapCoach),
    } as PaginatedResponse<Coach>;
  },

  getActive: async () => {
    const res = await api.get<any[]>('/coaches/active');
    return (res || []).map(mapCoach);
  },

  getById: async (id: string) => {
    const res = await api.get<any>(`/coaches/${id}`);
    return mapCoach(res);
  },

  create: async (data: CreateCoachData) => {
    const res = await api.post<any>('/coaches', data);
    return mapCoach(res);
  },

  update: async (id: string, data: Partial<CreateCoachData>) => {
    const res = await api.patch<any>(`/coaches/${id}`, data);
    return mapCoach(res);
  },

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/coaches/${id}`),

  getStats: async (id: string) =>
    api.get<{ coach: Pick<Coach, 'id' | 'name'>; stats: {
      totalSessions: number;
      completedSessions: number;
      upcomingSessions: number;
      totalBookings: number;
    }}>(`/coaches/${id}/stats`),
};
