import { api } from '@/utils/request';
import type { TransactionStatus, TransactionKind } from '@/types';
import type { PaginatedResponse } from './members';

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

export const transactionsApi = {
  getAll: (params?: { page?: number; pageSize?: number; memberId?: string; kind?: string; from?: string; to?: string }) =>
    api.get<PaginatedResponse<Transaction>>('/transactions', { params }),

  getById: (id: string) =>
    api.get<Transaction>(`/transactions/${id}`),

  create: (data: CreateTransactionData) =>
    api.post<Transaction>('/transactions', data),

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
