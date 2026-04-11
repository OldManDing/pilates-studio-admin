import { NotFoundException } from '@nestjs/common';
import { TransactionStatus } from '../../common/enums/domain.enums';
import { TransactionsService } from './transactions.service';

const createTransaction = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'transaction-1',
  transactionCode: 'T00000001',
  memberId: 'member-1',
  planId: 'plan-1',
  kind: 'MEMBERSHIP_PURCHASE',
  amountCents: 100000,
  status: TransactionStatus.PENDING,
  happenedAt: new Date('2026-04-10T10:00:00.000Z'),
  member: { id: 'member-1', name: '林若溪', phone: '13800000000' },
  plan: { id: 'plan-1', name: '年卡会员' },
  ...overrides,
});

describe('TransactionsService', () => {
  let service: TransactionsService;
  let notificationsService: {
    createFromSetting: jest.Mock;
  };
  let prisma: any;

  beforeEach(() => {
    notificationsService = {
      createFromSetting: jest.fn().mockResolvedValue(null),
    };

    prisma = {
      transaction: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    service = new TransactionsService(prisma, notificationsService as never);
  });

  it('creates a transaction with generated code and pending status', async () => {
    prisma.transaction.create.mockResolvedValue(createTransaction());

    const result = await service.create({
      memberId: 'member-1',
      planId: 'plan-1',
      kind: 'MEMBERSHIP_PURCHASE' as never,
      amountCents: 100000,
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transactionCode: 'T00000001',
          status: TransactionStatus.PENDING,
        }),
      }),
    );
    expect(notificationsService.createFromSetting).toHaveBeenCalledWith(
      'payment_receipt',
      expect.objectContaining({
        type: 'PAYMENT_RECEIPT',
        memberId: 'member-1',
      }),
    );
    expect(result.transactionCode).toBe('T00000001');
  });

  it('applies happenedAt date filtering in findAll', async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.transaction.count.mockResolvedValue(0);

    await service.findAll({ page: 1, pageSize: 10, from: '2026-04-01', to: '2026-04-30' });

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          happenedAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it('throws when updating a missing transaction', async () => {
    prisma.transaction.findUnique.mockResolvedValue(null);

    await expect(
      service.updateStatus('missing', { status: TransactionStatus.COMPLETED }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns summarized transaction totals', async () => {
    prisma.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amountCents: 100000 } })
      .mockResolvedValueOnce({ _sum: { amountCents: 20000 } })
      .mockResolvedValueOnce({ _sum: { amountCents: 5000 } })
      .mockResolvedValueOnce({ _sum: { amountCents: 30000 } });

    const result = await service.getSummary();

    expect(result).toEqual({
      totalRevenueCents: 100000,
      pendingAmountCents: 20000,
      refundedAmountCents: 5000,
      todayRevenueCents: 30000,
    });
  });
});
