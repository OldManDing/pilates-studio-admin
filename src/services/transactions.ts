import { api } from '@/utils/request';
import type { TransactionStatus, TransactionKind } from '@/types';
import type { PaginatedResponse } from './members';

const transactionKindToApi: Record<TransactionKind, string> = {
  PLAN_PURCHASE: 'MEMBERSHIP_PURCHASE',
  PLAN_RENEWAL: 'MEMBERSHIP_RENEWAL',
  PRIVATE_SESSION: 'PRIVATE_CLASS_PURCHASE',
  MERCHANDISE: 'CLASS_PACKAGE_PURCHASE',
  OTHER: 'ADJUSTMENT',
};

const transactionKindFromApi: Record<string, TransactionKind> = {
  MEMBERSHIP_PURCHASE: 'PLAN_PURCHASE',
  MEMBERSHIP_RENEWAL: 'PLAN_RENEWAL',
  PRIVATE_CLASS_PURCHASE: 'PRIVATE_SESSION',
  CLASS_PACKAGE_PURCHASE: 'MERCHANDISE',
  REFUND: 'OTHER',
  ADJUSTMENT: 'OTHER',
};

const transactionStatusFromApi: Record<string, TransactionStatus> = {
  PENDING: 'PENDING',
  PROCESSING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
};

const mapTransaction = (raw: any): Transaction => ({
  ...raw,
  kind: transactionKindFromApi[raw.kind] || 'OTHER',
  status: transactionStatusFromApi[raw.status] || 'PENDING',
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

export const transactionsApi = {
  getAll: async (params?: { page?: number; pageSize?: number; memberId?: string; kind?: string; from?: string; to?: string }) => {
    const normalized: any = { ...(params || {}) };
    if (normalized.kind) {
      normalized.kind = transactionKindToApi[normalized.kind as TransactionKind] || normalized.kind;
    }
    const res = await api.get<PaginatedResponse<any>>('/transactions', { params: normalized });
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
    const payload: any = {
      ...data,
      kind: transactionKindToApi[data.kind] || data.kind,
    };
    const res = await api.post<any>('/transactions', payload);
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
