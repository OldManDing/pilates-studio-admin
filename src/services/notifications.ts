import { api, requestWithMeta } from '@/utils/request';

export type NotificationChannel = 'SMS' | 'EMAIL' | 'MINI_PROGRAM' | 'INTERNAL';
export type NotificationStatus = 'PENDING' | 'SENT' | 'READ' | 'FAILED';

export interface NotificationMember {
  id: string;
  name: string;
  memberCode?: string;
  phone?: string;
  email?: string;
}

export interface NotificationMiniUser {
  id: string;
  nickname?: string;
  openId?: string;
  phone?: string;
}

export interface NotificationAdminUser {
  id: string;
  email: string;
  displayName: string;
}

export interface NotificationRecord {
  id: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  type: string;
  title: string;
  content: string;
  payload?: Record<string, unknown>;
  memberId?: string | null;
  miniUserId?: string | null;
  adminUserId?: string | null;
  member?: NotificationMember | null;
  miniUser?: NotificationMiniUser | null;
  adminUser?: NotificationAdminUser | null;
  sentAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  data: NotificationRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface QueryNotificationsParams {
  page?: number;
  pageSize?: number;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  memberId?: string;
  miniUserId?: string;
  adminUserId?: string;
}

export interface CreateNotificationData {
  channel: Extract<NotificationChannel, 'INTERNAL' | 'MINI_PROGRAM' | 'EMAIL'>;
  type: string;
  title: string;
  content: string;
  memberId?: string;
  miniUserId?: string;
  adminUserId?: string;
}

export const notificationsApi = {
  getAll: (params: QueryNotificationsParams = {}) =>
    requestWithMeta<NotificationRecord[]>('/notifications', {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        channel: params.channel,
        status: params.status,
        memberId: params.memberId,
        miniUserId: params.miniUserId,
        adminUserId: params.adminUserId,
      },
    }),

  getById: (id: string) =>
    api.get<NotificationRecord>(`/notifications/${id}`),

  create: (data: CreateNotificationData) =>
    api.post<NotificationRecord>('/notifications', data),

  markAsRead: (id: string) =>
    api.patch<NotificationRecord>(`/notifications/${id}/read`, {}),
};
