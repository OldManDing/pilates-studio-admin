import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingStatus } from '../../common/enums/domain.enums';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBookingDto, requesterUserId?: string) {
    let targetMemberId = dto.memberId;

    if (!targetMemberId || targetMemberId === 'SELF') {
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
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

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

    return result;
  }

  async findAll(query: PaginationDto & { status?: BookingStatus; from?: string; to?: string }): Promise<PaginatedResponse<any>> {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const { status, from, to } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (status) where.status = status;
    if (from || to) {
      where.bookedAt = {};
      if (from) where.bookedAt.gte = new Date(from);
      if (to) where.bookedAt.lte = new Date(to);
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
          select: { id: true, name: true, phone: true, remainingCredits: true },
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
  async cancel(id: string, _reason?: string) {
    return this.updateStatus(id, { status: BookingStatus.CANCELLED });
  }

  private async generateBookingCode(): Promise<string> {
    const count = await this.prisma.booking.count();
    return `B${String(count + 1).padStart(8, '0')}`;
  }
}
