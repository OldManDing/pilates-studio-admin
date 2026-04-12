import { api } from '@/utils/request';

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
  status?: string;
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

export const miniUsersApi = {
  getAll: (page = 1, pageSize = 10, search?: string) =>
    api.get<MiniUsersListResponse>('/mini-users', {
      params: {
        page,
        pageSize,
        search,
      },
    }),
};
