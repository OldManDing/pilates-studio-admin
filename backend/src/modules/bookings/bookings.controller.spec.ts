import { BookingStatus } from '../../common/enums/domain.enums';
import { BookingsController } from './bookings.controller';

describe('BookingsController', () => {
  const bookingsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findMyBookings: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
    cancel: jest.fn(),
  };

  const controller = new BookingsController(bookingsService as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegates create and list calls', async () => {
    bookingsService.create.mockResolvedValue({ id: 'booking-1' });
    bookingsService.findAll.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } });

    await expect(
      controller.create({ memberId: 'member-1', sessionId: 'session-1' } as never, 'admin-1'),
    ).resolves.toEqual({ id: 'booking-1' });
    await expect(controller.findAll({ page: 1, pageSize: 10 } as never)).resolves.toEqual({
      data: [],
      meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
  });

  it('delegates member-scoped booking queries', async () => {
    bookingsService.findMyBookings.mockResolvedValue({ data: [{ id: 'booking-1' }], meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 } });

    await expect(controller.getMyBookings('mini-user-1', { status: BookingStatus.CONFIRMED } as never)).resolves.toEqual({
      data: [{ id: 'booking-1' }],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
  });

  it('delegates status update, deletion, and cancel operations', async () => {
    bookingsService.updateStatus.mockResolvedValue({ id: 'booking-1', status: BookingStatus.CANCELLED });
    bookingsService.remove.mockResolvedValue({ success: true });
    bookingsService.cancel.mockResolvedValue({ id: 'booking-1', status: BookingStatus.CANCELLED });

    await expect(controller.updateStatus('booking-1', { status: BookingStatus.CANCELLED } as never)).resolves.toEqual({
      id: 'booking-1',
      status: BookingStatus.CANCELLED,
    });
    await expect(controller.remove('booking-1')).resolves.toEqual({ success: true });
    await expect(controller.cancel('booking-1', 'No longer available')).resolves.toEqual({
      id: 'booking-1',
      status: BookingStatus.CANCELLED,
    });
  });
});
