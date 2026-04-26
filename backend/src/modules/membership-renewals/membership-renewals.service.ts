import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationStatus,
  TransactionKind,
  TransactionStatus,
} from '../../common/enums/domain.enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMembershipRenewalDto } from './dto/create-membership-renewal.dto';

@Injectable()
export class MembershipRenewalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMembershipRenewalDto, miniUserId: string) {
    const [member, plan] = await Promise.all([
      this.prisma.member.findUnique({
        where: { miniUserId },
      }),
      this.prisma.membershipPlan.findUnique({
        where: { id: dto.planId },
      }),
    ]);

    if (!member) {
      throw new NotFoundException('Member profile not found');
    }

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Active membership plan not found');
    }

    const transactionCode = this.generateTransactionCode();

    const transaction = await this.prisma.$transaction(async (tx) => {
      const createdTransaction = await tx.transaction.create({
        data: {
          transactionCode,
          memberId: member.id,
          planId: plan.id,
          kind: TransactionKind.MEMBERSHIP_RENEWAL,
          status: TransactionStatus.PENDING,
          amountCents: plan.priceCents,
          happenedAt: new Date(),
          notes: `Mini-program renewal request for ${plan.name}`,
        },
        include: {
          member: true,
          plan: true,
        },
      });

      await tx.notification.create({
        data: {
          channel: NotificationChannel.INTERNAL,
          status: NotificationStatus.PENDING,
          type: 'MEMBERSHIP_RENEWAL_REQUEST',
          title: '会员续费申请',
          content: `${member.name} 提交了 ${plan.name} 的续费申请。`,
          memberId: member.id,
          miniUserId,
          payload: {
            transactionId: createdTransaction.id,
            planId: plan.id,
            amountCents: plan.priceCents,
          },
        },
      });

      return createdTransaction;
    });

    return {
      submitted: true,
      transaction,
    };
  }

  private generateTransactionCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1_000_000).toString(36).toUpperCase().padStart(4, '0');
    return `T${timestamp}${random}`;
  }
}
