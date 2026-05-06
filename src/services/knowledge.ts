import { api, requestWithMeta } from '@/utils/request';
import type { PaginatedResponse } from './members';

export interface KnowledgeArticle {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeArticlePayload {
  category: string;
  question: string;
  answer: string;
  sortOrder?: number;
  isActive?: boolean;
}

export const knowledgeApi = {
  getAll: async (params?: { page?: number; pageSize?: number; category?: string; search?: string; isActive?: boolean }) => {
    const res = await requestWithMeta<KnowledgeArticle[]>('/knowledge', { params: params || {} });
    return {
      data: res.data || [],
      meta: res.meta ?? {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 10,
        total: res.data?.length ?? 0,
        totalPages: res.data?.length ? 1 : 0,
      },
    } as PaginatedResponse<KnowledgeArticle>;
  },

  create: (data: KnowledgeArticlePayload) =>
    api.post<KnowledgeArticle>('/knowledge', data),

  update: (id: string, data: Partial<KnowledgeArticlePayload>) =>
    api.patch<KnowledgeArticle>(`/knowledge/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/knowledge/${id}`),
};
