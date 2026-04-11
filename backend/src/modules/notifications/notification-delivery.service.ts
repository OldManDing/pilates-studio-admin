import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { NotificationChannel, NotificationStatus } from '../../common/enums/domain.enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationDeliveryService {
  private cachedAccessToken: string | null = null;
  private cachedAccessTokenExpiresAt = 0;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async deliver(notification: {
    id: string;
    channel: NotificationChannel;
    type?: string;
    title?: string;
    content?: string;
    payload?: Record<string, unknown> | null;
    miniUser?: { openId?: string | null } | null;
  }) {
    switch (notification.channel) {
      case NotificationChannel.INTERNAL:
        return this.markAsSent(notification.id);
      case NotificationChannel.MINI_PROGRAM:
        return this.deliverMiniProgram(notification);
      case NotificationChannel.EMAIL:
        return this.deliverEmail(notification);
      case NotificationChannel.SMS:
      default:
        return this.markAsFailed(notification.id, `No delivery adapter configured for channel ${notification.channel}`);
    }
  }

  private async deliverEmail(notification: {
    id: string;
    title?: string;
    content?: string;
  }) {
    const host = this.configService.get<string>('email.host');
    const port = this.configService.get<number>('email.port');
    const user = this.configService.get<string>('email.user');
    const password = this.configService.get<string>('email.password');
    const from = this.configService.get<string>('email.from');

    const fullNotification = await this.prisma.notification.findUnique({
      where: { id: notification.id },
      include: {
        member: true,
      },
    });

    const recipientEmail = fullNotification?.member?.email ?? null;

    if (!host || !port || !user || !password || !from || !recipientEmail) {
      return this.markAsFailed(notification.id, 'Missing SMTP configuration or recipient email');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass: password,
      },
    });

    try {
      await transporter.sendMail({
        from,
        to: recipientEmail,
        subject: notification.title ?? '支付凭证',
        text: notification.content ?? '',
      });

      return this.markAsSent(notification.id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown email delivery error';
      return this.markAsFailed(notification.id, reason);
    }
  }

  private async deliverMiniProgram(notification: {
    id: string;
    type?: string;
    title?: string;
    content?: string;
    payload?: Record<string, unknown> | null;
    miniUser?: { openId?: string | null } | null;
  }) {
    const appId = this.configService.get<string>('wechat.appId');
    const secret = this.configService.get<string>('wechat.secret');
    const openId = notification.miniUser?.openId;
    const templateId = this.resolveTemplateId(notification.type);

    if (!appId || !secret || !openId || !templateId) {
      return this.markAsFailed(notification.id, 'Missing WeChat credentials, template id, or recipient openId');
    }

    let lastError = 'Unknown WeChat delivery failure';
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const accessToken = await this.fetchWeChatAccessToken(appId, secret);
        const response = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            touser: openId,
            template_id: templateId,
            page: (notification.payload?.page as string | undefined) ?? 'pages/index/index',
            data: {
              thing1: { value: (notification.title ?? '').slice(0, 20) },
              thing2: { value: (notification.content ?? '').slice(0, 20) },
              thing3: { value: String(notification.type ?? '').slice(0, 20) },
            },
          }),
        });

        const body = (await response.json()) as { errcode?: number; errmsg?: string };
        if (response.ok && !body.errcode) {
          return this.markAsSent(notification.id);
        }

        lastError = body.errmsg || `WeChat API error ${body.errcode ?? response.status}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown WeChat delivery error';
      }

      if (attempt < maxAttempts) {
        await this.delay(100 * attempt);
      }
    }

    return this.markAsFailed(notification.id, lastError);
  }

  private resolveTemplateId(type?: string) {
    const templates = this.configService.get<Record<string, string>>('notifications.templateIds') ?? {};
    switch (type) {
      case 'BOOKING_CONFIRMATION':
        return templates.bookingConfirmation;
      case 'BOOKING_CANCELLED':
        return templates.bookingCancelled;
      case 'BOOKING_REMINDER':
        return templates.bookingReminder;
      case 'ATTENDANCE_CHECKED_IN':
        return templates.attendanceCheckedIn;
      case 'MEMBERSHIP_EXPIRY':
        return templates.membershipExpiry;
      default:
        return '';
    }
  }

  private async fetchWeChatAccessToken(appId: string, secret: string) {
    const now = Date.now();
    if (this.cachedAccessToken && this.cachedAccessTokenExpiresAt > now) {
      return this.cachedAccessToken;
    }

    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`,
    );
    const body = (await response.json()) as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string };
    if (!response.ok || !body.access_token || body.errcode) {
      throw new Error(body.errmsg || 'Failed to fetch WeChat access token');
    }

    const expiresInMs = Math.max((body.expires_in ?? 7200) - 60, 60) * 1000;
    this.cachedAccessToken = body.access_token;
    this.cachedAccessTokenExpiresAt = now + expiresInMs;

    return body.access_token;
  }

  private async markAsSent(id: string) {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        failureReason: null,
      },
    });

    return { id: updated.id, status: NotificationStatus.SENT };
  }

  private async markAsFailed(id: string, reason: string) {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.FAILED,
        failureReason: reason,
      },
    });

    return { id: updated.id, status: NotificationStatus.FAILED };
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
