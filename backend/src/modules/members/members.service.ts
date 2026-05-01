import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { QueryMembersDto } from './dto/query-members.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { MemberStatus, MembershipPlanCategory } from '../../common/enums/domain.enums';

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMemberDto) {
    const existing = await this.prisma.member.findUnique({
      where: { phone: dto.phone },
    });

    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    const memberCode = await this.generateMemberCode();

    return this.prisma.member.create({
      data: {
        memberCode,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        planId: dto.planId,
        remainingCredits: dto.remainingCredits ?? dto.initialCredits ?? 0,
        status: dto.status ?? MemberStatus.ACTIVE,
        joinedAt: new Date(),
      },
      include: {
        plan: true,
        miniUser: true,
      },
    });
  }

  async findAll(query: QueryMembersDto): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const search = query.search?.trim();
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.planId ? { planId: query.planId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
              { memberCode: { contains: search } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          plan: true,
          miniUser: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.member.count({ where }),
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
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: {
        plan: true,
        miniUser: true,
        bookings: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  async update(id: string, dto: UpdateMemberDto) {
    await this.findOne(id);

    const { initialCredits, ...updateData } = dto as UpdateMemberDto & { initialCredits?: number };

    return this.prisma.member.update({
      where: { id },
      data: updateData,
      include: {
        plan: true,
        miniUser: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const [bookingCount, attendanceCount, transactionCount, notificationCount, reviewCount] = await Promise.all([
      this.prisma.booking.count({ where: { memberId: id } }),
      this.prisma.attendance.count({ where: { memberId: id } }),
      this.prisma.transaction.count({ where: { memberId: id } }),
      this.prisma.notification.count({ where: { memberId: id } }),
      this.prisma.courseReview.count({ where: { memberId: id } }),
    ]);

    const dependentCount = bookingCount + attendanceCount + transactionCount + notificationCount + reviewCount;
    if (dependentCount > 0) {
      throw new ConflictException('该会员存在历史预约/出勤/交易/通知/评价记录，不能直接删除，请改为停用。');
    }

    await this.prisma.member.delete({
      where: { id },
    });

    return { success: true };
  }

  async getMemberBookings(id: string) {
    await this.findOne(id);

    return this.prisma.booking.findMany({
      where: { memberId: id },
      include: {
        session: {
          include: {
            course: true,
            coach: true,
          },
        },
        attendance: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMemberTransactions(id: string) {
    await this.findOne(id);

    return this.prisma.transaction.findMany({
      where: { memberId: id },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adjustCredits(id: string, amount: number) {
    const member = await this.findOne(id);
    const nextCredits = member.remainingCredits + amount;

    if (nextCredits < 0) {
      throw new BadRequestException('Remaining credits cannot be negative');
    }

    return this.prisma.member.update({
      where: { id },
      data: {
        remainingCredits: nextCredits,
      },
      include: {
        plan: true,
      },
    });
  }

  async findByMiniUserId(miniUserId: string) {
    const member = await this.prisma.member.findUnique({
      where: { miniUserId },
      include: {
        plan: true,
        miniUser: true,
      },
    });

    if (!member) {
      return null;
    }

    // Strip sensitive fields
    const { miniUser, ...memberData } = member;
    return {
      ...memberData,
      avatar: miniUser?.avatarUrl || null,
    };
  }

  async getMembershipsByMiniUserId(miniUserId: string) {
    const member = await this.prisma.member.findUnique({
      where: { miniUserId },
      include: { plan: true },
    });

    if (!member || !member.plan) {
      return { memberships: [] };
    }

    // Map current plan to membership shape expected by mini-program
    const now = new Date();
    const startDate = member.joinedAt;
    const endDate = member.plan.durationDays
      ? new Date(startDate.getTime() + member.plan.durationDays * 24 * 60 * 60 * 1000)
      : new Date('2099-12-31');

    const membership = {
      id: `${member.id}-${member.planId}`,
      memberId: member.id,
      planId: member.planId,
      planName: member.plan.name,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalCredits: member.plan.totalCredits || 0,
      remainingCredits: member.remainingCredits,
      isActive: member.status === MemberStatus.ACTIVE && endDate > now && (
        member.plan.category === MembershipPlanCategory.PERIOD_CARD
          ? true
          : member.remainingCredits > 0
      ),
    };

    return { memberships: [membership] };
  }

  private async generateMemberCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = `M${Date.now().toString(36).toUpperCase()}${randomBytes(2).toString('hex').toUpperCase()}`;
      const exists = await this.prisma.member.findUnique({ where: { memberCode: candidate } });
      if (!exists) {
        return candidate;
      }
    }
    throw new ConflictException('无法生成唯一会员编号，请重试');
  }
}
