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
      { module: 'ADMIN', action: 'MANAGE', description: '管理系统管理员账号' },
      { module: 'ROLES', action: 'MANAGE', description: '管理角色与权限配置' },
      { module: 'MEMBERS', action: 'READ', description: '查看会员信息' },
      { module: 'MEMBERS', action: 'WRITE', description: '新增、编辑会员' },
      { module: 'MEMBERS', action: 'MANAGE', description: '删除会员、管理会籍' },
      { module: 'PLANS', action: 'READ', description: '查看会籍方案' },
      { module: 'PLANS', action: 'MANAGE', description: '管理会籍方案' },
      { module: 'COACHES', action: 'READ', description: '查看教练信息' },
      { module: 'COACHES', action: 'WRITE', description: '新增、编辑教练' },
      { module: 'COACHES', action: 'MANAGE', description: '管理教练排班' },
      { module: 'COURSES', action: 'READ', description: '查看课程信息' },
      { module: 'COURSES', action: 'WRITE', description: '新增、编辑课程' },
      { module: 'COURSES', action: 'MANAGE', description: '管理课程排期' },
      { module: 'SESSIONS', action: 'READ', description: '查看课程时段' },
      { module: 'SESSIONS', action: 'WRITE', description: '排课程时段' },
      { module: 'BOOKINGS', action: 'READ', description: '查看预约记录' },
      { module: 'BOOKINGS', action: 'WRITE', description: '创建、处理预约' },
      { module: 'ATTENDANCE', action: 'READ', description: '查看签到记录' },
      { module: 'ATTENDANCE', action: 'WRITE', description: '签到管理' },
      { module: 'TRANSACTIONS', action: 'READ', description: '查看交易记录' },
      { module: 'TRANSACTIONS', action: 'WRITE', description: '新增交易记录' },
      { module: 'MINI_USERS', action: 'READ', description: '查看小程序用户信息' },
      { module: 'MINI_USERS', action: 'WRITE', description: '管理小程序用户绑定与状态' },
      { module: 'ANALYTICS', action: 'READ', description: '查看数据分析' },
      { module: 'NOTIFICATIONS', action: 'READ', description: '查看通知记录与状态' },
      { module: 'NOTIFICATIONS', action: 'WRITE', description: '创建通知并标记已读' },
      { module: 'REPORTS', action: 'READ', description: '查看经营报表' },
      { module: 'SETTINGS', action: 'READ', description: '查看系统设置' },
      { module: 'SETTINGS', action: 'MANAGE', description: '管理系统设置' },
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
      { code: 'OWNER', name: '店长', description: '拥有系统全部权限' },
      { code: 'FRONTDESK', name: '前台', description: '负责会员管理与预约处理' },
      { code: 'COACH', name: '教练', description: '管理课程时段与签到记录' },
      { code: 'FINANCE', name: '财务', description: '查看交易记录与经营报表' },
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
