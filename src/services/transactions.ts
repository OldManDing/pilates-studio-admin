import { api } from '@/utils/request';
import type { TransactionStatus, TransactionKind } from '@/types';
import type { PaginatedResponse } from './members';

const mapTransaction = (raw: any): Transaction => ({
  ...raw,
  kind: raw.kind,
  status: raw.status,
});

export interface Transaction {
  id: string;
  transactionCode: string;
  memberId?: string;
  planId?: string;
  kind: TransactionKind;
  status: TransactionStatus;
  amountCents: number;
  happenedAt: string;
  notes?: string;
  member?: {
    id: string;
    name: string;
    phone: string;
  };
  plan?: {
    id: string;
    name: string;
  };
}

export interface CreateTransactionData {
  memberId?: string;
  planId?: string;
  kind: TransactionKind;
  amountCents: number;
  notes?: string;
}

export interface UpdateTransactionData extends Partial<CreateTransactionData> {}

export const transactionsApi = {
  getAll: async (params?: { page?: number; pageSize?: number; memberId?: string; kind?: string; from?: string; to?: string }) => {
    const res = await api.get<PaginatedResponse<any>>('/transactions', { params: params || {} });
    return {
      ...res,
      data: (res.data || []).map(mapTransaction),
    } as PaginatedResponse<Transaction>;
  },

  getById: async (id: string) => {
    const res = await api.get<any>(`/transactions/${id}`);
    return mapTransaction(res);
  },

  create: async (data: CreateTransactionData) => {
    const res = await api.post<any>('/transactions', data);
    return mapTransaction(res);
  },

  update: async (id: string, data: UpdateTransactionData) => {
    const res = await api.patch<any>(`/transactions/${id}`, data);
    return mapTransaction(res);
  },

  updateStatus: (id: string, status: TransactionStatus) =>
    api.patch<Transaction>(`/transactions/${id}/status`, { status }),

  getSummary: () =>
    api.get<{
      totalRevenueCents: number;
      pendingAmountCents: number;
      refundedAmountCents: number;
      todayRevenueCents: number;
    }>('/transactions/summary'),
};
