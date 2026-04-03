import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';

@Injectable()
export class AdminsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.adminUser.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        roleId: true,
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return {
      ...admin,
      passwordHash: undefined,
    };
  }

  async create(dto: CreateAdminDto) {
    const existing = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.adminUser.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        displayName: dto.displayName,
        passwordHash,
        roleId: dto.roleId,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        createdAt: true,
      },
    });
  }

  async update(id: string, dto: Partial<CreateAdminDto>) {
    await this.findOne(id);

    const updateData: any = { ...dto };
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
      delete updateData.password;
    }

    return this.prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.adminUser.delete({
      where: { id },
    });

    return { success: true };
  }

  async resetPassword(id: string, newPassword: string) {
    await this.findOne(id);

    const passwordHash = await bcrypt.hash(newPassword, 10);

    return this.prisma.adminUser.update({
      where: { id },
      data: { passwordHash },
      select: { id: true, email: true, updatedAt: true },
    });
  }
}
