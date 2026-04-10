import { ConflictException, NotFoundException } from '@nestjs/common';
import { CoursesService } from './courses.service';

const createCourse = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'course-1',
  courseCode: 'CRS000001',
  name: 'Morning Flow',
  type: 'Reformer',
  level: '初级',
  durationMinutes: 50,
  capacity: 8,
  isActive: true,
  coachId: 'coach-1',
  coach: { id: 'coach-1', name: '李静' },
  sessions: [],
  _count: { sessions: 0 },
  ...overrides,
});

describe('CoursesService', () => {
  let service: CoursesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      course: {
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new CoursesService(prisma);
  });

  it('creates a course with generated course code', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    prisma.course.create.mockResolvedValue(createCourse());

    const result = await service.create({
      name: 'Morning Flow',
      type: 'Reformer',
      level: '初级',
      durationMinutes: 50,
      capacity: 8,
      coachId: 'coach-1',
    });

    expect(prisma.course.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          courseCode: 'CRS000001',
          isActive: true,
        }),
      }),
    );
    expect(result.name).toBe('Morning Flow');
  });

  it('rejects create when the derived course code already exists', async () => {
    prisma.course.findUnique.mockResolvedValue(createCourse());

    await expect(
      service.create({
        name: 'Morning Flow',
        type: 'Reformer',
        level: '初级',
        durationMinutes: 50,
        capacity: 8,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws not found when course does not exist', async () => {
    prisma.course.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents deleting courses that still have active sessions', async () => {
    prisma.course.findUnique.mockResolvedValue(createCourse({ sessions: [{ id: 'session-1' }] }));

    await expect(service.remove('course-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('deletes courses without active sessions', async () => {
    prisma.course.findUnique.mockResolvedValue(createCourse({ sessions: [] }));
    prisma.course.delete.mockResolvedValue(createCourse({ sessions: [] }));

    const result = await service.remove('course-1');

    expect(prisma.course.delete).toHaveBeenCalledWith({ where: { id: 'course-1' } });
    expect(result).toEqual({ success: true });
  });
});
