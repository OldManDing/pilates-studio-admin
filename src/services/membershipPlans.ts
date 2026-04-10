import { api } from '@/utils/request';
import type { MembershipPlanCategory } from '@/types';

export interface MembershipPlan {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: MembershipPlanCategory;
  totalCredits?: number;
  durationDays?: number;
  priceCents: number;
  isActive: boolean;
}

export interface CreatePlanData {
  code?: string;
  name: string;
  description?: string;
  category: MembershipPlanCategory;
  totalCredits?: number;
  durationDays?: number;
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
