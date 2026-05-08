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
  private readonly accountDeletionRequestType = 'ACCOUNT_DELETION_REQUEST';
  private readonly defaultNotificationSettings = {
    booking_confirmation: { title: '预约确认', channel: NotificationChannel.MINI_PROGRAM, description: '会员预约成功后发送确认通知' },
    booking_cancelled: { title: '预约取消', channel: NotificationChannel.MINI_PROGRAM, description: '预约取消后发送提醒通知' },
    booking_reminder: { title: '开课提醒', channel: NotificationChannel.MINI_PROGRAM, description: '课程开始前发送提醒通知' },
    attendance_checked_in: { title: '签到成功', channel: NotificationChannel.INTERNAL, description: '会员完成签到后记录通知' },
    membership_expiry: { title: '会籍到期', channel: NotificationChannel.SMS, description: '会员卡即将到期时发送通知' },
    payment_receipt: { title: '支付凭证', channel: NotificationChannel.EMAIL, description: '支付成功后发送电子收据' },
    membership_renewal_request: { title: '会员续费申请', channel: NotificationChannel.INTERNAL, description: '会员提交续费申请后通知后台跟进' },
  } as const;

  private isAccountDeletionProcessedPayload(payload: Prisma.JsonValue | null | undefined) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return false;
    }

    return payload !== null && 'accountDeletionProcessedAt' in payload;
  }

  async create(dto: CreateNotificationDto) {
    const recipientData = await this.resolveNotificationRecipient(dto);

    if (dto.channel === NotificationChannel.MINI_PROGRAM && recipientData.miniUserId) {
      const preferenceKey = this.getMiniNotificationPreferenceKey(dto.type);
      const preference = await this.prisma.notificationSetting.findUnique({
        where: {
          key: `mini-user:${recipientData.miniUserId}:${preferenceKey}`,
        },
      });

      if (preference?.enabled === false) {
        return null;
      }
    }

    const created = await this.prisma.notification.create({
      data: {
        channel: dto.channel,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        payload: dto.payload as Prisma.InputJsonValue | undefined,
        memberId: recipientData.memberId,
        miniUserId: recipientData.miniUserId,
        adminUserId: recipientData.adminUserId,
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

    await this.deliverCreatedNotification(created);

    return created;
  }

  async createFromSetting(
    key: string,
    params: Omit<CreateNotificationDto, 'channel' | 'title'> & { title?: string },
  ) {
    let setting = await this.prisma.notificationSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      setting = await this.ensureDefaultNotificationSetting(key);
    }

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
    const notification = await this.findOne(id);

    if (notification.type === this.accountDeletionRequestType) {
      throw new BadRequestException('Account deletion requests must be processed through the dedicated endpoint');
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

      if (notification.type !== this.accountDeletionRequestType) {
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
          payload: {
            ...(notification.payload && typeof notification.payload === 'object' && !Array.isArray(notification.payload)
              ? notification.payload as Prisma.InputJsonObject
              : {}),
            accountDeletionProcessedAt: new Date().toISOString(),
          },
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

    if (notification.type === this.accountDeletionRequestType && this.isAccountDeletionProcessedPayload(notification.payload)) {
      return this.findOne(id);
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
      const processingFailureReason = `${this.processingFailureReasonPrefix}${Date.now()}`;

      if (typeof this.prisma.notification.updateMany === 'function') {
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
          const result = await this.deliverWithRecovery(notification, processingFailureReason);
          processed.push(result);
        }
      } else {
        const result = await this.deliverWithRecovery(notification, processingFailureReason);
        processed.push(result);
      }
    }

    return processed;
  }

  private async deliverWithRecovery(
    notification: {
      id: string;
      channel: string;
      type: string;
      title: string;
      content: string;
      payload: Prisma.JsonValue;
      miniUser: { openId: string | null } | null;
    },
    processingFailureReason: string,
  ) {
    try {
      return await this.notificationDeliveryService.deliver({
        id: notification.id,
        channel: notification.channel as NotificationChannel,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        payload: notification.payload as Record<string, unknown> | null,
        miniUser: notification.miniUser,
      });
    } catch (error) {
      const reason = this.translateDeliveryError(error instanceof Error ? error.message : 'Unknown notification delivery error');

      await this.prisma.notification.updateMany({
        where: {
          id: notification.id,
          status: NotificationStatus.PENDING,
          failureReason: processingFailureReason,
        },
        data: {
          status: NotificationStatus.FAILED,
          failureReason: reason,
        },
      });

      return {
        id: notification.id,
        status: NotificationStatus.FAILED,
      };
    }
  }

  private getMiniNotificationPreferenceKey(type: string) {
    if (type.includes('BOOKING') || type.includes('ATTENDANCE')) {
      return 'courseReminder';
    }

    return 'systemNotification';
  }

  private async resolveNotificationRecipient(dto: CreateNotificationDto) {
    let memberId = dto.memberId;
    let miniUserId = dto.miniUserId;

    if (dto.channel === NotificationChannel.MINI_PROGRAM) {
      if (memberId && !miniUserId) {
        const member = await this.prisma.member.findUnique({
          where: { id: memberId },
          select: { miniUserId: true },
        });

        if (!member) {
          throw new NotFoundException('Member not found');
        }

        if (!member.miniUserId) {
          throw new BadRequestException('该会员未绑定小程序用户，无法发送小程序通知');
        }

        miniUserId = member.miniUserId;
      }

      if (miniUserId && !memberId) {
        const miniUser = await this.prisma.miniUser.findUnique({
          where: { id: miniUserId },
          select: {
            member: {
              select: { id: true },
            },
          },
        });

        if (!miniUser) {
          throw new NotFoundException('Mini user not found');
        }

        memberId = miniUser.member?.id;
      }

      if (!miniUserId) {
        throw new BadRequestException('请选择已绑定的小程序用户或会员');
      }
    }

    return {
      memberId,
      miniUserId,
      adminUserId: dto.adminUserId,
    };
  }

  private async ensureDefaultNotificationSetting(key: string) {
    const defaultSetting = this.defaultNotificationSettings[key as keyof typeof this.defaultNotificationSettings];
    if (!defaultSetting) {
      return null;
    }

    return this.prisma.notificationSetting.upsert({
      where: { key },
      update: {
        title: defaultSetting.title,
        description: defaultSetting.description,
        channel: defaultSetting.channel,
      },
      create: {
        key,
        title: defaultSetting.title,
        description: defaultSetting.description,
        channel: defaultSetting.channel,
        enabled: true,
      },
    });
  }

  private async deliverCreatedNotification(notification: {
    id: string;
    channel: string;
    type?: string;
    title?: string;
    content?: string;
    payload?: Prisma.JsonValue;
    miniUser?: { openId?: string | null } | null;
  }) {
    const channel = notification.channel as NotificationChannel;

    try {
      await this.notificationDeliveryService.deliver({
        id: notification.id,
        channel,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        payload: notification.payload as Record<string, unknown> | null,
        miniUser: notification.miniUser,
      });
    } catch (error) {
      const reason = this.translateDeliveryError(error instanceof Error ? error.message : 'Unknown notification delivery error');
      const miniProgramFailureReason = `小程序消息中心已生成；发送处理异常：${reason}`;

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: channel === NotificationChannel.MINI_PROGRAM
          ? {
              status: NotificationStatus.SENT,
              sentAt: new Date(),
              failureReason: miniProgramFailureReason,
            }
          : {
              status: NotificationStatus.FAILED,
              failureReason: reason,
            },
      });
    }
  }

  private translateDeliveryError(reason: string) {
    const normalized = reason.trim();
    const exactReasonMap: Record<string, string> = {
      'Missing SMTP configuration or recipient email': '邮件未发送：缺少 SMTP 配置或接收人邮箱',
      'Unknown email delivery error': '未知邮件投递错误',
      'Unknown WeChat delivery failure': '未知微信订阅消息投递错误',
      'Unknown WeChat delivery error': '未知微信订阅消息投递错误',
      'Failed to fetch WeChat access token': '获取微信 access_token 失败',
      'Unknown notification delivery error': '未知通知投递错误',
      'temporary network error': '临时网络异常',
      'delivery unavailable': '投递服务不可用',
      'unexpected update failure': '通知状态更新异常',
    };
    const phraseReasonMap: Array<[string, string]> = [
      ['Invalid openid', 'OpenID 无效'],
      ['invalid openid', 'OpenID 无效'],
      ['openid is invalid', 'OpenID 无效'],
      ['template_id is invalid', '订阅消息模板 ID 无效'],
      ['invalid template_id', '订阅消息模板 ID 无效'],
      ['access_token expired', 'access_token 已过期'],
      ['invalid credential', '微信凭证无效'],
      ['invalid appid', 'AppID 无效'],
      ['user refuse to accept the msg', '用户未订阅或拒收该消息'],
      ['system error', '微信系统错误'],
      ['api unauthorized', '微信接口未授权'],
    ];

    if (exactReasonMap[normalized]) {
      return exactReasonMap[normalized];
    }

    const translatedByPhrase = phraseReasonMap.reduce(
      (current, [english, chinese]) => current.split(english).join(chinese),
      normalized,
    );
    if (translatedByPhrase !== normalized) {
      return translatedByPhrase;
    }

    const unsupportedChannelMatch = normalized.match(/^No delivery adapter configured for channel (.+)$/);
    if (unsupportedChannelMatch) {
      return `发送失败：暂未配置 ${unsupportedChannelMatch[1]} 投递服务`;
    }

    const wechatApiMatch = normalized.match(/^WeChat API error (.+)$/);
    if (wechatApiMatch) {
      return `微信接口返回异常：${wechatApiMatch[1]}`;
    }

    return normalized || '未知通知投递错误';
  }
}
