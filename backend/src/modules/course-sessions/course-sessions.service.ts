import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { CreateCourseSessionDto } from './dto/create-course-session.dto';
import { UpdateCourseSessionDto } from './dto/update-course-session.dto';

@Injectable()
export class CourseSessionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCourseSessionDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    this.validateTimeRange(startsAt, endsAt);

    const [course, coach] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: dto.courseId } }),
      this.prisma.coach.findUnique({ where: { id: dto.coachId } }),
    ]);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!coach) {
      throw new NotFoundException('Coach not found');
    }

    await this.ensureSessionConflictFree(dto.coachId, startsAt, endsAt);

    const sessionCode = await this.generateSessionCode();

    return this.prisma.courseSession.create({
      data: {
        sessionCode,
        courseId: dto.courseId,
        coachId: dto.coachId,
        startsAt,
        endsAt,
        capacity: dto.capacity ?? course.capacity,
        bookedCount: 0,
      },
      include: {
        course: {
          select: { id: true, name: true, type: true, level: true, durationMinutes: true },
        },
        coach: {
          select: { id: true, name: true },
        },
      },
    }).then((session) => ({
      ...session,
      bookedCount: session.bookedCount,
    }));
  }

  async findUpcoming(pagination: PaginationDto): Promise<PaginatedResponse<any>> {
    const page = pagination.page ?? 1;
    const pageSize = pagination.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const now = new Date();

    const [data, total] = await Promise.all([
      this.prisma.courseSession.findMany({
        where: {
          startsAt: { gte: now },
        },
        skip,
        take: pageSize,
        include: {
          course: {
            select: { id: true, name: true, type: true, level: true, durationMinutes: true },
          },
          coach: {
            select: { id: true, name: true },
          },
        },
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.courseSession.count({
        where: { startsAt: { gte: now } },
      }),
    ]);

    const sessions = data.map(session => ({
      ...session,
      bookedCount: session.bookedCount,
    }));

    return {
      data: sessions,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const session = await this.prisma.courseSession.findUnique({
      where: { id },
      include: {
        course: true,
        coach: {
          select: { id: true, name: true, bio: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Course session not found');
    }

    return {
      ...session,
      bookedCount: session.bookedCount,
    };
  }

  async update(id: string, dto: UpdateCourseSessionDto) {
    const existing = await this.prisma.courseSession.findUnique({
      where: { id },
      include: {
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          select: { id: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Course session not found');
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;
    const coachId = dto.coachId ?? existing.coachId;
    const capacity = dto.capacity ?? existing.capacity;

    this.validateTimeRange(startsAt, endsAt);

    if (capacity < existing.bookedCount) {
      throw new BadRequestException('Capacity cannot be lower than current booked count');
    }

    if (dto.courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
      if (!course) {
        throw new NotFoundException('Course not found');
      }
    }

    if (dto.coachId) {
      const coach = await this.prisma.coach.findUnique({ where: { id: dto.coachId } });
      if (!coach) {
        throw new NotFoundException('Coach not found');
      }
    }

    await this.ensureSessionConflictFree(coachId, startsAt, endsAt, id);

    return this.prisma.courseSession.update({
      where: { id },
      data: {
        ...(dto.courseId ? { courseId: dto.courseId } : {}),
        ...(dto.coachId ? { coachId: dto.coachId } : {}),
        ...(dto.startsAt ? { startsAt } : {}),
        ...(dto.endsAt ? { endsAt } : {}),
        ...(dto.capacity ? { capacity: dto.capacity } : {}),
      },
      include: {
        course: {
          select: { id: true, name: true, type: true, level: true, durationMinutes: true },
        },
        coach: {
          select: { id: true, name: true },
        },
      },
    }).then((session) => ({
      ...session,
      bookedCount: session.bookedCount,
    }));
  }

  async remove(id: string) {
    const session = await this.prisma.courseSession.findUnique({
      where: { id },
      include: {
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          select: { id: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Course session not found');
    }

    if (session.bookedCount > 0) {
      throw new ConflictException('Cannot delete a session with active bookings');
    }

    await this.prisma.courseSession.delete({ where: { id } });

    return { success: true };
  }

  async getAvailableSeats(id: string) {
    const session = await this.prisma.courseSession.findUnique({
      where: { id },
      include: {
        bookings: false,
      },
    });

    if (!session) {
      throw new NotFoundException('Course session not found');
    }

    const availableSeats = session.capacity - session.bookedCount;
    return { availableSeats: Math.max(0, availableSeats) };
  }

  async findByCourseId(
    courseId: string,
    options: { upcoming?: boolean; from?: string; to?: string },
  ) {
    const where: any = { courseId };

    if (options.upcoming) {
      where.startsAt = { gte: new Date() };
    } else {
      if (options.from || options.to) {
        where.startsAt = {};
        if (options.from) where.startsAt.gte = new Date(options.from);
        if (options.to) where.startsAt.lte = new Date(options.to);
      }
    }

    const sessions = await this.prisma.courseSession.findMany({
      where,
      include: {
        coach: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    return {
      sessions: sessions.map(session => ({
        ...session,
        bookedCount: session.bookedCount,
      })),
    };
  }

  private validateTimeRange(startsAt: Date, endsAt: Date) {
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid session time');
    }

    if (endsAt <= startsAt) {
      throw new BadRequestException('Session end time must be after start time');
    }
  }

  private async ensureSessionConflictFree(
    coachId: string,
    startsAt: Date,
    endsAt: Date,
    excludeId?: string,
  ) {
    const conflict = await this.prisma.courseSession.findFirst({
      where: {
        coachId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    });

    if (conflict) {
      throw new ConflictException('Coach already has another session during this time range');
    }
  }

  private async generateSessionCode(): Promise<string> {
    const count = await this.prisma.courseSession.count();
    return `SES${String(count + 1).padStart(6, '0')}`;
  }
}
