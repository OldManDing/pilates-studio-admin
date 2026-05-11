import { api } from '@/utils/request';

export type ImageUploadPurpose = 'miniPageHero' | 'studio' | 'courseCover' | 'coachAvatar' | 'generic';

export interface ImageUploadResult {
  url: string;
  width?: number;
  height?: number;
  size: number;
  format: string;
  objectName: string;
}

export const uploadsApi = {
  uploadImage: (file: File, purpose: ImageUploadPurpose) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ImageUploadResult>('/uploads/images', formData, { params: { purpose } });
  },
};
