import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';

describe('ReportsService date range filtering', () => {
  let service: ReportsService;
  let prisma: {
    member: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
    membershipPlan: {
      findMany: jest.Mock;
    };
    booking: {
      count: jest.Mock;
      groupBy: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      member: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      membershipPlan: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      booking: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };

    service = new ReportsService(prisma as any);
  });

  it('includes full day when "to" is a date-only string', async () => {
    await service.getBookingsReport('2025-01-01', '2025-01-01');

    const whereArg = prisma.booking.count.mock.calls[0][0].where;
    const toDate: Date = whereArg.bookedAt.lte;

    expect(toDate).toBeInstanceOf(Date);
    expect(toDate.getHours()).toBe(23);
    expect(toDate.getMinutes()).toBe(59);
    expect(toDate.getSeconds()).toBe(59);
    expect(toDate.getMilliseconds()).toBe(999);
  });

  it('throws BadRequestException for invalid date strings', async () => {
    await expect(service.getBookingsReport('bad-date', '2025-01-01')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.getBookingsReport('2025-01-01', 'still-bad')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when from is later than to', async () => {
    await expect(service.getBookingsReport('2025-01-02', '2025-01-01')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('counts members expiring within the requested window', async () => {
    const now = Date.now();
    const activeExpiringSoon = {
      joinedAt: new Date(now - (365 - 20) * 24 * 60 * 60 * 1000),
      plan: { durationDays: 365 },
    };
    const activeNotSoon = {
      joinedAt: new Date(now - (365 - 90) * 24 * 60 * 60 * 1000),
      plan: { durationDays: 365 },
    };
    prisma.member.findMany.mockResolvedValue([activeExpiringSoon, activeNotSoon]);

    const result = await service.getExpiringSoonCount(30);

    expect(result).toBe(1);
    expect(prisma.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    );
  });
});
