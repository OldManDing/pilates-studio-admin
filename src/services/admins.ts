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

export interface AdminPayload {
  email: string;
  phone?: string;
  displayName: string;
  roleId: string;
  password?: string;
}

export const adminsApi = {
  getAll: (search?: string) => api.get<AdminRecord[]>('/admins', { params: { search } }),
  getById: (id: string) => api.get<AdminRecord>(`/admins/${id}`),
  create: (data: AdminPayload & { password: string }) => api.post<AdminRecord>('/admins', data),
  update: (id: string, data: Partial<AdminPayload>) => api.patch<AdminRecord>(`/admins/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/admins/${id}`),
  resetPassword: (id: string, password: string) =>
    api.patch<{ id: string; email: string; updatedAt: string }>(`/admins/${id}/reset-password`, { password }),
};
