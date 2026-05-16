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
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      courseSession: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    service = new CoursesService(prisma);
  });

  it('creates a course with generated course code', async () => {
    prisma.course.findFirst.mockResolvedValue(null);
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
          courseCode: expect.stringMatching(/^CRS[A-Z0-9]+$/),
          isActive: true,
        }),
      }),
    );
    expect(result.name).toBe('Morning Flow');
  });

  it('ignores browser fakepath values when saving cover images', async () => {
    prisma.course.findFirst.mockResolvedValue(null);
    prisma.course.create.mockResolvedValue(createCourse({ coverImageUrl: null }));

    await service.create({
      name: 'Course With Fakepath',
      type: 'MAT',
      level: '初级',
      durationMinutes: 50,
      capacity: 8,
      coverImageUrl: 'C:\\fakepath\\cover.png',
    });

    expect(prisma.course.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ coverImageUrl: null }),
      }),
    );
  });

  it('rejects create when the derived course code already exists', async () => {
    prisma.course.findFirst.mockResolvedValue(createCourse());

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

  it('filters courses by active state when requested', async () => {
    prisma.course.findMany.mockResolvedValue([createCourse()]);
    prisma.course.count.mockResolvedValue(1);

    const result = await service.findAll({ page: 1, pageSize: 6, isActive: true });

    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
        skip: 0,
        take: 6,
      }),
    );
    expect(prisma.course.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ isActive: true }),
    });
    expect(result.meta.total).toBe(1);
  });

  it('does not return saved fakepath values in course lists', async () => {
    prisma.course.findMany.mockResolvedValue([createCourse({ coverImageUrl: 'C:\\fakepath\\cover.png' })]);
    prisma.course.count.mockResolvedValue(1);

    const result = await service.findAll({ page: 1, pageSize: 6 });

    expect(result.data[0].coverImageUrl).toBeNull();
  });

  it('throws not found when course does not exist', async () => {
    prisma.course.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents deleting courses that still have related sessions', async () => {
    prisma.course.findUnique.mockResolvedValue(createCourse({ sessions: [{ id: 'session-1' }] }));
    prisma.courseSession.count.mockResolvedValue(1);

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
