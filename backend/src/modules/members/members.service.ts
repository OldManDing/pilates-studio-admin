import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { MemberStatus } from '../../common/enums/domain.enums';

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
        remainingCredits: dto.initialCredits ?? 0,
        status: MemberStatus.ACTIVE,
        joinedAt: new Date(),
      },
      include: {
        plan: true,
        miniUser: true,
      },
    });
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResponse<any>> {
    const page = pagination.page ?? 1;
    const pageSize = pagination.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.member.findMany({
        skip,
        take: pageSize,
        include: {
          plan: true,
          miniUser: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.member.count(),
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

    return this.prisma.member.update({
      where: { id },
      data: dto,
      include: {
        plan: true,
        miniUser: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

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

    return this.prisma.member.update({
      where: { id },
      data: {
        remainingCredits: member.remainingCredits + amount,
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
      throw new NotFoundException('Member profile not found');
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
      isActive: member.status === MemberStatus.ACTIVE && endDate > now && member.remainingCredits > 0,
    };

    return { memberships: [membership] };
  }

  private async generateMemberCode(): Promise<string> {
    const count = await this.prisma.member.count();
    return `M${String(count + 1).padStart(6, '0')}`;
  }
}
