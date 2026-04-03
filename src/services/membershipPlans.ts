import { api } from '@/utils/request';

export interface MembershipPlan {
  id: string;
  planCode: string;
  name: string;
  description?: string;
  category: 'SINGLE' | 'RECURRING' | 'PACKAGE' | 'PRIVATE' | 'TAILOR';
  totalCredits: number;
  validityDays: number;
  priceCents: number;
  isActive: boolean;
}

export interface CreatePlanData {
  name: string;
  description?: string;
  category: string;
  totalCredits: number;
  validityDays: number;
  priceCents: number;
  isActive?: boolean;
}

export const membershipPlansApi = {
  getAll: () =>
    api.get<MembershipPlan[]>('/membership-plans'),

  getActive: () =>
    api.get<MembershipPlan[]>('/membership-plans/active'),

  getById: (id: string) =>
    api.get<MembershipPlan>(`/membership-plans/${id}`),

  create: (data: CreatePlanData) =>
    api.post<MembershipPlan>('/membership-plans', data),

  update: (id: string, data: Partial<CreatePlanData>) =>
    api.patch<MembershipPlan>(`/membership-plans/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/membership-plans/${id}`),
};
