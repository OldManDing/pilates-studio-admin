import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { admins: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        admins: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Role code already exists');
    }

    return this.prisma.role.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        permissions: dto.permissionIds
          ? {
              create: dto.permissionIds.map((permissionId) => ({
                permission: { connect: { id: permissionId } },
              })),
            }
          : undefined,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async assignPermissions(id: string, permissionIds: string[]) {
    await this.findOne(id);

    // Remove existing permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: id },
    });

    // Add new permissions
    return this.prisma.role.update({
      where: { id },
      data: {
        permissions: {
          create: permissionIds.map((permissionId) => ({
            permission: { connect: { id: permissionId } },
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  async initializeDefaultRoles() {
    const defaultPermissions = [
      { module: 'ADMINS', action: 'MANAGE' },
      { module: 'ROLES', action: 'MANAGE' },
      { module: 'MEMBERS', action: 'READ' },
      { module: 'MEMBERS', action: 'WRITE' },
      { module: 'MEMBERS', action: 'MANAGE' },
      { module: 'PLANS', action: 'READ' },
      { module: 'PLANS', action: 'MANAGE' },
      { module: 'COACHES', action: 'READ' },
      { module: 'COACHES', action: 'WRITE' },
      { module: 'COACHES', action: 'MANAGE' },
      { module: 'COURSES', action: 'READ' },
      { module: 'COURSES', action: 'WRITE' },
      { module: 'COURSES', action: 'MANAGE' },
      { module: 'SESSIONS', action: 'READ' },
      { module: 'SESSIONS', action: 'WRITE' },
      { module: 'BOOKINGS', action: 'READ' },
      { module: 'BOOKINGS', action: 'WRITE' },
      { module: 'ATTENDANCE', action: 'READ' },
      { module: 'ATTENDANCE', action: 'WRITE' },
      { module: 'TRANSACTIONS', action: 'READ' },
      { module: 'TRANSACTIONS', action: 'WRITE' },
      { module: 'ANALYTICS', action: 'READ' },
      { module: 'REPORTS', action: 'READ' },
      { module: 'SETTINGS', action: 'READ' },
      { module: 'SETTINGS', action: 'MANAGE' },
    ];

    // Create permissions
    for (const perm of defaultPermissions) {
      const existing = await this.prisma.permission.findFirst({
        where: { module: perm.module, action: perm.action },
      });

      if (!existing) {
        await this.prisma.permission.create({
          data: perm as any,
        });
      }
    }

    // Create default roles
    const roles = [
      { code: 'OWNER', name: 'Owner', description: 'Full system access' },
      { code: 'FRONTDESK', name: 'Front Desk', description: 'Member and booking management' },
      { code: 'COACH', name: 'Coach', description: 'Session and attendance management' },
      { code: 'FINANCE', name: 'Finance', description: 'Transaction and report access' },
    ];

    for (const role of roles) {
      const existing = await this.prisma.role.findUnique({
        where: { code: role.code as any },
      });

      if (!existing) {
        await this.prisma.role.create({
          data: role as any,
        });
      }
    }
  }
}
