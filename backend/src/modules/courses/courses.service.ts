import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCourseDto) {
    const existing = await this.prisma.course.findFirst({
      where: { name: dto.name.trim() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Course name already exists');
    }

    const courseCode = await this.generateCourseCode();

    return this.prisma.course.create({
      data: {
        courseCode,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        level: dto.level,
        durationMinutes: dto.durationMinutes,
        capacity: dto.capacity,
        coverImageUrl: dto.coverImageUrl,
        coachId: dto.coachId,
        isActive: dto.isActive ?? true,
      },
      include: {
        coach: true,
      },
    });
  }

  async findAll(query: QueryCoursesDto): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const search = query.search?.trim();

    const where = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { coach: { name: { contains: search } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          coach: true,
          _count: {
            select: { sessions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where }),
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
    return this.prisma.course.findMany({
      where: { isActive: true },
      include: {
        coach: true,
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        coach: true,
        sessions: {
          where: {
            startsAt: { gte: new Date() },
          },
          take: 10,
          orderBy: { startsAt: 'asc' },
          include: {
            coach: true,
            _count: {
              select: { bookings: true },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.findOne(id);

    return this.prisma.course.update({
      where: { id },
      data: dto,
      include: {
        coach: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const sessionCount = await this.prisma.courseSession.count({ where: { courseId: id } });
    if (sessionCount > 0) {
      throw new ConflictException(
        'Cannot delete course with related sessions. Disable it instead.',
      );
    }

    await this.prisma.course.delete({
      where: { id },
    });

    return { success: true };
  }

  private async generateCourseCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = `CRS${Date.now().toString(36).toUpperCase()}${randomBytes(2).toString('hex').toUpperCase()}`;
      const exists = await this.prisma.course.findUnique({ where: { courseCode: candidate } });
      if (!exists) {
        return candidate;
      }
    }
    throw new ConflictException('无法生成唯一课程编号，请重试');
  }
}
