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
        location: dto.location,
        isActive: dto.isActive ?? true,
      },
      include: {
        course: {
          select: { id: true, name: true, type: true, level: true, durationMinutes: true },
        },
        coach: {
          select: { id: true, name: true },
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
      ...(query.coachId ? { coachId: query.coachId } : {}),
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
            select: { id: true, name: true, description: true, type: true, level: true, durationMinutes: true, coverImageUrl: true, isActive: true },
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
        course: true,
        coach: {
          select: { id: true, name: true, bio: true },
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
    const coachId = dto.coachId ?? existing.coachId;
    const capacity = dto.capacity ?? existing.capacity;

    this.validateTimeRange(startsAt, endsAt);

    if (capacity < existing._count.bookings) {
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
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        course: {
          select: { id: true, name: true, type: true, level: true, durationMinutes: true },
        },
        coach: {
          select: { id: true, name: true },
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
        coach: {
          select: { id: true, name: true },
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

  private withActiveBookedCount<T extends { bookedCount: number; _count?: { bookings: number } }>(
    session: T,
  ) {
    const { _count, ...sessionData } = session;

    return {
      ...sessionData,
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
