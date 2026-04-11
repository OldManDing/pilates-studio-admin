import { api } from '@/utils/request';

export interface Permission {
  id: string;
  module: string;
  action: string;
  description?: string;
}

export interface Role {
  id: string;
  code: 'OWNER' | 'FRONTDESK' | 'COACH' | 'FINANCE';
  name: string;
  description?: string;
  permissions: Array<{
    permission: Permission;
  }>;
  _count?: {
    admins: number;
  };
}

export interface CreateRoleData {
  code: Role['code'];
  name: string;
  description?: string;
  permissionIds?: string[];
}

export const rolesApi = {
  getAll: () => api.get<Role[]>('/roles'),
  getById: (id: string) => api.get<Role>(`/roles/${id}`),
  getPermissions: () => api.get<Permission[]>('/roles/permissions'),
  create: (data: CreateRoleData) => api.post<Role>('/roles', data),
  remove: (id: string) => api.delete<{ success: boolean }>(`/roles/${id}`),
  assignPermissions: (id: string, permissionIds: string[]) =>
    api.post<Role>(`/roles/${id}/permissions`, { permissionIds }),
  initializeDefaults: () => api.post<{ success: boolean }>('/roles/init', {}),
};
