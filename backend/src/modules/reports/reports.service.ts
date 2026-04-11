import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, AttendanceStatus, TransactionStatus } from '../../common/enums/domain.enums';
import { buildDateRange } from '../../common/utils/date-range';

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

  async getExpiringSoonCount(days = 30) {
    const now = Date.now();
    const threshold = now + days * 24 * 60 * 60 * 1000;

    const members = await this.prisma.member.findMany({
      where: {
        status: 'ACTIVE',
        plan: {
          durationDays: { not: null },
        },
      },
      include: {
        plan: {
          select: {
            durationDays: true,
          },
        },
      },
    });

    return members.filter((member) => {
      if (!member.plan?.durationDays) return false;
      const end = new Date(member.joinedAt).getTime() + Number(member.plan.durationDays) * 24 * 60 * 60 * 1000;
      return end >= now && end <= threshold;
    }).length;
  }

  async getBookingsReport(from: string, to: string) {
    const where = {
      bookedAt: buildDateRange(from, to, 'reports.bookings'),
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
      happenedAt: buildDateRange(from, to, 'reports.transactions'),
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
      createdAt: buildDateRange(from, to, 'reports.attendance'),
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
}
