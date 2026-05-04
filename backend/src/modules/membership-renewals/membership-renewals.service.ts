import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MemberStatus,
  TransactionKind,
  TransactionStatus,
} from '../../common/enums/domain.enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMembershipRenewalDto } from './dto/create-membership-renewal.dto';
import { CreateMembershipRenewalPaymentDto } from './dto/create-membership-renewal-payment.dto';
import { WechatPayService } from './wechat-pay.service';
import { TransactionsService } from '../transactions/transactions.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MembershipRenewalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wechatPayService: WechatPayService,
    private readonly transactionsService: TransactionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateMembershipRenewalDto, miniUserId: string) {
    const { transaction } = await this.createPendingRenewalTransaction(dto.planId, miniUserId);

    return {
      submitted: true,
      transaction,
    };
  }

  async createPayment(dto: CreateMembershipRenewalPaymentDto, miniUserId: string) {
    const { member, transaction, plan, miniUser } = await this.createPendingRenewalTransaction(dto.planId, miniUserId, true);

    if (!miniUser.openId) {
      throw new BadRequestException('Mini user openId is required for WeChat Pay');
    }

    const payment = await this.wechatPayService.createRenewalPayment({
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      amountCents: transaction.amountCents,
      description: `${plan.name} · ${member.name}`,
      openId: miniUser.openId,
      attach: JSON.stringify({ transactionId: transaction.id, memberId: member.id, planId: plan.id }),
    });

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        paymentMethod: 'WECHAT_PAY',
        paymentProvider: 'WECHAT_PAY',
        paymentOrderNo: payment.paymentOrderNo,
        paymentPrepayId: payment.paymentPrepayId,
        paymentRequestedAt: new Date(),
      },
    });

    return {
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      mode: payment.mode,
      paymentParams: payment.paymentParams,
    };
  }

  async handleWechatPaymentNotification(notification: { outTradeNo: string; transactionId: string; tradeState: string; amountCents: number }) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionCode: notification.outTradeNo },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found for payment notification');
    }

    if (transaction.amountCents !== notification.amountCents) {
      throw new BadRequestException('Payment amount does not match transaction amount');
    }

    if (notification.tradeState === 'SUCCESS') {
      await this.transactionsService.markPaymentCompleted(transaction.id, {
        paymentTransactionId: notification.transactionId,
        paidAt: new Date(),
        paymentPayload: notification,
      });
      return { success: true, transactionId: transaction.id, status: TransactionStatus.COMPLETED };
    }

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.FAILED,
        paymentTransactionId: notification.transactionId,
        paymentError: notification.tradeState,
        paymentPayload: notification,
      },
    });

    return { success: true, transactionId: transaction.id, status: TransactionStatus.FAILED };
  }

  async handleWechatNotificationRequest(rawBody: string, headers: Record<string, string | string[] | undefined>) {
    const parsed = this.wechatPayService.parseNotification(rawBody, headers);
    return this.handleWechatPaymentNotification(parsed);
  }

  async completeMockPayment(transactionId: string) {
    if (!this.wechatPayService.isMockMode()) {
      throw new BadRequestException('Mock payment completion is only available in mock mode');
    }

    const transaction = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    await this.transactionsService.markPaymentCompleted(transaction.id, {
      paymentTransactionId: `mock-${transaction.transactionCode}`,
      paidAt: new Date(),
      paymentPayload: { mode: 'MOCK' },
    });

    return { success: true, transactionId: transaction.id, status: TransactionStatus.COMPLETED };
  }

  private generateTransactionCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1_000_000).toString(36).toUpperCase().padStart(4, '0');
    return `T${timestamp}${random}`;
  }

  private getMembershipExpiresAt(
    joinedAt: Date,
    durationDays?: number | null,
    completedRenewalCount = 0,
  ) {
    if (!durationDays) {
      return null;
    }

    const cycles = 1 + Math.max(completedRenewalCount, 0);
    return new Date(joinedAt.getTime() + durationDays * cycles * 24 * 60 * 60 * 1000);
  }

  private async createPendingRenewalTransaction(planId: string, miniUserId: string, reuseExisting = false) {
    const [member, plan, miniUser] = await Promise.all([
      this.prisma.member.findUnique({
        where: { miniUserId },
        include: { plan: true },
      }),
      this.prisma.membershipPlan.findUnique({
        where: { id: planId },
      }),
      this.prisma.miniUser.findUnique({ where: { id: miniUserId } }),
    ]);

    if (!member) {
      throw new NotFoundException('Member profile not found');
    }

    if (!miniUser) {
      throw new NotFoundException('Mini user not found');
    }

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Active membership plan not found');
    }

    if (member.planId && member.plan && member.planId !== plan.id) {
      const completedRenewalCount = await this.prisma.transaction.count({
        where: {
          memberId: member.id,
          planId: member.planId,
          kind: TransactionKind.MEMBERSHIP_RENEWAL,
          status: TransactionStatus.COMPLETED,
        },
      });

      const currentMembershipExpiresAt = this.getMembershipExpiresAt(
        member.joinedAt,
        member.plan.durationDays,
        completedRenewalCount,
      );

      if (
        member.status === MemberStatus.ACTIVE
        && currentMembershipExpiresAt
        && currentMembershipExpiresAt > new Date()
      ) {
        throw new BadRequestException('Current membership has not expired; only same-plan renewal is supported');
      }
    }

    if (reuseExisting) {
      const existingTransaction = await this.prisma.transaction.findFirst({
        where: {
          memberId: member.id,
          planId: plan.id,
          kind: TransactionKind.MEMBERSHIP_RENEWAL,
          status: { in: [TransactionStatus.PENDING, TransactionStatus.PROCESSING] },
        },
        include: { member: true, plan: true },
        orderBy: { createdAt: 'desc' },
      });
      if (existingTransaction) {
        return { member, plan, miniUser, transaction: existingTransaction };
      }
    }

    const transactionCode = this.generateTransactionCode();

    const { transaction, memberId, miniUserId: recipientMiniUserId, planName, planId: notificationPlanId, amountCents } = await this.prisma.$transaction(async (tx) => {
      const createdTransaction = await tx.transaction.create({
        data: {
          transactionCode,
          memberId: member.id,
          planId: plan.id,
          kind: TransactionKind.MEMBERSHIP_RENEWAL,
          status: TransactionStatus.PENDING,
          amountCents: plan.priceCents,
          paymentMethod: 'WECHAT_PAY',
          paymentProvider: 'WECHAT_PAY',
          happenedAt: new Date(),
          notes: `Mini-program renewal request for ${plan.name}`,
        },
        include: {
          member: true,
          plan: true,
        },
      });

      return {
        transaction: createdTransaction,
        memberId: member.id,
        miniUserId,
        planName: plan.name,
        planId: plan.id,
        amountCents: plan.priceCents,
      };
    });

    await this.notificationsService.createFromSetting('membership_renewal_request', {
      type: 'MEMBERSHIP_RENEWAL_REQUEST',
      title: '会员续费申请',
      content: `${member.name} 提交了 ${planName} 的续费申请。`,
      memberId,
      miniUserId: recipientMiniUserId,
      payload: {
        transactionId: transaction.id,
        planId: notificationPlanId,
        amountCents,
      },
    });

    return { member, plan, miniUser, transaction };
  }
}
