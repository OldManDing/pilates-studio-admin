import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCourseDto) {
    const existing = await this.prisma.course.findUnique({
      where: { courseCode: dto.name.toUpperCase().replace(/\s+/g, '_') },
    });

    if (existing) {
      throw new ConflictException('Course code already exists');
    }

    const courseCode = await this.generateCourseCode();

    return this.prisma.course.create({
      data: {
        courseCode,
        name: dto.name,
        type: dto.type,
        level: dto.level,
        durationMinutes: dto.durationMinutes,
        capacity: dto.capacity,
        coachId: dto.coachId,
        isActive: dto.isActive ?? true,
      },
      include: {
        coach: true,
      },
    });
  }

  async findAll() {
    return this.prisma.course.findMany({
      include: {
        coach: true,
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive() {
    return this.prisma.course.findMany({
      where: { isActive: true },
      include: {
        coach: true,
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
    const course = await this.findOne(id);

    if (course.sessions.length > 0) {
      throw new ConflictException(
        'Cannot delete course with active sessions. Disable it instead.',
      );
    }

    await this.prisma.course.delete({
      where: { id },
    });

    return { success: true };
  }

  private async generateCourseCode(): Promise<string> {
    const count = await this.prisma.course.count();
    return `CRS${String(count + 1).padStart(6, '0')}`;
  }
}
