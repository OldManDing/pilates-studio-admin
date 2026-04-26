import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { AttendanceStatus, BookingStatus, MemberStatus, MembershipPlanCategory } from '../../common/enums/domain.enums';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { buildDateRange } from '../../common/utils/date-range';
import { NotificationsService } from '../notifications/notifications.service';

type BookableMember = {
  status: string;
  joinedAt: Date;
  remainingCredits: number;
  plan: {
    category: string;
    durationDays: number | null;
  } | null;
};

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateBookingDto, requesterUserId?: string, isMiniUser = false) {
    let targetMemberId = dto.memberId;

    if (isMiniUser) {
      if (!requesterUserId) {
        throw new BadRequestException('Mini user ID is required');
      }

      const currentMember = await this.prisma.member.findUnique({
        where: { miniUserId: requesterUserId },
      });

      if (!currentMember) {
        throw new NotFoundException('Member profile not found');
      }

      if (targetMemberId && targetMemberId !== 'SELF' && targetMemberId !== currentMember.id) {
        throw new ForbiddenException('Cannot create booking for another member');
      }

      targetMemberId = currentMember.id;
    } else if (!targetMemberId || targetMemberId === 'SELF') {
      if (!requesterUserId) {
        throw new BadRequestException('Member ID is required');
      }

      const currentMember = await this.prisma.member.findUnique({
        where: { miniUserId: requesterUserId },
      });

      if (!currentMember) {
        throw new NotFoundException('Member profile not found');
      }

      targetMemberId = currentMember.id;
    }

    const session = await this.prisma.courseSession.findUnique({
      where: { id: dto.sessionId },
      include: {
        course: true,
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Course session not found');
    }

    if (session._count.bookings >= session.capacity) {
      throw new ConflictException('Session is fully booked');
    }

    const member = await this.prisma.member.findUnique({
      where: { id: targetMemberId },
      include: { plan: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    this.assertBookableMember(member);

    // Check for duplicate booking
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        memberId: targetMemberId,
        sessionId: dto.sessionId,
        status: { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW] },
      },
    });

    if (existingBooking) {
      throw new ConflictException('Member already booked for this session');
    }

    const bookingCode = await this.generateBookingCode();

    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          bookingCode,
          memberId: targetMemberId,
          sessionId: dto.sessionId,
          source: dto.source,
          status: BookingStatus.CONFIRMED,
          bookedAt: new Date(),
        },
        include: {
          member: true,
          session: {
            include: {
              course: true,
              coach: true,
            },
          },
        },
      });

      await tx.courseSession.update({
        where: { id: dto.sessionId },
        data: {
          bookedCount: { increment: 1 },
        },
      });

      return booking;
    });

    await this.notificationsService.createFromSetting('booking_confirmation', {
      type: 'BOOKING_CONFIRMATION',
      content: `您已成功预约 ${session.course.name}`,
      memberId: member.id,
      miniUserId: member.miniUserId ?? undefined,
      payload: {
        bookingId: result.id,
        sessionId: dto.sessionId,
        courseName: session.course.name,
      },
    });

    return result;
  }

  async findAll(query: QueryBookingsDto): Promise<PaginatedResponse<any>> {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const { status, from, to } = query;
    const skip = (page - 1) * pageSize;
    const keyword = query.search?.trim();

    const where: any = {};
    if (status) where.status = status;
    const bookedAtRange = buildDateRange(from, to, 'bookings.bookedAt');
    if (bookedAtRange) {
      where.bookedAt = bookedAtRange;
    }
    if (keyword) {
      where.OR = [
        { bookingCode: { contains: keyword } },
        { member: { name: { contains: keyword } } },
        { session: { course: { name: { contains: keyword } } } },
        { session: { coach: { name: { contains: keyword } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          member: {
            select: { id: true, name: true, phone: true },
          },
          session: {
            include: {
              course: { select: { id: true, name: true } },
              coach: { select: { id: true, name: true } },
            },
          },
          attendance: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
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
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            phone: true,
            remainingCredits: true,
            miniUserId: true,
            status: true,
            joinedAt: true,
            plan: {
              select: {
                id: true,
                category: true,
                durationDays: true,
                totalCredits: true,
              },
            },
          },
        },
        session: {
          include: {
            course: true,
            coach: true,
          },
        },
        attendance: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async updateStatus(id: string, dto: UpdateBookingStatusDto) {
    const booking = await this.findOne(id);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a cancelled booking');
    }

    if (dto.status === BookingStatus.COMPLETED) {
      return this.checkIn(id);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: { status: dto.status },
        include: {
          member: true,
          session: true,
        },
      });

      // If cancelling, decrement booked count
      if (dto.status === BookingStatus.CANCELLED) {
        await tx.courseSession.update({
          where: { id: booking.sessionId },
          data: { bookedCount: { decrement: 1 } },
        });
      }

      return updated;
    });

    if (dto.status === BookingStatus.CANCELLED) {
      await this.notificationsService.createFromSetting('booking_cancelled', {
        type: 'BOOKING_CANCELLED',
        title: '预约已取消',
        content: `您的预约 ${booking.bookingCode} 已取消。`,
        memberId: booking.memberId,
        miniUserId: booking.member?.miniUserId ?? undefined,
        payload: {
          bookingId: booking.id,
          sessionId: booking.sessionId,
          bookingCode: booking.bookingCode,
        },
      });
    }

    return result;
  }

  async remove(id: string) {
    const booking = await this.findOne(id);

    if (booking.status !== BookingStatus.CANCELLED) {
      await this.prisma.courseSession.update({
        where: { id: booking.sessionId },
        data: { bookedCount: { decrement: 1 } },
      });
    }

    await this.prisma.booking.delete({
      where: { id },
    });

    return { success: true };
  }

  // Mini-program: get bookings for current member
  async findMyBookings(
    miniUserId: string,
    query: PaginationDto & { status?: BookingStatus },
  ): Promise<PaginatedResponse<any>> {
    const member = await this.prisma.member.findUnique({
      where: { miniUserId },
    });

    if (!member) {
      return {
        data: [],
        meta: { page: 1, pageSize: query.pageSize ?? 10, total: 0, totalPages: 0 },
      };
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const where: any = { memberId: member.id };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          member: {
            select: { id: true, name: true, phone: true },
          },
          session: {
            include: {
              course: { select: { id: true, name: true, type: true, level: true } },
              coach: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { bookedAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
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

  // Mini-program: cancel booking
  async cancel(id: string, _reason?: string, miniUserId?: string) {
    if (miniUserId) {
      const booking = await this.findOne(id);

      if (booking.member?.miniUserId !== miniUserId) {
        throw new ForbiddenException('Cannot cancel another member booking');
      }
    }

    return this.updateStatus(id, { status: BookingStatus.CANCELLED });
  }

  async checkIn(id: string, miniUserId?: string) {
    const booking = await this.findOne(id);

    if (miniUserId && booking.member?.miniUserId !== miniUserId) {
      throw new ForbiddenException('Cannot check in another member booking');
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.NO_SHOW) {
      throw new BadRequestException('Cannot check in a cancelled or no-show booking');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      return booking;
    }

    if (!booking.member) {
      throw new NotFoundException('Member not found');
    }

    this.assertBookableMember(booking.member);

    const checkedInAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      if (this.shouldConsumeCredit(booking.member?.plan?.category)) {
        const creditUpdate = await tx.member.updateMany({
          where: {
            id: booking.memberId,
            remainingCredits: { gt: 0 },
          },
          data: {
            remainingCredits: { decrement: 1 },
          },
        });

        if (creditUpdate.count === 0) {
          throw new BadRequestException('Insufficient remaining credits');
        }
      }

      const updatedBooking = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.COMPLETED },
        include: {
          member: { select: { id: true, name: true, phone: true } },
          session: {
            include: {
              course: { select: { id: true, name: true, type: true, level: true } },
              coach: { select: { id: true, name: true } },
            },
          },
          attendance: true,
        },
      });

      await tx.attendance.upsert({
        where: { bookingId: id },
        create: {
          bookingId: id,
          memberId: booking.memberId,
          sessionId: booking.sessionId,
          status: AttendanceStatus.CHECKED_IN,
          checkedInAt,
        },
        update: {
          status: AttendanceStatus.CHECKED_IN,
          checkedInAt,
        },
      });

      return updatedBooking;
    });
  }

  private async generateBookingCode(): Promise<string> {
    const count = await this.prisma.booking.count();
    return `B${String(count + 1).padStart(8, '0')}`;
  }

  private assertBookableMember(member: BookableMember) {
    if (member.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException('Member is not active');
    }

    if (!member.plan) {
      throw new BadRequestException('Member does not have an active membership plan');
    }

    if (member.remainingCredits <= 0) {
      throw new BadRequestException('Insufficient remaining credits');
    }

    if (member.plan.durationDays) {
      const expiresAt = new Date(member.joinedAt.getTime() + member.plan.durationDays * 24 * 60 * 60 * 1000);

      if (expiresAt <= new Date()) {
        throw new BadRequestException('Membership has expired');
      }
    }
  }

  private shouldConsumeCredit(category?: string) {
    return category === MembershipPlanCategory.TIME_CARD || category === MembershipPlanCategory.PRIVATE_PACKAGE;
  }
}
