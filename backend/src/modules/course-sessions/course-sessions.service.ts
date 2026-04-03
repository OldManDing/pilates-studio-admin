import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class CourseSessionsService {
  constructor(private prisma: PrismaService) {}

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
          bookings: {
            where: { status: { not: 'CANCELLED' } },
            select: { id: true },
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
      bookedCount: session.bookings.length,
      bookings: undefined,
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
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          select: { id: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Course session not found');
    }

    return {
      ...session,
      bookedCount: session.bookings.length,
      bookings: undefined,
    };
  }

  async getAvailableSeats(id: string) {
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

    const availableSeats = session.capacity - session.bookings.length;
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
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          select: { id: true },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    return {
      sessions: sessions.map(session => ({
        ...session,
        bookedCount: session.bookings.length,
        bookings: undefined,
      })),
    };
  }
}
