import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import FinancePage from '@/pages/finance';

vi.mock('@/services/transactions', () => ({
  transactionsApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'transaction-1',
          transactionCode: 'T000001',
          kind: 'MEMBERSHIP_PURCHASE',
          status: 'COMPLETED',
          amountCents: 100000,
          happenedAt: '2026-04-10T10:00:00.000Z',
          member: { id: 'member-1', name: '林若溪', phone: '13800000000' },
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    }),
    getSummary: vi.fn().mockResolvedValue({
      totalRevenueCents: 100000,
      pendingAmountCents: 0,
      refundedAmountCents: 0,
      todayRevenueCents: 100000,
    }),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock('@/services/reports', () => ({
  reportsApi: {
    getTransactions: vi.fn().mockResolvedValue({
      transactionsByKind: [
        {
          kind: 'MEMBERSHIP_PURCHASE',
          _sum: { amountCents: 100000 },
        },
      ],
    }),
  },
}));

describe('FinancePage smoke test', () => {
  it('renders finance page shell with mocked data', async () => {
    render(
      <MemoryRouter>
        <App>
          <FinancePage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '财务报表' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /导出报表/ })).toBeInTheDocument();
      expect(screen.getByText('累计营收')).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);
});
