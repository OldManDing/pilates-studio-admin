import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CourseSessionsService } from './course-sessions.service';

const createSession = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'session-1',
  sessionCode: 'SES000001',
  courseId: 'course-1',
  coachId: 'coach-1',
  startsAt: new Date('2026-04-10T08:00:00.000Z'),
  endsAt: new Date('2026-04-10T08:50:00.000Z'),
  capacity: 8,
  bookedCount: 0,
  course: { id: 'course-1', name: 'Morning Flow', capacity: 8 },
  coach: { id: 'coach-1', name: '李静' },
  bookings: [],
  ...overrides,
});

describe('CourseSessionsService', () => {
  let service: CourseSessionsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      course: {
        findUnique: jest.fn(),
      },
      coach: {
        findUnique: jest.fn(),
      },
      courseSession: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };

    service = new CourseSessionsService(prisma);
  });

  it('creates a session with generated session code', async () => {
    prisma.course.findUnique.mockResolvedValue({ id: 'course-1', capacity: 8 });
    prisma.coach.findUnique.mockResolvedValue({ id: 'coach-1' });
    prisma.courseSession.findFirst.mockResolvedValue(null);
    prisma.courseSession.create.mockResolvedValue(createSession());

    const result = await service.create({
      courseId: 'course-1',
      coachId: 'coach-1',
      startsAt: '2026-04-10T08:00:00.000Z',
      endsAt: '2026-04-10T08:50:00.000Z',
    });

    expect(prisma.courseSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionCode: 'SES000001',
          bookedCount: 0,
        }),
      }),
    );
    expect(result.sessionCode).toBe('SES000001');
  });

  it('returns paginated upcoming sessions', async () => {
    prisma.courseSession.findMany.mockResolvedValue([createSession()]);
    prisma.courseSession.count.mockResolvedValue(1);

    const result = await service.findUpcoming({ page: 1, pageSize: 10 });

    expect(result.meta).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
    expect(result.data[0].id).toBe('session-1');
  });

  it('rejects create when course is missing', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    prisma.coach.findUnique.mockResolvedValue({ id: 'coach-1' });

    await expect(
      service.create({
        courseId: 'course-1',
        coachId: 'coach-1',
        startsAt: '2026-04-10T08:00:00.000Z',
        endsAt: '2026-04-10T08:50:00.000Z',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects create when coach has a conflicting session', async () => {
    prisma.course.findUnique.mockResolvedValue({ id: 'course-1', capacity: 8 });
    prisma.coach.findUnique.mockResolvedValue({ id: 'coach-1' });
    prisma.courseSession.findFirst.mockResolvedValue({ id: 'existing-session' });

    await expect(
      service.create({
        courseId: 'course-1',
        coachId: 'coach-1',
        startsAt: '2026-04-10T08:00:00.000Z',
        endsAt: '2026-04-10T08:50:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects updates that shrink capacity below bookedCount', async () => {
    prisma.courseSession.findUnique.mockResolvedValue(createSession({ bookedCount: 5 }));

    await expect(service.update('session-1', { capacity: 4 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates session timing and capacity when inputs are valid', async () => {
    prisma.courseSession.findUnique.mockResolvedValue(createSession({ bookedCount: 2 }));
    prisma.courseSession.findFirst.mockResolvedValue(null);
    prisma.courseSession.update.mockResolvedValue(
      createSession({ capacity: 10, startsAt: new Date('2026-04-10T09:00:00.000Z') }),
    );

    const result = await service.update('session-1', {
      startsAt: '2026-04-10T09:00:00.000Z',
      endsAt: '2026-04-10T09:50:00.000Z',
      capacity: 10,
    });

    expect(prisma.courseSession.update).toHaveBeenCalled();
    expect(result.capacity).toBe(10);
  });

  it('prevents deleting sessions that still have bookings', async () => {
    prisma.courseSession.findUnique.mockResolvedValue(createSession({ bookedCount: 2, bookings: [{ id: 'booking-1' }] }));

    await expect(service.remove('session-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('deletes empty sessions successfully', async () => {
    prisma.courseSession.findUnique.mockResolvedValue(createSession({ bookedCount: 0, bookings: [] }));
    prisma.courseSession.delete.mockResolvedValue(createSession({ bookedCount: 0, bookings: [] }));

    const result = await service.remove('session-1');

    expect(prisma.courseSession.delete).toHaveBeenCalledWith({ where: { id: 'session-1' } });
    expect(result).toEqual({ success: true });
  });

  it('computes available seats from capacity and bookedCount', async () => {
    prisma.courseSession.findUnique.mockResolvedValue(createSession({ capacity: 10, bookedCount: 4 }));

    const result = await service.getAvailableSeats('session-1');

    expect(result).toEqual({ availableSeats: 6 });
  });

  it('finds sessions by course id with mapped bookedCount', async () => {
    prisma.courseSession.findMany.mockResolvedValue([createSession({ bookedCount: 3 })]);

    const result = await service.findByCourseId('course-1', { upcoming: true });

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].bookedCount).toBe(3);
  });
});
