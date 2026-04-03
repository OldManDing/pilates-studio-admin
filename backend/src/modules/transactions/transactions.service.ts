import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import { TransactionStatus } from '../../common/enums/domain.enums';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTransactionDto) {
    const transactionCode = await this.generateTransactionCode();

    return this.prisma.transaction.create({
      data: {
        transactionCode,
        memberId: dto.memberId,
        planId: dto.planId,
        kind: dto.kind,
        amountCents: dto.amountCents,
        status: TransactionStatus.PENDING,
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
  }

  async findAll(query: PaginationDto & { memberId?: string; kind?: string; from?: string; to?: string }): Promise<PaginatedResponse<any>> {
    const { page, pageSize, memberId, kind, from, to } = query as any;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (memberId) where.memberId = memberId;
    if (kind) where.kind = kind;
    if (from || to) {
      where.happenedAt = {};
      if (from) where.happenedAt.gte = new Date(from);
      if (to) where.happenedAt.lte = new Date(to);
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

  async findOne(id: string) {
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

    return transaction;
  }

  async updateStatus(id: string, dto: UpdateTransactionStatusDto) {
    await this.findOne(id);

    return this.prisma.transaction.update({
      where: { id },
      data: { status: dto.status },
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

  private async generateTransactionCode(): Promise<string> {
    const count = await this.prisma.transaction.count();
    return `T${String(count + 1).padStart(8, '0')}`;
  }
}
