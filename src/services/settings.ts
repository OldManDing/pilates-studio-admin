import { api } from '@/utils/request';

export interface StudioSetting {
  id?: string;
  studioName: string;
  phone: string;
  email: string;
  businessHours: string;
  address: string;
}

export interface NotificationSetting {
  id: string;
  key: string;
  title: string;
  description: string;
  channel: 'SMS' | 'EMAIL' | 'MINI_PROGRAM' | 'INTERNAL';
  enabled: boolean;
}

export const settingsApi = {
  getStudio: () =>
    api.get<StudioSetting>('/settings/studio'),

  updateStudio: (data: StudioSetting) =>
    api.put<StudioSetting>('/settings/studio', data),

  getNotifications: () =>
    api.get<NotificationSetting[]>('/settings/notifications'),

  updateNotification: (key: string, enabled: boolean) =>
    api.put<NotificationSetting>('/settings/notifications', { key, enabled }),

  initialize: () =>
    api.post<{ success: boolean }>('/settings/init', {}),
};
