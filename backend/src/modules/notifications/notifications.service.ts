import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
import { NotificationChannel, NotificationStatus } from '../../common/enums/domain.enums';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        channel: dto.channel,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        payload: dto.payload as Prisma.InputJsonValue | undefined,
        memberId: dto.memberId,
        miniUserId: dto.miniUserId,
        adminUserId: dto.adminUserId,
        status: NotificationStatus.PENDING,
      },
      include: {
        member: true,
        miniUser: true,
        adminUser: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
  }

  async createFromSetting(
    key: string,
    params: Omit<CreateNotificationDto, 'channel' | 'title'> & { title?: string },
  ) {
    const setting = await this.prisma.notificationSetting.findUnique({
      where: { key },
    });

    if (!setting || !setting.enabled) {
      return null;
    }

    if (!params.memberId && !params.miniUserId && !params.adminUserId) {
      return null;
    }

    return this.create({
      ...params,
      channel: setting.channel as NotificationChannel,
      title: params.title ?? setting.title,
    });
  }

  async findAll(query: QueryNotificationDto): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where = {
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.memberId ? { memberId: query.memberId } : {}),
      ...(query.miniUserId ? { miniUserId: query.miniUserId } : {}),
      ...(query.adminUserId ? { adminUserId: query.adminUserId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          member: true,
          miniUser: true,
          adminUser: {
            select: { id: true, email: true, displayName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
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

  async findOne(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        member: true,
        miniUser: true,
        adminUser: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAsRead(id: string) {
    await this.findOne(id);

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
      include: {
        member: true,
        miniUser: true,
        adminUser: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
  }

  async markAsSent(id: string) {
    await this.findOne(id);

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
      include: {
        member: true,
        miniUser: true,
        adminUser: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
  }

  async processPendingNotifications(limit = 50) {
    const notifications = await this.prisma.notification.findMany({
      where: { status: NotificationStatus.PENDING },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    const processed = [] as Array<{ id: string; status: NotificationStatus }>;

    for (const notification of notifications) {
      const updated = await this.markAsSent(notification.id);
      processed.push({ id: updated.id, status: updated.status as NotificationStatus });
    }

    return processed;
  }
}
