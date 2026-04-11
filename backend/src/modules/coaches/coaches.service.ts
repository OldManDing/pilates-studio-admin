import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { QueryCoachesDto } from './dto/query-coaches.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { CoachStatus } from '../../common/enums/domain.enums';
import { PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class CoachesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCoachDto) {
    const existing = await this.prisma.coach.findFirst({
      where: {
        OR: [{ phone: dto.phone }, { email: dto.email }].filter(Boolean),
      },
    });

    if (existing) {
      throw new ConflictException('Phone or email already registered');
    }

    const coachCode = await this.generateCoachCode();

    const coach = await this.prisma.coach.create({
      data: {
        coachCode,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        status: dto.status || CoachStatus.ACTIVE,
        experience: dto.experience,
        bio: dto.bio,
        specialties: {
          create: dto.specialties?.map((value) => ({ value })) || [],
        },
        certificates: {
          create: dto.certificates?.map((value) => ({ value })) || [],
        },
      },
      include: {
        specialties: true,
        certificates: true,
      },
    });

    return coach;
  }

  async findAll(query: QueryCoachesDto): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const search = query.search?.trim();

    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
              { coachCode: { contains: search } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.coach.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          specialties: true,
          certificates: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coach.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findActive() {
    return this.prisma.coach.findMany({
      where: { status: CoachStatus.ACTIVE },
      include: {
        specialties: true,
        certificates: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const coach = await this.prisma.coach.findUnique({
      where: { id },
      include: {
        specialties: true,
        certificates: true,
        courses: true,
        sessions: {
          where: {
            startsAt: { gte: new Date() },
          },
          take: 10,
          orderBy: { startsAt: 'asc' },
          include: {
            course: true,
          },
        },
      },
    });

    if (!coach) {
      throw new NotFoundException('Coach not found');
    }

    return coach;
  }

  async update(id: string, dto: UpdateCoachDto) {
    const coach = await this.findOne(id);

    // Delete existing specialties and certificates if new ones provided
    if (dto.specialties) {
      await this.prisma.coachTag.deleteMany({
        where: { coachId: id },
      });
    }

    if (dto.certificates) {
      await this.prisma.coachCertificate.deleteMany({
        where: { coachId: id },
      });
    }

    return this.prisma.coach.update({
      where: { id },
      data: {
        ...dto,
        specialties: dto.specialties
          ? { create: dto.specialties.map((value) => ({ value })) }
          : undefined,
        certificates: dto.certificates
          ? { create: dto.certificates.map((value) => ({ value })) }
          : undefined,
      },
      include: {
        specialties: true,
        certificates: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.coach.delete({
      where: { id },
    });

    return { success: true };
  }

  async getStats(id: string) {
    const coach = await this.findOne(id);

    const [totalSessions, completedSessions, totalBookings] = await Promise.all([
      this.prisma.courseSession.count({
        where: { coachId: id },
      }),
      this.prisma.courseSession.count({
        where: {
          coachId: id,
          endsAt: { lt: new Date() },
        },
      }),
      this.prisma.booking.count({
        where: {
          session: {
            coachId: id,
          },
        },
      }),
    ]);

    return {
      coach: {
        id: coach.id,
        name: coach.name,
      },
      stats: {
        totalSessions,
        completedSessions,
        upcomingSessions: totalSessions - completedSessions,
        totalBookings,
      },
    };
  }

  async getSchedule(id: string, query: { from?: string; to?: string }) {
    await this.findOne(id);

    const where: any = { coachId: id };
    if (query.from || query.to) {
      where.startsAt = {};
      if (query.from) where.startsAt.gte = new Date(query.from);
      if (query.to) where.startsAt.lte = new Date(query.to);
    }

    const sessions = await this.prisma.courseSession.findMany({
      where,
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
    });

    return {
      sessions: sessions.map((session) => ({
        ...session,
        bookedCount: session.bookings.length,
        bookings: undefined,
      })),
    };
  }

  private async generateCoachCode(): Promise<string> {
    const count = await this.prisma.coach.count();
    return `C${String(count + 1).padStart(6, '0')}`;
  }
}
