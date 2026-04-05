import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';

describe('ReportsService date range filtering', () => {
  let service: ReportsService;
  let prisma: {
    booking: {
      count: jest.Mock;
      groupBy: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
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
});
