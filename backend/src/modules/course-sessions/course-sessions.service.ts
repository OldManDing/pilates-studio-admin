import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { CreateCourseSessionDto } from './dto/create-course-session.dto';
import { QueryCourseSessionsDto } from './dto/query-course-sessions.dto';
import { UpdateCourseSessionDto } from './dto/update-course-session.dto';
import { BookingStatus } from '../../common/enums/domain.enums';

const ACTIVE_BOOKING_STATUS_FILTER = {
  notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
};

@Injectable()
export class CourseSessionsService {
  constructor(private prisma: PrismaService) {}

  private normalizeCoverImageUrl(imageUrl?: string | null) {
    const nextImageUrl = imageUrl?.trim() || '';

    if (!nextImageUrl || /fakepath|^[a-z]:\\/i.test(nextImageUrl)) {
      return null;
    }

    return nextImageUrl;
  }

  async create(dto: CreateCourseSessionDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    const requestedCoachId = this.normalizeOptionalCoachId(dto.coachId);

    this.validateTimeRange(startsAt, endsAt);

    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      select: { id: true, capacity: true, coachId: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (typeof requestedCoachId === 'string') {
      const coach = await this.prisma.coach.findUnique({ where: { id: requestedCoachId } });

      if (!coach) {
        throw new NotFoundException('Coach not found');
      }
    }

    const effectiveCoachId = requestedCoachId ?? course.coachId ?? null;
    await this.ensureSessionConflictFree(effectiveCoachId, startsAt, endsAt);

    const sessionCode = await this.generateSessionCode();

    return this.prisma.courseSession.create({
      data: {
        sessionCode,
        courseId: dto.courseId,
        coachId: requestedCoachId,
        startsAt,
        endsAt,
        capacity: dto.capacity ?? course.capacity,
        bookedCount: 0,
        location: dto.location,
        isActive: dto.isActive ?? true,
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            type: true,
            level: true,
            durationMinutes: true,
            coach: {
              select: { id: true, name: true, avatarUrl: true, bio: true },
            },
          },
        },
        coach: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: {
          select: {
            bookings: { where: { status: ACTIVE_BOOKING_STATUS_FILTER } },
          },
        },
      },
    }).then((session) => this.withActiveBookedCount(session));
  }

  async findUpcoming(pagination: PaginationDto): Promise<PaginatedResponse<any>> {
    return this.findAll({ ...pagination, upcoming: true, isActive: true });
  }

  async findAll(query: QueryCourseSessionsDto): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: any = {
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.coachId ? { OR: this.buildEffectiveCoachWhere(query.coachId) } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };

    if (query.upcoming) {
      where.startsAt = { gte: new Date() };
    }

    if (query.from || query.to) {
      where.startsAt = {
        ...(where.startsAt || {}),
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.courseSession.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          course: {
            select: {
              id: true,
              name: true,
              description: true,
              type: true,
              level: true,
              durationMinutes: true,
              coverImageUrl: true,
              isActive: true,
              coach: {
                select: { id: true, name: true, avatarUrl: true, bio: true },
              },
            },
          },
          coach: {
            select: { id: true, name: true, avatarUrl: true },
          },
          _count: {
            select: {
              bookings: { where: { status: ACTIVE_BOOKING_STATUS_FILTER } },
            },
          },
        },
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.courseSession.count({ where }),
    ]);

    const sessions = data.map((session) => this.withActiveBookedCount(session));

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
        course: {
          include: {
            coach: {
              select: { id: true, name: true, avatarUrl: true, bio: true },
            },
          },
        },
        coach: {
          select: { id: true, name: true, avatarUrl: true, bio: true },
        },
        _count: {
          select: {
            bookings: { where: { status: ACTIVE_BOOKING_STATUS_FILTER } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Course session not found');
    }

    return this.withActiveBookedCount(session);
  }

  async update(id: string, dto: UpdateCourseSessionDto) {
    const existing = await this.prisma.courseSession.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookings: { where: { status: ACTIVE_BOOKING_STATUS_FILTER } },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Course session not found');
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;
    const requestedCoachId = this.normalizeOptionalCoachId(dto.coachId);
    const targetCourseId = dto.courseId ?? existing.courseId;
    let storedCoachId = existing.coachId;
    const capacity = dto.capacity ?? existing.capacity;

    this.validateTimeRange(startsAt, endsAt);

    if (capacity < existing._count.bookings) {
      throw new BadRequestException('Capacity cannot be lower than current booked count');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: targetCourseId },
      select: { id: true, coachId: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (requestedCoachId !== undefined) {
      storedCoachId = requestedCoachId;
    }

    if (typeof storedCoachId === 'string' && (storedCoachId !== existing.coachId || requestedCoachId !== undefined)) {
      const coach = await this.prisma.coach.findUnique({ where: { id: storedCoachId } });
      if (!coach) {
        throw new NotFoundException('Coach not found');
      }
    }

    const effectiveCoachId = storedCoachId ?? course.coachId ?? null;
    await this.ensureSessionConflictFree(effectiveCoachId, startsAt, endsAt, id);

    return this.prisma.courseSession.update({
      where: { id },
      data: {
        ...(dto.courseId ? { courseId: dto.courseId } : {}),
        ...(requestedCoachId !== undefined ? { coachId: storedCoachId } : {}),
        ...(dto.startsAt ? { startsAt } : {}),
        ...(dto.endsAt ? { endsAt } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            type: true,
            level: true,
            durationMinutes: true,
            coach: {
              select: { id: true, name: true, avatarUrl: true, bio: true },
            },
          },
        },
        coach: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: {
          select: {
            bookings: { where: { status: ACTIVE_BOOKING_STATUS_FILTER } },
          },
        },
      },
    }).then((session) => this.withActiveBookedCount(session));
  }

  async remove(id: string) {
    const session = await this.prisma.courseSession.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookings: { where: { status: ACTIVE_BOOKING_STATUS_FILTER } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Course session not found');
    }

    if (session._count.bookings > 0) {
      throw new ConflictException('Cannot delete a session with active bookings');
    }

    const bookingHistoryCount = await this.prisma.booking.count({
      where: { sessionId: id },
    });

    if (bookingHistoryCount > 0) {
      throw new ConflictException('Cannot delete a session with booking history');
    }

    await this.prisma.courseSession.delete({ where: { id } });

    return { success: true };
  }

  async getAvailableSeats(id: string) {
    const session = await this.prisma.courseSession.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookings: { where: { status: ACTIVE_BOOKING_STATUS_FILTER } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Course session not found');
    }

    const availableSeats = session.capacity - session._count.bookings;
    return { availableSeats: Math.max(0, availableSeats) };
  }

  async findByCourseId(
    courseId: string,
    options: { upcoming?: boolean; from?: string; to?: string },
  ) {
    const where: any = { courseId };

    if (options.upcoming) {
      where.startsAt = { gte: new Date() };
      where.isActive = true;
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
        course: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            level: true,
            durationMinutes: true,
            coverImageUrl: true,
            isActive: true,
            coach: {
              select: { id: true, name: true, avatarUrl: true, bio: true },
            },
          },
        },
        coach: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: {
          select: {
            bookings: { where: { status: ACTIVE_BOOKING_STATUS_FILTER } },
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    return {
      sessions: sessions.map((session) => this.withActiveBookedCount(session)),
    };
  }

  private withActiveBookedCount<T extends {
    bookedCount: number;
    coach?: unknown | null;
    course?: { coach?: unknown | null; coverImageUrl?: string | null } | null;
    _count?: { bookings: number };
  }>(
    session: T,
  ) {
    const { _count, ...sessionData } = session;
    const effectiveCoach = sessionData.coach ?? sessionData.course?.coach ?? null;
    const course = sessionData.course
      ? {
          ...sessionData.course,
          coverImageUrl: this.normalizeCoverImageUrl(sessionData.course.coverImageUrl),
        }
      : sessionData.course;

    return {
      ...sessionData,
      course,
      coach: effectiveCoach,
      coachSource: sessionData.coach ? 'SESSION' : effectiveCoach ? 'COURSE_DEFAULT' : 'UNASSIGNED',
      bookedCount: _count?.bookings ?? session.bookedCount,
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

  private normalizeOptionalCoachId(coachId?: string | null) {
    if (coachId === undefined) {
      return undefined;
    }

    if (coachId === null) {
      return null;
    }

    const trimmedCoachId = coachId.trim();
    return trimmedCoachId || null;
  }

  private async ensureSessionConflictFree(
    coachId: string | null,
    startsAt: Date,
    endsAt: Date,
    excludeId?: string,
  ) {
    if (!coachId) {
      return;
    }

    const conflict = await this.prisma.courseSession.findFirst({
      where: {
        OR: this.buildEffectiveCoachWhere(coachId),
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

  private buildEffectiveCoachWhere(coachId: string) {
    return [
      { coachId },
      {
        coachId: null,
        course: { coachId },
      },
    ];
  }

  private async generateSessionCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `SES${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const existing = await this.prisma.courseSession.findUnique({ where: { sessionCode: code } });

      if (!existing) {
        return code;
      }
    }

    throw new ConflictException('Unable to generate a unique session code');
  }
}
