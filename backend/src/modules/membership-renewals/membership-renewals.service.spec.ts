import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MemberStatus, MembershipPlanCategory, TransactionKind, TransactionStatus } from '../../common/enums/domain.enums';
import { MembershipRenewalsService } from './membership-renewals.service';

describe('MembershipRenewalsService', () => {
  let service: MembershipRenewalsService;
  let prisma: any;
  let wechatPayService: { createRenewalPayment: jest.Mock; isMockMode: jest.Mock; parseNotification: jest.Mock };
  let transactionsService: { markPaymentCompleted: jest.Mock };
  let notificationsService: { createFromSetting: jest.Mock };

  beforeEach(() => {
    prisma = {
      member: { findUnique: jest.fn() },
      membershipPlan: { findUnique: jest.fn() },
      miniUser: { findUnique: jest.fn() },
      transaction: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      notification: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback(prisma));

    wechatPayService = {
      createRenewalPayment: jest.fn(),
      isMockMode: jest.fn().mockReturnValue(true),
      parseNotification: jest.fn(),
    };

    transactionsService = {
      markPaymentCompleted: jest.fn(),
    };

    notificationsService = {
      createFromSetting: jest.fn(),
    };

    service = new MembershipRenewalsService(prisma, wechatPayService as never, transactionsService as never, notificationsService as never);
  });

  it('creates wechat pay renewal order and stores payment fields', async () => {
    prisma.member.findUnique.mockResolvedValue({
      id: 'member-1',
      name: '林若溪',
      status: MemberStatus.ACTIVE,
      joinedAt: new Date('2026-01-01T00:00:00.000Z'),
      remainingCredits: 6,
      planId: 'plan-1',
      plan: { id: 'plan-1', durationDays: 30 },
    });
    prisma.membershipPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      name: '月度无限卡',
      isActive: true,
      priceCents: 198000,
      category: MembershipPlanCategory.PERIOD_CARD,
      durationDays: 30,
    });
    prisma.miniUser.findUnique.mockResolvedValue({ id: 'mini-1', openId: 'openid-1' });
    prisma.transaction.findFirst.mockResolvedValue(null);
    prisma.transaction.create.mockResolvedValue({
      id: 'tx-1',
      transactionCode: 'T0001',
      amountCents: 198000,
      kind: TransactionKind.MEMBERSHIP_RENEWAL,
      status: TransactionStatus.PENDING,
      memberId: 'member-1',
      planId: 'plan-1',
      member: { id: 'member-1' },
      plan: { id: 'plan-1', name: '月度无限卡' },
    });
    wechatPayService.createRenewalPayment.mockResolvedValue({
      mode: 'MOCK',
      paymentParams: {
        timeStamp: '1',
        nonceStr: 'nonce',
        package: 'mock_prepay_id=tx-1',
        signType: 'RSA',
        paySign: 'MOCK_PAY_SIGN',
      },
      paymentOrderNo: 'MOCK-T0001',
      paymentPrepayId: 'mock_prepay_tx-1',
    });

    const result = await service.createPayment({ planId: 'plan-1' }, 'mini-1');

    expect(result.mode).toBe('MOCK');
    expect(wechatPayService.createRenewalPayment).toHaveBeenCalledWith(expect.objectContaining({ transactionId: 'tx-1', openId: 'openid-1' }));
    expect(notificationsService.createFromSetting).toHaveBeenCalledWith('membership_renewal_request', expect.objectContaining({
      type: 'MEMBERSHIP_RENEWAL_REQUEST',
      memberId: 'member-1',
      miniUserId: 'mini-1',
    }));
    expect(prisma.transaction.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'tx-1' },
      data: expect.objectContaining({
        paymentMethod: 'WECHAT_PAY',
        paymentProvider: 'WECHAT_PAY',
        paymentOrderNo: 'MOCK-T0001',
      }),
    }));
  });

  it('marks transaction completed on successful payment notification', async () => {
    prisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1', transactionCode: 'T0001', amountCents: 198000 });

    const result = await service.handleWechatPaymentNotification({
      outTradeNo: 'T0001',
      transactionId: 'wx-1',
      tradeState: 'SUCCESS',
      amountCents: 198000,
    });

    expect(transactionsService.markPaymentCompleted).toHaveBeenCalledWith('tx-1', expect.objectContaining({ paymentTransactionId: 'wx-1' }));
    expect(result.status).toBe(TransactionStatus.COMPLETED);
  });

  it('rejects mismatched payment amount', async () => {
    prisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1', transactionCode: 'T0001', amountCents: 198000 });

    await expect(service.handleWechatPaymentNotification({
      outTradeNo: 'T0001',
      transactionId: 'wx-1',
      tradeState: 'SUCCESS',
      amountCents: 100,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('completes mock payment only in mock mode', async () => {
    prisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1', transactionCode: 'T0001' });

    const result = await service.completeMockPayment('tx-1');

    expect(transactionsService.markPaymentCompleted).toHaveBeenCalledWith('tx-1', expect.objectContaining({ paymentTransactionId: 'mock-T0001' }));
    expect(result.status).toBe(TransactionStatus.COMPLETED);
  });

  it('rejects mock completion when mock mode disabled', async () => {
    wechatPayService.isMockMode.mockReturnValue(false);

    await expect(service.completeMockPayment('tx-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when payment notification references missing transaction', async () => {
    prisma.transaction.findUnique.mockResolvedValue(null);

    await expect(service.handleWechatPaymentNotification({
      outTradeNo: 'missing',
      transactionId: 'wx-1',
      tradeState: 'SUCCESS',
      amountCents: 198000,
    })).rejects.toBeInstanceOf(NotFoundException);
  });
});
