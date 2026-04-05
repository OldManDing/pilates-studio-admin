import { api } from '@/utils/request';
import type { CoachStatus } from '@/types';

const coachStatusToApi: Record<CoachStatus, string> = {
  '在职': 'ACTIVE',
  '休假中': 'ON_LEAVE',
};

const coachStatusFromApi: Record<string, CoachStatus> = {
  ACTIVE: '在职',
  ON_LEAVE: '休假中',
  INACTIVE: '休假中',
};

const mapCoach = (raw: any): Coach => ({
  ...raw,
  status: coachStatusFromApi[raw.status] || '在职',
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

export const coachesApi = {
  getAll: async () => {
    const res = await api.get<any[]>('/coaches');
    return (res || []).map(mapCoach);
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
    const payload: any = { ...data };
    if (payload.status) {
      payload.status = coachStatusToApi[payload.status as CoachStatus] || payload.status;
    }
    const res = await api.post<any>('/coaches', payload);
    return mapCoach(res);
  },

  update: async (id: string, data: Partial<CreateCoachData>) => {
    const payload: any = { ...data };
    if (payload.status) {
      payload.status = coachStatusToApi[payload.status as CoachStatus] || payload.status;
    }
    const res = await api.patch<any>(`/coaches/${id}`, payload);
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
