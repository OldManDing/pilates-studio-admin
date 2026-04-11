import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BookingSource, BookingStatus } from '../../common/enums/domain.enums';
import { BookingsService } from './bookings.service';

const createBooking = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'booking-1',
  bookingCode: 'B00000001',
  memberId: 'member-1',
  sessionId: 'session-1',
  source: BookingSource.ADMIN,
  status: BookingStatus.CONFIRMED,
  bookedAt: new Date('2025-01-01T10:00:00.000Z'),
  createdAt: new Date('2025-01-01T10:00:00.000Z'),
  updatedAt: new Date('2025-01-01T10:00:00.000Z'),
  member: {
    id: 'member-1',
    name: 'Alice',
    phone: '13800000000',
    remainingCredits: 8,
  },
  session: {
    id: 'session-1',
    course: { id: 'course-1', name: 'Morning Flow' },
    coach: { id: 'coach-1', name: 'Coach Lin' },
  },
  attendance: null,
  ...overrides,
});

const createSession = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'session-1',
  capacity: 10,
  bookedCount: 2,
  course: { id: 'course-1', name: 'Morning Flow' },
  _count: { bookings: 2 },
  ...overrides,
});

describe('BookingsService', () => {
  let service: BookingsService;
  let notificationsService: {
    createFromSetting: jest.Mock;
  };
  let prisma: {
    booking: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    courseSession: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    member: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    notificationsService = {
      createFromSetting: jest.fn().mockResolvedValue(null),
    };

    prisma = {
      booking: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      courseSession: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      member: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));

    service = new BookingsService(prisma as unknown as never, notificationsService as never);
  });

  describe('date range filtering', () => {
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
      await expect(
        service.findAll({ page: 1, pageSize: 10, from: '2025-01-02', to: '2025-01-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('booking lifecycle', () => {
    it('rejects create when the session cannot be found', async () => {
      prisma.courseSession.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ memberId: 'member-1', sessionId: 'missing-session', source: BookingSource.ADMIN }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects create when the session is fully booked', async () => {
      prisma.courseSession.findUnique.mockResolvedValue(createSession({ capacity: 2, _count: { bookings: 2 } }));

      await expect(
        service.create({ memberId: 'member-1', sessionId: 'session-1', source: BookingSource.ADMIN }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects create when the member already booked the same session', async () => {
      prisma.courseSession.findUnique.mockResolvedValue(createSession());
      prisma.member.findUnique.mockResolvedValue({ id: 'member-1' });
      prisma.booking.findFirst.mockResolvedValue(createBooking());

      await expect(
        service.create({ memberId: 'member-1', sessionId: 'session-1', source: BookingSource.ADMIN }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a confirmed booking and increments bookedCount', async () => {
      prisma.courseSession.findUnique.mockResolvedValue(createSession());
      prisma.member.findUnique.mockResolvedValue({ id: 'member-1' });
      prisma.booking.findFirst.mockResolvedValue(null);
      prisma.booking.create.mockResolvedValue(createBooking());
      prisma.booking.count.mockResolvedValue(1);

      const result = await service.create({ memberId: 'member-1', sessionId: 'session-1', source: BookingSource.ADMIN });

      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: BookingStatus.CONFIRMED,
            memberId: 'member-1',
          }),
        }),
      );
      expect(prisma.courseSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { bookedCount: { increment: 1 } },
      });
      expect(notificationsService.createFromSetting).toHaveBeenCalledWith(
        'booking_confirmation',
        expect.objectContaining({
          type: 'BOOKING_CONFIRMATION',
          memberId: 'member-1',
        }),
      );
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });

    it('resolves SELF bookings through the requester mini-user id', async () => {
      prisma.member.findUnique
        .mockResolvedValueOnce({ id: 'member-1' })
        .mockResolvedValueOnce({ id: 'member-1' });
      prisma.courseSession.findUnique.mockResolvedValue(createSession());
      prisma.booking.findFirst.mockResolvedValue(null);
      prisma.booking.create.mockResolvedValue(createBooking());
      prisma.booking.count.mockResolvedValue(1);

      await service.create(
        { memberId: 'SELF', sessionId: 'session-1', source: BookingSource.MINI_PROGRAM },
        'mini-user-1',
      );

      expect(prisma.member.findUnique).toHaveBeenNthCalledWith(1, { where: { miniUserId: 'mini-user-1' } });
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 'member-1',
            source: BookingSource.MINI_PROGRAM,
          }),
        }),
      );
    });

    it('rejects SELF bookings without a requester user id', async () => {
      await expect(
        service.create({ memberId: 'SELF', sessionId: 'session-1', source: BookingSource.MINI_PROGRAM }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cancels a booking and decrements bookedCount', async () => {
      prisma.booking.findUnique.mockResolvedValue(createBooking({ status: BookingStatus.CONFIRMED, member: { id: 'member-1', name: 'Alice', miniUserId: 'mini-user-1' } }));
      prisma.booking.update.mockResolvedValue(createBooking({ status: BookingStatus.CANCELLED }));

      const result = await service.updateStatus('booking-1', { status: BookingStatus.CANCELLED });

      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'booking-1' },
          data: { status: BookingStatus.CANCELLED },
        }),
      );
      expect(prisma.courseSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { bookedCount: { decrement: 1 } },
      });
      expect(notificationsService.createFromSetting).toHaveBeenCalledWith(
        'booking_cancelled',
        expect.objectContaining({
          type: 'BOOKING_CANCELLED',
          memberId: 'member-1',
          miniUserId: 'mini-user-1',
        }),
      );
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('rejects status updates for cancelled bookings', async () => {
      prisma.booking.findUnique.mockResolvedValue(createBooking({ status: BookingStatus.CANCELLED }));

      await expect(
        service.updateStatus('booking-1', { status: BookingStatus.COMPLETED }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates non-cancel transitions without changing bookedCount', async () => {
      prisma.booking.findUnique.mockResolvedValue(createBooking({ status: BookingStatus.CONFIRMED }));
      prisma.booking.update.mockResolvedValue(createBooking({ status: BookingStatus.COMPLETED }));

      const result = await service.updateStatus('booking-1', { status: BookingStatus.COMPLETED });

      expect(prisma.courseSession.update).not.toHaveBeenCalled();
      expect(result.status).toBe(BookingStatus.COMPLETED);
    });

    it('removes non-cancelled bookings and decrements bookedCount', async () => {
      prisma.booking.findUnique.mockResolvedValue(createBooking({ status: BookingStatus.CONFIRMED }));
      prisma.booking.delete.mockResolvedValue(createBooking());

      const result = await service.remove('booking-1');

      expect(prisma.courseSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { bookedCount: { decrement: 1 } },
      });
      expect(prisma.booking.delete).toHaveBeenCalledWith({ where: { id: 'booking-1' } });
      expect(result).toEqual({ success: true });
    });

    it('removes cancelled bookings without touching bookedCount', async () => {
      prisma.booking.findUnique.mockResolvedValue(createBooking({ status: BookingStatus.CANCELLED }));
      prisma.booking.delete.mockResolvedValue(createBooking({ status: BookingStatus.CANCELLED }));

      await service.remove('booking-1');

      expect(prisma.courseSession.update).not.toHaveBeenCalled();
      expect(prisma.booking.delete).toHaveBeenCalledWith({ where: { id: 'booking-1' } });
    });

    it('delegates cancel to updateStatus with CANCELLED state', async () => {
      const updateStatusSpy = jest
        .spyOn(service, 'updateStatus')
        .mockResolvedValue(createBooking({ status: BookingStatus.CANCELLED }) as never);

      await service.cancel('booking-1', 'can not attend');

      expect(updateStatusSpy).toHaveBeenCalledWith('booking-1', { status: BookingStatus.CANCELLED });
    });
  });
});
