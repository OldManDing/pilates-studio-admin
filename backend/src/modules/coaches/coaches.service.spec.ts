import { ConflictException, NotFoundException } from '@nestjs/common';
import { CoachStatus } from '../../common/enums/domain.enums';
import { CoachesService } from './coaches.service';

const createCoach = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'coach-1',
  coachCode: 'C000001',
  name: '李静',
  phone: '13800000000',
  email: 'coach@example.com',
  status: CoachStatus.ACTIVE,
  specialties: [],
  certificates: [],
  courses: [],
  sessions: [],
  ...overrides,
});

describe('CoachesService', () => {
  let service: CoachesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      coach: {
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      coachTag: {
        deleteMany: jest.fn(),
      },
      coachCertificate: {
        deleteMany: jest.fn(),
      },
      courseSession: {
        count: jest.fn(),
      },
      booking: {
        count: jest.fn(),
      },
    };

    service = new CoachesService(prisma);
  });

  it('creates a coach with generated code and related tags', async () => {
    prisma.coach.findFirst.mockResolvedValue(null);
    prisma.coach.create.mockResolvedValue(createCoach());

    const result = await service.create({
      name: '李静',
      phone: '13800000000',
      email: 'coach@example.com',
      specialties: ['Reformer'],
      certificates: ['BASI'],
    });

    expect(prisma.coach.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          coachCode: 'C000001',
          status: CoachStatus.ACTIVE,
          specialties: { create: [{ value: 'Reformer' }] },
          certificates: { create: [{ value: 'BASI' }] },
        }),
      }),
    );
    expect(result.name).toBe('李静');
  });

  it('rejects create when phone or email already exists', async () => {
    prisma.coach.findFirst.mockResolvedValue(createCoach());

    await expect(
      service.create({ name: '李静', phone: '13800000000', email: 'coach@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws not found when coach does not exist', async () => {
    prisma.coach.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates specialties and certificates by recreating relations', async () => {
    prisma.coach.findUnique.mockResolvedValue(createCoach());
    prisma.coach.update.mockResolvedValue(createCoach({ specialties: [{ value: 'Tower' }] }));

    await service.update('coach-1', {
      specialties: ['Tower'],
      certificates: ['ACE'],
    });

    expect(prisma.coachTag.deleteMany).toHaveBeenCalledWith({ where: { coachId: 'coach-1' } });
    expect(prisma.coachCertificate.deleteMany).toHaveBeenCalledWith({ where: { coachId: 'coach-1' } });
    expect(prisma.coach.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'coach-1' },
        data: expect.objectContaining({
          specialties: { create: [{ value: 'Tower' }] },
          certificates: { create: [{ value: 'ACE' }] },
        }),
      }),
    );
  });

  it('returns coach stats from session and booking counts', async () => {
    prisma.coach.findUnique.mockResolvedValue(createCoach());
    prisma.courseSession.count.mockResolvedValueOnce(8).mockResolvedValueOnce(3);
    prisma.booking.count.mockResolvedValue(20);

    const result = await service.getStats('coach-1');

    expect(result.stats).toEqual({
      totalSessions: 8,
      completedSessions: 3,
      upcomingSessions: 5,
      totalBookings: 20,
    });
  });
});
