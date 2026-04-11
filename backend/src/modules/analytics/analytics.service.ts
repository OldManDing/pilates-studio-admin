import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, MemberStatus, TransactionStatus } from '../../common/enums/domain.enums';
import { buildDateRange } from '../../common/utils/date-range';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardOverview(from?: string, to?: string) {
    const bookingRange = buildDateRange(from, to, 'analytics.bookings');
    const transactionRange = buildDateRange(from, to, 'analytics.transactions');

    const [
      totalMembers,
      activeMembers,
      totalBookings,
      confirmedBookings,
    ] = await Promise.all([
      this.prisma.member.count(),
      this.prisma.member.count({ where: { status: MemberStatus.ACTIVE } }),
      this.prisma.booking.count({ where: bookingRange ? { bookedAt: bookingRange } : undefined }),
      this.prisma.booking.count({
        where: {
          ...(bookingRange ? { bookedAt: bookingRange } : {}),
          status: BookingStatus.CONFIRMED,
        },
      }),
    ]);

    const goalAchievement = totalMembers > 0 ? Math.min(150, Math.round((activeMembers / Math.max(1, totalMembers * 0.8)) * 100)) : 0;
    const retentionRate = totalMembers > 0 ? Number(((activeMembers / totalMembers) * 100).toFixed(1)) : 0;
    const avgOccupancy = totalBookings > 0 ? Number(((confirmedBookings / totalBookings) * 100).toFixed(1)) : 0;

    const popularity = await this.prisma.transaction.groupBy({
      by: ['kind'],
      where: {
        ...(transactionRange ? { happenedAt: transactionRange } : {}),
        status: TransactionStatus.COMPLETED,
      },
      _count: { id: true },
    });

    return {
      stats: {
        goalAchievement,
        retentionRate,
        avgOccupancy,
        satisfaction: null,
      },
      transactionPopularity: popularity.map((item) => ({
        label: item.kind,
        value: item._count.id,
      })),
    };
  }

  async getBookingDistribution(from?: string, to?: string) {
    const startsAtRange = buildDateRange(from, to, 'analytics.bookingDistribution');

    const sessions = await this.prisma.courseSession.findMany({
      where: startsAtRange ? { startsAt: startsAtRange } : undefined,
      select: {
        startsAt: true,
        bookedCount: true,
      },
    });

    const buckets = {
      上午: 0,
      中午: 0,
      下午: 0,
      晚间: 0,
    } as Record<string, number>;

    sessions.forEach((session) => {
      const hour = new Date(session.startsAt).getHours();
      if (hour < 11) buckets['上午'] += session.bookedCount;
      else if (hour < 14) buckets['中午'] += session.bookedCount;
      else if (hour < 18) buckets['下午'] += session.bookedCount;
      else buckets['晚间'] += session.bookedCount;
    });

    return Object.entries(buckets).map(([label, value]) => ({ label, value }));
  }

  async getMemberRetentionTrend(months = 6) {
    const points: Array<{ month: string; totalMembers: number; activeMembers: number; newMembers: number }> = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i -= 1) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const [totalMembers, activeMembers, newMembers] = await Promise.all([
        this.prisma.member.count({ where: { joinedAt: { lte: monthEnd } } }),
        this.prisma.member.count({ where: { status: MemberStatus.ACTIVE, joinedAt: { lte: monthEnd } } }),
        this.prisma.member.count({ where: { joinedAt: { gte: monthStart, lte: monthEnd } } }),
      ]);

      points.push({
        month: `${monthStart.getMonth() + 1}月`,
        totalMembers,
        activeMembers,
        newMembers,
      });
    }

    return points;
  }
}
