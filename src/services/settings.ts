import { api } from '@/utils/request';
import { uploadsApi } from './uploads';
export type { ImageUploadPurpose, ImageUploadResult } from './uploads';

export interface StudioSetting {
  id?: string;
  studioName: string;
  phone: string;
  email: string;
  businessHours: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string;
}

export interface NotificationSetting {
  id: string;
  key: string;
  title: string;
  description: string;
  channel: 'SMS' | 'EMAIL' | 'MINI_PROGRAM' | 'INTERNAL';
  enabled: boolean;
}

export interface MiniPageImageSetting {
  pageKey: string;
  label: string;
  path: string;
  defaultImageUrl: string;
  imageUrl?: string;
  isDefault: boolean;
  updatedAt?: string;
}

export const DEFAULT_MINI_PAGE_IMAGES: MiniPageImageSetting[] = [
  { pageKey: 'home', label: '首页', path: '/pages/index/index', defaultImageUrl: '/assets/ui/hero-studio.jpg', imageUrl: '', isDefault: true },
  { pageKey: 'courses', label: '预约', path: '/pages/courses/index', defaultImageUrl: '/assets/ui/hero-courses.jpg', imageUrl: '', isDefault: true },
  { pageKey: 'profile', label: '我的', path: '/pages/profile/index', defaultImageUrl: '/assets/ui/hero-profile.jpg', imageUrl: '', isDefault: true },
  { pageKey: 'membership', label: '会员中心', path: '/pages/membership/index', defaultImageUrl: '/assets/ui/hero-profile.jpg', imageUrl: '', isDefault: true },
  { pageKey: 'membershipRenew', label: '续费会员', path: '/pages/membership-renew/index', defaultImageUrl: '/assets/ui/hero-profile.jpg', imageUrl: '', isDefault: true },
  { pageKey: 'myBookings', label: '我的预约', path: '/pages/my-bookings/index', defaultImageUrl: '/assets/ui/hero-courses.jpg', imageUrl: '', isDefault: true },
  { pageKey: 'trainingRecords', label: '训练记录', path: '/pages/training-records/index', defaultImageUrl: '/assets/ui/hero-courses.jpg', imageUrl: '', isDefault: true },
  { pageKey: 'myCoaches', label: '我的教练', path: '/pages/my-coaches/index', defaultImageUrl: '/assets/ui/hero-courses.jpg', imageUrl: '', isDefault: true },
  { pageKey: 'notifications', label: '消息通知', path: '/pages/notifications/index', defaultImageUrl: '/assets/ui/hero-profile.jpg', imageUrl: '', isDefault: true },
  { pageKey: 'help', label: '帮助反馈', path: '/pages/help/index', defaultImageUrl: '/assets/ui/hero-studio.jpg', imageUrl: '', isDefault: true },
  { pageKey: 'settings', label: '设置', path: '/pages/settings/index', defaultImageUrl: '/assets/ui/hero-profile.jpg', imageUrl: '', isDefault: true },
  { pageKey: 'accountSecurity', label: '账户安全', path: '/pages/account-security/index', defaultImageUrl: '/assets/ui/hero-profile.jpg', imageUrl: '', isDefault: true },
  { pageKey: 'agreement', label: '用户协议', path: '/pages/agreement/index', defaultImageUrl: '/assets/ui/hero-profile.jpg', imageUrl: '', isDefault: true },
  { pageKey: 'privacy', label: '隐私政策', path: '/pages/privacy/index', defaultImageUrl: '/assets/ui/hero-profile.jpg', imageUrl: '', isDefault: true },
  { pageKey: 'transactions', label: '消费记录', path: '/pages/transactions/index', defaultImageUrl: '/assets/ui/hero-profile.jpg', imageUrl: '', isDefault: true },
];

export const settingsApi = {
  getStudio: () =>
    api.get<StudioSetting>('/settings/studio'),

  updateStudio: (data: StudioSetting) =>
    api.put<StudioSetting>('/settings/studio', data),

  getMiniPageImages: () =>
    api.get<MiniPageImageSetting[]>('/settings/mini-page-images'),

  updateMiniPageImage: (pageKey: string, data: { imageUrl?: string }) =>
    api.put<MiniPageImageSetting>(`/settings/mini-page-images/${pageKey}`, data),

  uploadImage: uploadsApi.uploadImage,

  getNotifications: () =>
    api.get<NotificationSetting[]>('/settings/notifications'),

  updateNotification: (key: string, enabled: boolean) =>
    api.put<NotificationSetting>('/settings/notifications', { key, enabled }),

  initialize: () =>
    api.post<{ success: boolean }>('/settings/init', {}),

  exportData: (range?: string) =>
    api.get('/settings/export', { responseType: 'blob', params: range ? { range } : undefined }),

  restoreData: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ success: boolean; message: string }>('/settings/restore', formData);
  },
};
