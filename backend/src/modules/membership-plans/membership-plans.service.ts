import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class MembershipPlansService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePlanDto) {
    const existing = await this.prisma.membershipPlan.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Plan code already exists');
    }

    return this.prisma.membershipPlan.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.membershipPlan.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive() {
    return this.prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Membership plan not found');
    }

    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findOne(id);

    return this.prisma.membershipPlan.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Check if any member is using this plan
    const memberCount = await this.prisma.member.count({
      where: { planId: id },
    });

    if (memberCount > 0) {
      throw new ConflictException(
        'Cannot delete plan with active members. Disable it instead.',
      );
    }

    await this.prisma.membershipPlan.delete({
      where: { id },
    });

    return { success: true };
  }
}
