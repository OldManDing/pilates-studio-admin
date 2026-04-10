import { api } from '@/utils/request';
import type { MemberStatus } from '@/types';

const mapMember = (raw: any): Member => ({
  ...raw,
  status: raw.status,
});

export interface Member {
  id: string;
  memberCode: string;
  name: string;
  phone: string;
  email?: string;
  status: MemberStatus;
  joinedAt: string;
  remainingCredits: number;
  plan?: {
    id: string;
    name: string;
  };
  miniUser?: {
    id: string;
    nickname?: string;
  };
}

export interface CreateMemberData {
  name: string;
  phone: string;
  email?: string;
  planId?: string;
  initialCredits?: number;
}

export interface UpdateMemberData extends Partial<CreateMemberData> {
  status?: MemberStatus;
  remainingCredits?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const membersApi = {
  getAll: async (page = 1, pageSize = 10) => {
    const res = await api.get<PaginatedResponse<any>>('/members', { params: { page, pageSize } });
    return {
      ...res,
      data: (res.data || []).map(mapMember),
    } as PaginatedResponse<Member>;
  },

  getById: async (id: string) => {
    const res = await api.get<any>(`/members/${id}`);
    return mapMember(res);
  },

  create: async (data: CreateMemberData & { status?: MemberStatus }) => {
    const res = await api.post<any>('/members', data);
    return mapMember(res);
  },

  update: async (id: string, data: UpdateMemberData) => {
    const res = await api.patch<any>(`/members/${id}`, data);
    return mapMember(res);
  },

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/members/${id}`),

  getBookings: (id: string) =>
    api.get(`/members/${id}/bookings`),

  getTransactions: (id: string) =>
    api.get(`/members/${id}/transactions`),

  adjustCredits: (id: string, amount: number) =>
    api.post<Member>(`/members/${id}/credits`, { amount }),
};
