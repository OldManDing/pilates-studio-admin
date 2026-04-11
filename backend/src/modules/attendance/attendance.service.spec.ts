import { ConflictException, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, BookingStatus } from '../../common/enums/domain.enums';
import { AttendanceService } from './attendance.service';

const createBooking = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'booking-1',
  bookingCode: 'B00000001',
  memberId: 'member-1',
  sessionId: 'session-1',
  status: BookingStatus.CONFIRMED,
  member: { id: 'member-1', name: '林若溪' },
  session: { id: 'session-1', course: { id: 'course-1', name: 'Morning Flow' } },
  ...overrides,
});

const createAttendance = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'attendance-1',
  bookingId: 'booking-1',
  memberId: 'member-1',
  sessionId: 'session-1',
  status: AttendanceStatus.CHECKED_IN,
  notes: '',
  member: { id: 'member-1', name: '林若溪' },
  session: { id: 'session-1', course: { id: 'course-1', name: 'Morning Flow' }, coach: { id: 'coach-1', name: '李静' } },
  booking: { id: 'booking-1', bookingCode: 'B00000001' },
  ...overrides,
});

describe('AttendanceService', () => {
  let service: AttendanceService;
  let notificationsService: {
    createFromSetting: jest.Mock;
  };
  let prisma: any;

  beforeEach(() => {
    notificationsService = {
      createFromSetting: jest.fn().mockResolvedValue(null),
    };

    prisma = {
      booking: {
        findUnique: jest.fn(),
      },
      attendance: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      courseReview: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new AttendanceService(prisma, notificationsService as never);
  });

  it('creates a new attendance check-in when none exists', async () => {
    prisma.booking.findUnique.mockResolvedValue(createBooking());
    prisma.attendance.findUnique.mockResolvedValue(null);
    prisma.attendance.create.mockResolvedValue(createAttendance());

    const result = await service.checkIn({ bookingId: 'booking-1', notes: 'Arrived early' } as never);

    expect(prisma.attendance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: AttendanceStatus.CHECKED_IN,
          notes: 'Arrived early',
        }),
      }),
    );
    expect(notificationsService.createFromSetting).toHaveBeenCalledWith(
      'attendance_checked_in',
      expect.objectContaining({
        type: 'ATTENDANCE_CHECKED_IN',
        memberId: 'member-1',
      }),
    );
    expect(result.status).toBe(AttendanceStatus.CHECKED_IN);
  });

  it('rejects check-in for cancelled bookings', async () => {
    prisma.booking.findUnique.mockResolvedValue(createBooking({ status: BookingStatus.CANCELLED }));

    await expect(service.checkIn({ bookingId: 'booking-1' } as never)).rejects.toBeInstanceOf(ConflictException);
  });

  it('completes a checked-in session', async () => {
    prisma.attendance.findUnique.mockResolvedValue(createAttendance({ status: AttendanceStatus.CHECKED_IN }));
    prisma.attendance.update.mockResolvedValue(createAttendance({ status: AttendanceStatus.COMPLETED }));

    const result = await service.completeSession('attendance-1', 'Completed');

    expect(prisma.attendance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'attendance-1' },
        data: expect.objectContaining({ status: AttendanceStatus.COMPLETED }),
      }),
    );
    expect(result.status).toBe(AttendanceStatus.COMPLETED);
  });

  it('throws when attendance record is missing', async () => {
    prisma.attendance.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a course review for completed attendance', async () => {
    prisma.attendance.findUnique.mockResolvedValue(createAttendance({ status: AttendanceStatus.COMPLETED }));
    prisma.courseReview.findUnique.mockResolvedValue(null);
    prisma.courseReview.create.mockResolvedValue({ id: 'review-1', attendanceId: 'attendance-1', rating: 5, comment: '很棒' });

    const result = await service.submitReview('attendance-1', { rating: 5, comment: '很棒' } as never);

    expect(prisma.courseReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attendanceId: 'attendance-1',
          memberId: 'member-1',
          sessionId: 'session-1',
          rating: 5,
        }),
      }),
    );
    expect(result.id).toBe('review-1');
  });

  it('updates an existing course review if one already exists', async () => {
    prisma.attendance.findUnique.mockResolvedValue(createAttendance({ status: AttendanceStatus.COMPLETED }));
    prisma.courseReview.findUnique.mockResolvedValue({ id: 'review-1', attendanceId: 'attendance-1' });
    prisma.courseReview.update.mockResolvedValue({ id: 'review-1', attendanceId: 'attendance-1', rating: 4, comment: '更新评价' });

    const result = await service.submitReview('attendance-1', { rating: 4, comment: '更新评价' } as never);

    expect(prisma.courseReview.update).toHaveBeenCalledWith({
      where: { attendanceId: 'attendance-1' },
      data: { rating: 4, comment: '更新评价' },
    });
    expect(result.rating).toBe(4);
  });

  it('rejects course review submission before session completion', async () => {
    prisma.attendance.findUnique.mockResolvedValue(createAttendance({ status: AttendanceStatus.CHECKED_IN }));

    await expect(service.submitReview('attendance-1', { rating: 5 } as never)).rejects.toBeInstanceOf(ConflictException);
  });
});
