import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto } from './dto/check-in.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceStatus, BookingStatus } from '../../common/enums/domain.enums';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async checkIn(dto: CheckInDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        member: true,
        session: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictException('Cannot check in for a cancelled booking');
    }

    const existingAttendance = await this.prisma.attendance.findUnique({
      where: { bookingId: dto.bookingId },
    });

    if (existingAttendance && existingAttendance.status !== AttendanceStatus.PENDING) {
      throw new ConflictException('Attendance already recorded');
    }

    if (existingAttendance) {
      const updatedAttendance = await this.prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          status: AttendanceStatus.CHECKED_IN,
          checkedInAt: new Date(),
          notes: dto.notes,
        },
        include: {
          member: true,
          session: {
            include: {
              course: true,
            },
          },
        },
      });

      await this.notificationsService.createFromSetting('attendance_checked_in', {
        type: 'ATTENDANCE_CHECKED_IN',
        title: '签到成功',
        content: `会员 ${booking.member.name} 已完成签到。`,
        memberId: booking.memberId,
        miniUserId: booking.member?.miniUserId ?? undefined,
        payload: {
          attendanceId: updatedAttendance.id,
          bookingId: booking.id,
          sessionId: booking.sessionId,
        },
      });

      return updatedAttendance;
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        bookingId: dto.bookingId,
        memberId: booking.memberId,
        sessionId: booking.sessionId,
        status: AttendanceStatus.CHECKED_IN,
        checkedInAt: new Date(),
        notes: dto.notes,
      },
      include: {
        member: true,
        session: {
          include: {
            course: true,
          },
        },
      },
    });

    await this.notificationsService.createFromSetting('attendance_checked_in', {
      type: 'ATTENDANCE_CHECKED_IN',
      title: '签到成功',
      content: `会员 ${booking.member.name} 已完成签到。`,
      memberId: booking.memberId,
      miniUserId: booking.member?.miniUserId ?? undefined,
      payload: {
        attendanceId: attendance.id,
        bookingId: booking.id,
        sessionId: booking.sessionId,
      },
    });

    return attendance;
  }

  async completeSession(id: string, notes?: string) {
    const attendance = await this.findOne(id);

    if (attendance.status !== AttendanceStatus.CHECKED_IN) {
      throw new ConflictException('Session must be checked in before completing');
    }

    return this.prisma.attendance.update({
      where: { id },
      data: {
        status: AttendanceStatus.COMPLETED,
        completedAt: new Date(),
        notes: notes || attendance.notes,
      },
      include: {
        member: true,
        session: {
          include: {
            course: true,
          },
        },
      },
    });
  }

  async findAll(query: PaginationDto & { sessionId?: string; memberId?: string }): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const { sessionId, memberId } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (sessionId) where.sessionId = sessionId;
    if (memberId) where.memberId = memberId;

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
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
            },
          },
          booking: {
            select: { id: true, bookingCode: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.attendance.count({ where }),
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
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        member: true,
        session: {
          include: {
            course: true,
            coach: true,
          },
        },
        booking: true,
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return attendance;
  }

  async update(id: string, dto: UpdateAttendanceDto) {
    await this.findOne(id);

    return this.prisma.attendance.update({
      where: { id },
      data: dto,
      include: {
        member: true,
        session: {
          include: {
            course: true,
          },
        },
      },
    });
  }
}
