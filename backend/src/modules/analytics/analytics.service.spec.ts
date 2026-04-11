import { BookingStatus, MemberStatus, TransactionStatus } from '../../common/enums/domain.enums';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: any;
  let configService: any;

  beforeEach(() => {
    prisma = {
      member: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      booking: {
        count: jest.fn(),
      },
      transaction: {
        groupBy: jest.fn(),
        aggregate: jest.fn(),
        count: jest.fn(),
      },
      courseSession: {
        findMany: jest.fn(),
      },
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'analytics.monthlyRevenueGoalCents') return 1_000_000;
        return undefined;
      }),
    };

    service = new AnalyticsService(prisma, configService);
  });

  it('builds dashboard overview metrics and transaction popularity', async () => {
    prisma.member.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(10);
    prisma.member.findMany.mockResolvedValue([
      {
        joinedAt: new Date('2026-03-15T00:00:00.000Z'),
        plan: { durationDays: 30 },
      },
      {
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        plan: { durationDays: 365 },
      },
    ]);
    prisma.booking.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8);
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amountCents: 500000 } });
    prisma.transaction.count.mockResolvedValue(1);
    prisma.transaction.groupBy.mockResolvedValue([
      { kind: 'MEMBERSHIP_PURCHASE', _count: { id: 6 } },
    ]);

    const result = await service.getDashboardOverview('2026-04-01', '2026-04-30');

    expect(prisma.member.count).toHaveBeenNthCalledWith(2, { where: { status: MemberStatus.ACTIVE } });
    expect(prisma.booking.count).toHaveBeenNthCalledWith(2, {
      where: expect.objectContaining({ status: BookingStatus.CONFIRMED }),
    });
    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['kind'],
        where: expect.objectContaining({ status: TransactionStatus.COMPLETED }),
      }),
    );
    expect(result).toEqual({
      stats: {
        goalAchievement: 50,
        retentionRate: 100,
        avgOccupancy: 80,
        satisfaction: null,
      },
      transactionPopularity: [{ label: 'MEMBERSHIP_PURCHASE', value: 6 }],
    });
  });

  it('groups booking distribution by time buckets', async () => {
    prisma.courseSession.findMany.mockResolvedValue([
      { startsAt: new Date(2026, 3, 10, 8, 0, 0), bookedCount: 3 },
      { startsAt: new Date(2026, 3, 10, 12, 0, 0), bookedCount: 2 },
      { startsAt: new Date(2026, 3, 10, 16, 0, 0), bookedCount: 4 },
      { startsAt: new Date(2026, 3, 10, 19, 0, 0), bookedCount: 5 },
    ]);

    const result = await service.getBookingDistribution('2026-04-01', '2026-04-30');

    expect(result).toEqual([
      { label: '上午', value: 3 },
      { label: '中午', value: 2 },
      { label: '下午', value: 4 },
      { label: '晚间', value: 5 },
    ]);
  });

  it('builds member retention trend for the requested months', async () => {
    prisma.member.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2);

    const result = await service.getMemberRetentionTrend(2);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({ totalMembers: 4, activeMembers: 3, newMembers: 1 }),
    );
    expect(result[1]).toEqual(
      expect.objectContaining({ totalMembers: 6, activeMembers: 4, newMembers: 2 }),
    );
  });
});
