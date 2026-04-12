import { api } from '@/utils/request';

export interface AdminRoleSummary {
  id: string;
  code: string;
  name: string;
}

export interface AdminRecord {
  id: string;
  email: string;
  phone?: string;
  displayName: string;
  roleId?: string;
  role?: AdminRoleSummary;
  createdAt?: string;
  updatedAt?: string;
}

export const adminsApi = {
  getAll: (search?: string) => api.get<AdminRecord[]>('/admins', { params: { search } }),
};
