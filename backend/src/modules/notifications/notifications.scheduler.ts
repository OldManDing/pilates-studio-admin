import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationChannel, NotificationStatus } from '../../common/enums/domain.enums';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsScheduler {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    private notificationDeliveryService: NotificationDeliveryService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async scheduleMembershipExpiryReminders() {
    const reminderDays = this.configService.get<number>('notifications.expiryReminderDays') ?? 3;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + reminderDays);
    targetDate.setHours(23, 59, 59, 999);

    const members = await this.prisma.member.findMany({
      where: {
        status: 'ACTIVE',
        planId: { not: null },
        plan: { durationDays: { not: null } },
      },
      include: {
        miniUser: true,
        plan: true,
      },
    });

    const created = [] as Array<{ memberId: string; notificationId: string }>;

    for (const member of members) {
      if (!member.plan?.durationDays) {
        continue;
      }

      const expiryDate = new Date(member.joinedAt.getTime() + member.plan.durationDays * 24 * 60 * 60 * 1000);
      const sameDay = expiryDate.toDateString() === targetDate.toDateString();
      if (!sameDay) {
        continue;
      }

      const existing = await this.prisma.notification.findFirst({
        where: {
          type: 'MEMBERSHIP_EXPIRY',
          memberId: member.id,
          createdAt: {
            gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0),
            lte: targetDate,
          },
        },
      });

      if (existing) {
        continue;
      }

      const notification = await this.notificationsService.createFromSetting('membership_expiry', {
        type: 'MEMBERSHIP_EXPIRY',
        title: '会籍即将到期',
        content: `${member.name} 的会籍将在 ${reminderDays} 天后到期。`,
        memberId: member.id,
        miniUserId: member.miniUserId ?? undefined,
        payload: {
          memberId: member.id,
          planId: member.planId,
          planName: member.plan.name,
          expiryDate: expiryDate.toISOString(),
        },
      });

      if (notification) {
        created.push({ memberId: member.id, notificationId: notification.id });
      }
    }

    return created;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduleBookingReminders() {
    const reminderMinutes = this.configService.get<number>('notifications.bookingReminderMinutes') ?? 60;
    const now = new Date();
    const reminderUpperBound = new Date(now.getTime() + reminderMinutes * 60 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        session: {
          startsAt: {
            gt: now,
            lte: reminderUpperBound,
          },
        },
      },
      include: {
        member: {
          include: {
            miniUser: true,
          },
        },
        session: {
          include: {
            course: true,
          },
        },
      },
    });

    const created = [] as Array<{ bookingId: string; notificationId: string }>;

    for (const booking of bookings) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          type: 'BOOKING_REMINDER',
          memberId: booking.memberId,
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
            lte: reminderUpperBound,
          },
        },
      });

      if (existing) {
        continue;
      }

      const notification = await this.notificationsService.createFromSetting('booking_reminder', {
        type: 'BOOKING_REMINDER',
        title: '课程即将开始',
        content: `${booking.session.course.name} 将在 ${reminderMinutes} 分钟内开始。`,
        memberId: booking.memberId,
        miniUserId: booking.member.miniUserId ?? undefined,
        payload: {
          bookingId: booking.id,
          sessionId: booking.sessionId,
          courseName: booking.session.course.name,
          startsAt: booking.session.startsAt.toISOString(),
          page: 'pages/bookings/index',
        },
      });

      if (notification) {
        created.push({ bookingId: booking.id, notificationId: notification.id });
      }
    }

    return created;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async processPendingNotifications() {
    const limit = this.configService.get<number>('notifications.processingBatchSize') ?? 50;
    const notifications = await this.prisma.notification.findMany({
      where: { status: NotificationStatus.PENDING },
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

    return processed;
  }
}
