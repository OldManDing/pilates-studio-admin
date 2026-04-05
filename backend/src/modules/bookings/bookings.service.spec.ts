import { BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';

describe('BookingsService date range filtering', () => {
  let service: BookingsService;
  let prisma: {
    booking: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      booking: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    service = new BookingsService(prisma as any);
  });

  it('includes full day when "to" is a date-only string', async () => {
    await service.findAll({ page: 1, pageSize: 10, to: '2025-01-01' });

    const whereArg = prisma.booking.findMany.mock.calls[0][0].where;
    const toDate: Date = whereArg.bookedAt.lte;

    expect(toDate).toBeInstanceOf(Date);
    expect(toDate.getHours()).toBe(23);
    expect(toDate.getMinutes()).toBe(59);
    expect(toDate.getSeconds()).toBe(59);
    expect(toDate.getMilliseconds()).toBe(999);
  });

  it('throws BadRequestException for invalid date strings', async () => {
    await expect(service.findAll({ page: 1, pageSize: 10, to: 'not-a-date' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequestException when from is later than to', async () => {
    await expect(service.findAll({ page: 1, pageSize: 10, from: '2025-01-02', to: '2025-01-01' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
