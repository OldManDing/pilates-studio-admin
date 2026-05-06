import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, AttendanceStatus, TransactionStatus, TransactionKind } from '../../common/enums/domain.enums';
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
    const safeDays = Math.max(1, Math.floor(days));
    const now = Date.now();
    const threshold = now + safeDays * 24 * 60 * 60 * 1000;
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
            id: true,
            durationDays: true,
          },
        },
      },
    });

    const expiringFlags = await Promise.all(members.map(async (member) => {
      if (!member.plan?.durationDays || !member.planId) {
        return false;
      }

      const completedRenewalCount = await this.prisma.transaction.count({
        where: {
          memberId: member.id,
          planId: member.planId,
          kind: TransactionKind.MEMBERSHIP_RENEWAL,
          status: TransactionStatus.COMPLETED,
        },
      });

      const end = new Date(member.joinedAt).getTime() + Number(member.plan.durationDays) * (1 + completedRenewalCount) * 24 * 60 * 60 * 1000;
      return end >= now && end <= threshold;
    }));

    return expiringFlags.filter(Boolean).length;
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
      refundKindAmount,
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
      this.prisma.transaction.aggregate({
        where: { ...where, kind: TransactionKind.REFUND },
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
      refundedAmountCents: Math.abs(refundedAmount._sum.amountCents || 0) + Math.abs(refundKindAmount._sum.amountCents || 0),
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
