import { api } from '@/utils/request';
import type { MemberStatus } from '@/types';

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
  getAll: (page = 1, pageSize = 10) =>
    api.get<PaginatedResponse<Member>>('/members', { params: { page, pageSize } }),

  getById: (id: string) =>
    api.get<Member>(`/members/${id}`),

  create: (data: CreateMemberData) =>
    api.post<Member>('/members', data),

  update: (id: string, data: UpdateMemberData) =>
    api.patch<Member>(`/members/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/members/${id}`),

  getBookings: (id: string) =>
    api.get(`/members/${id}/bookings`),

  getTransactions: (id: string) =>
    api.get(`/members/${id}/transactions`),

  adjustCredits: (id: string, amount: number) =>
    api.post<Member>(`/members/${id}/credits`, { amount }),
};
