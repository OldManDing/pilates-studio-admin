import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
import { NotificationChannel, NotificationStatus } from '../../common/enums/domain.enums';
import { NotificationDeliveryService } from './notification-delivery.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private notificationDeliveryService: NotificationDeliveryService,
  ) {}

  private readonly processingFailureReasonPrefix = '__processing__:';

  async create(dto: CreateNotificationDto) {
    if (dto.channel === NotificationChannel.MINI_PROGRAM && dto.miniUserId) {
      const preferenceKey = this.getMiniNotificationPreferenceKey(dto.type);
      const preference = await this.prisma.notificationSetting.findUnique({
        where: {
          key: `mini-user:${dto.miniUserId}:${preferenceKey}`,
        },
      });

      if (preference?.enabled === false) {
        return null;
      }
    }

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

  async findMine(miniUserId: string, query: QueryNotificationDto): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const statusFilter = query.status ? { status: query.status } : { status: { in: [NotificationStatus.SENT, NotificationStatus.READ] } };

    const where = {
      miniUserId,
      channel: query.channel ?? NotificationChannel.MINI_PROGRAM,
      ...(query.type ? { type: query.type } : {}),
      ...statusFilter,
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

  async processAccountDeletionRequest(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const notification = await tx.notification.findUnique({
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

      if (notification.type !== 'ACCOUNT_DELETION_REQUEST') {
        throw new BadRequestException('Notification is not an account deletion request');
      }

      if (notification.memberId) {
        await tx.member.update({
          where: { id: notification.memberId },
          data: { status: 'SUSPENDED' },
        });
      }

      if (notification.miniUserId) {
        await tx.miniUser.update({
          where: { id: notification.miniUserId },
          data: { status: 'DISABLED' },
        });
      }

      return tx.notification.update({
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
    });
  }

  async markMineAsRead(miniUserId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, miniUserId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

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
        failureReason: null,
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
      where: {
        status: NotificationStatus.PENDING,
        failureReason: null,
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        channel: true,
        type: true,
        title: true,
        content: true,
        payload: true,
        miniUser: {
          select: {
            openId: true,
          },
        },
      },
    });

    const processed = [] as Array<{ id: string; status: NotificationStatus }>;

    for (const notification of notifications) {
      if (typeof this.prisma.notification.updateMany === 'function') {
        const processingFailureReason = `${this.processingFailureReasonPrefix}${Date.now()}`;
        const lockResult = await this.prisma.notification.updateMany({
          where: {
            id: notification.id,
            status: NotificationStatus.PENDING,
            failureReason: null,
          },
          data: {
            failureReason: processingFailureReason,
          },
        });

        if (lockResult.count > 0) {
          const result = await this.notificationDeliveryService.deliver({
            id: notification.id,
            channel: notification.channel as NotificationChannel,
            type: notification.type,
            title: notification.title,
            content: notification.content,
            payload: notification.payload as Record<string, unknown> | null,
            miniUser: notification.miniUser,
          });
          processed.push(result);
        }
      } else {
        const result = await this.notificationDeliveryService.deliver({
          id: notification.id,
          channel: notification.channel as NotificationChannel,
          type: notification.type,
          title: notification.title,
          content: notification.content,
          payload: notification.payload as Record<string, unknown> | null,
          miniUser: notification.miniUser,
        });
        processed.push(result);
      }
    }

    return processed;
  }

  private getMiniNotificationPreferenceKey(type: string) {
    if (type.includes('BOOKING') || type.includes('ATTENDANCE')) {
      return 'courseReminder';
    }

    return 'systemNotification';
  }
}
