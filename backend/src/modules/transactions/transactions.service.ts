import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import {
  MemberStatus,
  MembershipPlanCategory,
  TransactionKind,
  TransactionStatus,
} from '../../common/enums/domain.enums';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { buildDateRange } from '../../common/utils/date-range';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateTransactionDto) {
    const transactionCode = await this.generateTransactionCode();

    const transaction = await this.prisma.transaction.create({
      data: {
        transactionCode,
        memberId: dto.memberId,
        planId: dto.planId,
        kind: dto.kind,
        amountCents: dto.amountCents,
        status: dto.status ?? TransactionStatus.PENDING,
        happenedAt: new Date(),
        notes: dto.notes,
      },
      include: {
        member: {
          select: { id: true, name: true, phone: true },
        },
        plan: true,
      },
    });

    await this.notificationsService.createFromSetting('payment_receipt', {
      type: 'PAYMENT_RECEIPT',
      title: '支付凭证',
      content: `已记录一笔金额为 ${(dto.amountCents / 100).toFixed(2)} 元的交易。`,
      memberId: dto.memberId,
      payload: {
        transactionId: transaction.id,
        amountCents: dto.amountCents,
        kind: dto.kind,
      },
    });

    return transaction;
  }

  async findAll(query: QueryTransactionDto): Promise<PaginatedResponse<any>> {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const { memberId, kind, status, from, to } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.TransactionWhereInput = {};
    if (memberId) where.memberId = memberId;
    if (kind) where.kind = kind;
    if (status) where.status = status;
    const happenedAtRange = buildDateRange(from, to, 'transactions.happenedAt');
    if (happenedAtRange) {
      where.happenedAt = happenedAtRange;
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          member: {
            select: { id: true, name: true, phone: true },
          },
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findMyTransactions(
    miniUserId: string,
    query: QueryTransactionDto,
  ): Promise<PaginatedResponse<any>> {
    const member = await this.prisma.member.findUnique({
      where: { miniUserId },
    });

    if (!member) {
      return {
        data: [],
        meta: {
          page: Number(query.page) || 1,
          pageSize: Number(query.pageSize) || 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    return this.findAll({
      ...query,
      memberId: member.id,
    });
  }

  async findOne(id: string, miniUserId?: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        member: true,
        plan: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (miniUserId && transaction.member?.miniUserId !== miniUserId) {
      throw new ForbiddenException('Cannot access another member transaction');
    }

    return transaction;
  }

  async updateStatus(id: string, dto: UpdateTransactionStatusDto) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: {
          member: {
            include: {
              plan: true,
            },
          },
          plan: true,
        },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      const shouldApplyRenewal =
        transaction.kind === TransactionKind.MEMBERSHIP_RENEWAL &&
        dto.status === TransactionStatus.COMPLETED &&
        transaction.status !== TransactionStatus.COMPLETED;

      if (!shouldApplyRenewal) {
        return tx.transaction.update({
          where: { id },
          data: { status: dto.status },
          include: {
            member: true,
            plan: true,
          },
        });
      }

      if (!transaction.memberId || !transaction.member || !transaction.planId || !transaction.plan) {
        throw new BadRequestException('Membership renewal transaction must include member and plan');
      }

      const completedRenewalCount = await tx.transaction.count({
        where: {
          memberId: transaction.memberId,
          planId: transaction.member.planId ?? transaction.planId,
          kind: TransactionKind.MEMBERSHIP_RENEWAL,
          status: TransactionStatus.COMPLETED,
        },
      });

      const currentMembershipExpiresAt = this.getMembershipExpiresAt(
        transaction.member.joinedAt,
        transaction.member.plan?.durationDays,
        completedRenewalCount,
      );
      const hasActiveMembership = Boolean(
        transaction.member.status === MemberStatus.ACTIVE
        && currentMembershipExpiresAt
        && currentMembershipExpiresAt > new Date(),
      );
      const isSamePlanRenewal = transaction.member.planId === transaction.planId;

      if (hasActiveMembership && !isSamePlanRenewal) {
        throw new BadRequestException('Current membership has not expired; only same-plan renewal is supported');
      }

      const statusUpdate = await tx.transaction.updateMany({
        where: {
          id,
          status: { not: TransactionStatus.COMPLETED },
        },
        data: { status: dto.status },
      });

      if (statusUpdate.count === 0) {
        return tx.transaction.findUniqueOrThrow({
          where: { id },
          include: {
            member: true,
            plan: true,
          },
        });
      }

      await tx.member.update({
        where: { id: transaction.memberId },
        data: {
          planId: transaction.planId,
          joinedAt: hasActiveMembership && isSamePlanRenewal ? transaction.member.joinedAt : new Date(),
          status: MemberStatus.ACTIVE,
          remainingCredits: this.calculateRenewedCredits(
            transaction.member.remainingCredits,
            transaction.plan.category as MembershipPlanCategory,
            transaction.plan.totalCredits,
          ),
        },
      });

      return tx.transaction.findUniqueOrThrow({
        where: { id },
        include: {
          member: true,
          plan: true,
        },
      });
    });
  }

  async update(id: string, dto: UpdateTransactionDto) {
    await this.findOne(id);

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.memberId !== undefined ? { memberId: dto.memberId } : {}),
        ...(dto.planId !== undefined ? { planId: dto.planId } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.amountCents !== undefined ? { amountCents: dto.amountCents } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: {
        member: true,
        plan: true,
      },
    });
  }

  async getSummary() {
    const [totalRevenue, pendingAmount, refundedAmount, todayRevenue] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { status: TransactionStatus.COMPLETED },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.aggregate({
        where: { status: TransactionStatus.PENDING },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.aggregate({
        where: { status: TransactionStatus.REFUNDED },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          status: TransactionStatus.COMPLETED,
          happenedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: { amountCents: true },
      }),
    ]);

    return {
      totalRevenueCents: totalRevenue._sum.amountCents || 0,
      pendingAmountCents: pendingAmount._sum.amountCents || 0,
      refundedAmountCents: refundedAmount._sum.amountCents || 0,
      todayRevenueCents: todayRevenue._sum.amountCents || 0,
    };
  }

  async getMySummary(miniUserId: string, query: { from?: string; to?: string }) {
    const member = await this.prisma.member.findUnique({
      where: { miniUserId },
    });

    if (!member) {
      return {
        totalRevenue: 0,
        transactionCount: 0,
        byKind: {},
        byStatus: {},
      };
    }

    const happenedAtRange = buildDateRange(query.from, query.to, 'transactions.happenedAt');
    const where = {
      memberId: member.id,
      ...(happenedAtRange ? { happenedAt: happenedAtRange } : {}),
    };

    const transactions = await this.prisma.transaction.findMany({
      where,
      select: {
        kind: true,
        status: true,
        amountCents: true,
      },
    });

    const summary = {
      totalRevenue: 0,
      transactionCount: transactions.length,
      byKind: {} as Record<string, { count: number; total: number }>,
      byStatus: {} as Record<string, { count: number; total: number }>,
    };

    transactions.forEach((transaction) => {
      summary.totalRevenue += transaction.amountCents;

      const kindSummary = summary.byKind[transaction.kind] ?? { count: 0, total: 0 };
      kindSummary.count += 1;
      kindSummary.total += transaction.amountCents;
      summary.byKind[transaction.kind] = kindSummary;

      const statusSummary = summary.byStatus[transaction.status] ?? { count: 0, total: 0 };
      statusSummary.count += 1;
      statusSummary.total += transaction.amountCents;
      summary.byStatus[transaction.status] = statusSummary;
    });

    return summary;
  }

  private async generateTransactionCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = `T${Date.now().toString(36).toUpperCase()}${randomBytes(2).toString('hex').toUpperCase()}`;
      const exists = await this.prisma.transaction.findUnique({ where: { transactionCode: candidate } });
      if (!exists) {
        return candidate;
      }
    }
    throw new BadRequestException('无法生成唯一交易编号，请重试');
  }

  private calculateRenewedCredits(
    currentCredits: number,
    category: MembershipPlanCategory,
    planCredits?: number | null,
  ) {
    const safeCurrentCredits = Math.max(currentCredits, 0);

    if (category === MembershipPlanCategory.PERIOD_CARD) {
      return planCredits ?? Math.max(safeCurrentCredits, 1);
    }

    return safeCurrentCredits + (planCredits ?? 0);
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
}
