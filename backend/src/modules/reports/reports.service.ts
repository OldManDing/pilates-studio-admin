import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, AttendanceStatus, TransactionStatus } from '../../common/enums/domain.enums';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getMembersReport() {
    const [
      totalMembers,
      activeMembers,
      newMembersThisMonth,
      membersByPlan,
    ] = await Promise.all([
      this.prisma.member.count(),
      this.prisma.member.count({ where: { status: 'ACTIVE' } }),
      this.prisma.member.count({
        where: {
          joinedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      this.prisma.membershipPlan.findMany({
        include: {
          _count: {
            select: { members: true },
          },
        },
      }),
    ]);

    return {
      totalMembers,
      activeMembers,
      newMembersThisMonth,
      membersByPlan: membersByPlan.map((plan) => ({
        planId: plan.id,
        planName: plan.name,
        memberCount: plan._count.members,
      })),
    };
  }

  async getBookingsReport(from: string, to: string) {
    const where = {
      bookedAt: this.buildDateRange(from, to),
    };

    const [
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      noShowBookings,
      bookingsByCourse,
    ] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.count({ where: { ...where, status: BookingStatus.CONFIRMED } }),
      this.prisma.booking.count({ where: { ...where, status: BookingStatus.CANCELLED } }),
      this.prisma.booking.count({ where: { ...where, status: BookingStatus.NO_SHOW } }),
      this.prisma.booking.groupBy({
        by: ['sessionId'],
        where,
        _count: { id: true },
      }),
    ]);

    return {
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      noShowBookings,
      bookingsByCourse,
    };
  }

  async getTransactionsReport(from: string, to: string) {
    const where = {
      happenedAt: this.buildDateRange(from, to),
    };

    const [
      totalTransactions,
      completedRevenue,
      refundedAmount,
      transactionsByKind,
    ] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.aggregate({
        where: { ...where, status: TransactionStatus.COMPLETED },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, status: TransactionStatus.REFUNDED },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['kind'],
        where: { ...where, status: TransactionStatus.COMPLETED },
        _sum: { amountCents: true },
        _count: { id: true },
      }),
    ]);

    return {
      totalTransactions,
      completedRevenueCents: completedRevenue._sum.amountCents || 0,
      refundedAmountCents: refundedAmount._sum.amountCents || 0,
      transactionsByKind,
    };
  }

  async getAttendanceReport(from: string, to: string) {
    const where = {
      createdAt: this.buildDateRange(from, to),
    };

    const [
      totalAttendance,
      checkedIn,
      completed,
      absent,
      attendanceBySession,
    ] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.count({ where: { ...where, status: AttendanceStatus.CHECKED_IN } }),
      this.prisma.attendance.count({ where: { ...where, status: AttendanceStatus.COMPLETED } }),
      this.prisma.attendance.count({ where: { ...where, status: AttendanceStatus.ABSENT } }),
      this.prisma.attendance.groupBy({
        by: ['sessionId'],
        where,
        _count: { id: true },
      }),
    ]);

    return {
      totalAttendance,
      checkedIn,
      completed,
      absent,
      attendanceBySession,
    };
  }

  private buildDateRange(from: string, to: string) {
    const fromDate = this.parseDateValue(from, false, 'from');
    const toDate = this.parseDateValue(to, true, 'to');

    if (fromDate > toDate) {
      throw new BadRequestException('Invalid date range: from must be earlier than to');
    }

    return {
      gte: fromDate,
      lte: toDate,
    };
  }

  private parseDateValue(value: string, endOfDay: boolean, fieldName: 'from' | 'to'): Date {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${fieldName} date value: ${value}`);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && endOfDay) {
      parsed.setHours(23, 59, 59, 999);
    }

    return parsed;
  }
}
