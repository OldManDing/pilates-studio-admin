import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto } from './dto/check-in.dto';
import { SubmitCourseReviewDto } from './dto/submit-course-review.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceStatus, BookingStatus, MembershipPlanCategory } from '../../common/enums/domain.enums';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async checkIn(dto: CheckInDto) {
    const checkedInAt = new Date();

    const attendance = await this.runSerializableTransaction(async (tx) => {
      const booking = await tx.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        member: {
          include: {
            plan: {
              select: {
                category: true,
              },
            },
          },
        },
        session: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.NO_SHOW) {
      throw new ConflictException('Cannot check in for a cancelled or no-show booking');
    }

    if (booking.status !== BookingStatus.COMPLETED && this.shouldConsumeCredit(booking.member?.plan?.category)) {
      if (booking.member.remainingCredits <= 0) {
        throw new ConflictException('Insufficient remaining credits');
      }

      const creditUpdate = await tx.member.updateMany({
        where: {
          id: booking.memberId,
          remainingCredits: { gt: 0 },
        },
        data: { remainingCredits: { decrement: 1 } },
      });

      if (creditUpdate.count === 0) {
        throw new ConflictException('Insufficient remaining credits');
      }
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.COMPLETED },
      });
    }

    const existingAttendance = await tx.attendance.findUnique({
      where: { bookingId: dto.bookingId },
      include: {
        member: true,
        session: {
          include: {
            course: true,
          },
        },
      },
    });

    if (existingAttendance && existingAttendance.status !== AttendanceStatus.PENDING) {
      throw new ConflictException('Attendance already recorded');
    }

    if (existingAttendance) {
      const updatedAttendance = await tx.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          status: AttendanceStatus.CHECKED_IN,
          checkedInAt,
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

      return updatedAttendance;
    }

    return tx.attendance.create({
      data: {
        bookingId: dto.bookingId,
        memberId: booking.memberId,
        sessionId: booking.sessionId,
        status: AttendanceStatus.CHECKED_IN,
        checkedInAt,
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
    });

    await this.notificationsService.createFromSetting('attendance_checked_in', {
      type: 'ATTENDANCE_CHECKED_IN',
      title: '签到成功',
      content: `会员 ${attendance.member.name} 已完成签到。`,
      memberId: attendance.memberId,
      miniUserId: attendance.member?.miniUserId ?? undefined,
      payload: {
        attendanceId: attendance.id,
        bookingId: attendance.bookingId,
        sessionId: attendance.sessionId,
        memberName: attendance.member.name,
        courseName: attendance.session?.course?.name,
        checkedInAt: attendance.checkedInAt,
        remark: '签到已记录，训练记录稍后同步',
        page: 'pages/training-records/index',
      },
    });

    return attendance;
  }

  async completeSession(id: string, notes?: string) {
    const attendance = await this.findOne(id);

    if (attendance.status !== AttendanceStatus.CHECKED_IN) {
      throw new ConflictException('Session must be checked in before completing');
    }

    const updated = await this.prisma.attendance.update({
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

    await this.prisma.booking.update({
      where: { id: attendance.bookingId },
      data: { status: BookingStatus.COMPLETED },
    });

    return updated;
  }

  async submitReview(id: string, dto: SubmitCourseReviewDto) {
    const attendance = await this.findOne(id);

    if (attendance.status !== AttendanceStatus.COMPLETED) {
      throw new ConflictException('Course review requires a completed attendance record');
    }

    const existingReview = await this.prisma.courseReview.findUnique({
      where: { attendanceId: id },
    });

    if (existingReview) {
      return this.prisma.courseReview.update({
        where: { attendanceId: id },
        data: {
          rating: dto.rating,
          comment: dto.comment,
        },
      });
    }

    return this.prisma.courseReview.create({
      data: {
        attendanceId: id,
        memberId: attendance.memberId,
        sessionId: attendance.sessionId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  async findAll(query: PaginationDto & { sessionId?: string; memberId?: string }): Promise<PaginatedResponse<any>> {
    const page = Math.max(Number(query.page ?? 1) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize ?? 10) || 10, 1), 100);
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
          review: true,
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
        review: true,
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

  private shouldConsumeCredit(category?: string) {
    return category === MembershipPlanCategory.TIME_CARD || category === MembershipPlanCategory.PRIVATE_PACKAGE;
  }

  private async runSerializableTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (this.isPrismaErrorCode(error, 'P2034') && attempt < 2) {
          continue;
        }

        if (this.isPrismaErrorCode(error, 'P2034')) {
          throw new ConflictException('Attendance was updated concurrently, please retry');
        }

        if (this.isPrismaErrorCode(error, 'P2002')) {
          throw new ConflictException('Attendance already recorded');
        }

        throw error;
      }
    }

    throw new ConflictException('Attendance was updated concurrently, please retry');
  }

  private isPrismaErrorCode(error: unknown, code: string) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
  }
}
