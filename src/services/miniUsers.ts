import { api, requestWithMeta } from '@/utils/request';
import type { Member } from './members';

export type MiniUserStatus = 'ACTIVE' | 'DISABLED';

export interface MiniUserMemberSummary {
  id: string;
  memberCode?: string;
  name?: string;
  phone?: string;
  status?: string;
}

export interface MiniUserRecord {
  id: string;
  openId?: string;
  unionId?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  status?: MiniUserStatus;
  member?: MiniUserMemberSummary | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MiniUsersListResponse {
  data: MiniUserRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface MiniUserStatusSummary {
  id: string;
  status: MiniUserStatus;
  hasLinkedMember: boolean;
  memberId: string | null;
}

export const miniUsersApi = {
  getAll: async (page = 1, pageSize = 10, search?: string, status?: MiniUserStatus) => {
    const res = await requestWithMeta<MiniUserRecord[]>('/mini-users', {
      params: {
        page,
        pageSize,
        search,
        status,
      },
    });

    return {
      data: res.data || [],
      meta: res.meta ?? {
        page,
        pageSize,
        total: res.data?.length ?? 0,
        totalPages: res.data?.length ? 1 : 0,
      },
    } satisfies MiniUsersListResponse;
  },

  getById: (id: string) =>
    api.get<MiniUserRecord>(`/mini-users/${id}`),

  update: (id: string, data: Partial<Pick<MiniUserRecord, 'nickname' | 'avatarUrl' | 'phone' | 'openId' | 'unionId' | 'status'>> & { memberId?: string }) =>
    api.patch<MiniUserRecord>(`/mini-users/${id}`, data),

  enable: (id: string) =>
    api.post<MiniUserRecord>(`/mini-users/${id}/enable`, {}),

  disable: (id: string) =>
    api.post<MiniUserRecord>(`/mini-users/${id}/disable`, {}),

  getLinkedMember: (id: string) =>
    api.get<Member | null>(`/mini-users/${id}/member`),

  linkMember: (id: string, memberId: string) =>
    api.post<MiniUserRecord>(`/mini-users/${id}/link-member`, { memberId }),

  getStatus: (id: string) =>
    api.get<MiniUserStatusSummary>(`/mini-users/${id}/status`),
};
