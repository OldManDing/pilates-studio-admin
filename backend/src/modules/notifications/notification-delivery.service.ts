import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { NotificationChannel, NotificationStatus } from '../../common/enums/domain.enums';
import { PrismaService } from '../prisma/prisma.service';

type NotificationTemplateKey =
  | 'bookingConfirmation'
  | 'bookingCancelled'
  | 'bookingReminder'
  | 'attendanceCheckedIn'
  | 'membershipExpiry';

type TemplateFieldMap = Record<string, string>;
type WeChatTemplateData = Record<string, { value: string }>;

interface MiniProgramDeliveryNotification {
  id: string;
  type?: string;
  title?: string;
  content?: string;
  payload?: Record<string, unknown> | null;
  miniUser?: { openId?: string | null } | null;
}

const TEMPLATE_CONFIG_KEY_BY_TYPE: Record<string, NotificationTemplateKey> = {
  BOOKING_CONFIRMATION: 'bookingConfirmation',
  BOOKING_CANCELLED: 'bookingCancelled',
  BOOKING_REMINDER: 'bookingReminder',
  ATTENDANCE_CHECKED_IN: 'attendanceCheckedIn',
  MEMBERSHIP_EXPIRY: 'membershipExpiry',
};

const DEFAULT_TEMPLATE_FIELD_MAPS: Record<NotificationTemplateKey, TemplateFieldMap> = {
  bookingConfirmation: {
    thing2: 'courseName',
    thing5: 'remark',
  },
  bookingCancelled: {
    thing1: 'courseName',
    time2: 'cancelledAt',
    thing3: 'bookingCode',
    thing4: 'remark',
  },
  bookingReminder: {
    thing2: 'courseName',
    time3: 'startsAt',
  },
  attendanceCheckedIn: {
    thing1: 'courseName',
    time2: 'checkedInAt',
    thing3: 'memberName',
    thing4: 'remark',
  },
  membershipExpiry: {
    thing1: 'planName',
    date2: 'expiryDate',
    thing3: 'memberName',
    thing4: 'remark',
  },
};

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
        return this.markAsFailed(notification.id, this.getUnsupportedChannelReason(notification.channel));
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
      return this.markAsFailed(notification.id, '邮件未发送：缺少 SMTP 配置或接收人邮箱');
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
      const reason = error instanceof Error ? error.message : '未知邮件投递错误';
      return this.markAsFailed(notification.id, `邮件发送失败：${this.translateDeliveryError(reason)}`);
    }
  }

  private async deliverMiniProgram(notification: MiniProgramDeliveryNotification) {
    const appId = this.configService.get<string>('wechat.appId');
    const secret = this.configService.get<string>('wechat.secret');
    const miniprogramState = this.configService.get<string>('wechat.miniprogramState') ?? 'formal';
    const openId = notification.miniUser?.openId;
    const templateId = this.resolveTemplateId(notification.type);

    if (!appId || !secret || !openId || !templateId) {
      return this.markAsSent(
        notification.id,
        '小程序消息中心已生成；微信订阅消息未发送：缺少微信配置、订阅消息模板或接收人 openId',
      );
    }

    let lastError = '未知微信订阅消息投递错误';
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
            miniprogram_state: miniprogramState,
            data: this.buildWeChatTemplateData(notification),
          }),
        });

        const body = (await response.json()) as { errcode?: number; errmsg?: string };
        if (response.ok && !body.errcode) {
          return this.markAsSent(notification.id);
        }

        lastError = body.errmsg || `微信接口返回异常：${body.errcode ?? response.status}`;
      } catch (error) {
        lastError = this.translateDeliveryError(error instanceof Error ? error.message : '未知微信订阅消息投递错误');
      }

      if (attempt < maxAttempts) {
        await this.delay(100 * attempt);
      }
    }

    return this.markAsSent(
      notification.id,
      `小程序消息中心已生成；微信订阅消息推送失败：${lastError}`,
    );
  }

  private resolveTemplateId(type?: string) {
    const templates = this.configService.get<Record<string, string>>('notifications.templateIds') ?? {};
    const templateConfigKey = this.resolveTemplateConfigKey(type);
    return templateConfigKey ? templates[templateConfigKey] : '';
  }

  private buildWeChatTemplateData(notification: MiniProgramDeliveryNotification): WeChatTemplateData {
    const payload = this.asPlainRecord(notification.payload);
    const explicitTemplateData = this.getExplicitTemplateData(payload);
    if (explicitTemplateData) {
      return explicitTemplateData;
    }

    const templateConfigKey = this.resolveTemplateConfigKey(notification.type);
    const fieldMap = this.resolveTemplateFieldMap(templateConfigKey);

    return Object.entries(fieldMap).reduce<WeChatTemplateData>((data, [fieldKey, source]) => {
      const resolvedValue = this.resolveTemplateSourceValue(notification, payload, source);
      data[fieldKey] = {
        value: this.formatTemplateFieldValue(
          fieldKey,
          this.hasTemplateFieldValue(resolvedValue) ? resolvedValue : this.getTemplateFieldFallback(fieldKey, notification),
        ),
      };

      return data;
    }, {});
  }

  private resolveTemplateConfigKey(type?: string): NotificationTemplateKey | null {
    if (!type) {
      return null;
    }

    return TEMPLATE_CONFIG_KEY_BY_TYPE[type] ?? null;
  }

  private resolveTemplateFieldMap(templateConfigKey: NotificationTemplateKey | null): TemplateFieldMap {
    const configuredFieldMaps = this.configService.get<Record<string, TemplateFieldMap>>('notifications.templateFields') ?? {};
    const configuredFieldMap = templateConfigKey ? configuredFieldMaps[templateConfigKey] : null;

    if (configuredFieldMap && Object.keys(configuredFieldMap).length > 0) {
      return configuredFieldMap;
    }

    return templateConfigKey ? DEFAULT_TEMPLATE_FIELD_MAPS[templateConfigKey] : {
      thing1: 'title',
      thing2: 'content',
      thing3: 'type',
    };
  }

  private getExplicitTemplateData(payload: Record<string, unknown> | null): WeChatTemplateData | null {
    const templateData = this.asPlainRecord(payload?.templateData) ?? this.asPlainRecord(payload?.wechatTemplateData);
    if (!templateData || Object.keys(templateData).length === 0) {
      return null;
    }

    return Object.entries(templateData).reduce<WeChatTemplateData>((result, [fieldKey, rawValue]) => {
      const valueRecord = this.asPlainRecord(rawValue);
      const value = valueRecord && typeof valueRecord.value !== 'undefined'
        ? valueRecord.value
        : rawValue;

      result[fieldKey] = { value: this.formatTemplateFieldValue(fieldKey, value) };
      return result;
    }, {});
  }

  private resolveTemplateSourceValue(
    notification: MiniProgramDeliveryNotification,
    payload: Record<string, unknown> | null,
    source: string,
  ): unknown {
    if (source.startsWith('literal:')) {
      return source.slice('literal:'.length);
    }

    if (source === 'now') {
      return new Date();
    }

    const notificationRecord = notification as unknown as Record<string, unknown>;
    return this.getValueByPath(notificationRecord, source) ?? this.getValueByPath(payload, source);
  }

  private getValueByPath(source: Record<string, unknown> | null, path: string): unknown {
    if (!source) {
      return undefined;
    }

    return path.split('.').reduce<unknown>((current, segment) => {
      const currentRecord = this.asPlainRecord(current);
      return currentRecord ? currentRecord[segment] : undefined;
    }, source);
  }

  private getTemplateFieldFallback(fieldKey: string, notification: MiniProgramDeliveryNotification) {
    if (/^(date|time)\d*$/i.test(fieldKey)) {
      return new Date();
    }

    if (/^character_string\d*$/i.test(fieldKey)) {
      return notification.id;
    }

    return notification.title || notification.content || notification.type || '通知';
  }

  private formatTemplateFieldValue(fieldKey: string, rawValue: unknown) {
    if (/^date\d*$/i.test(fieldKey)) {
      return this.formatDate(rawValue);
    }

    if (/^time\d*$/i.test(fieldKey)) {
      return this.formatDateTime(rawValue);
    }

    const normalizedValue = this.normalizeTemplateText(rawValue);
    const maxLength = this.getTemplateFieldMaxLength(fieldKey);
    return normalizedValue.slice(0, maxLength);
  }

  private hasTemplateFieldValue(value: unknown) {
    return value !== undefined && value !== null && String(value).trim() !== '';
  }

  private formatDateTime(rawValue: unknown) {
    const date = this.toDate(rawValue);
    return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())} ${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`;
  }

  private formatDate(rawValue: unknown) {
    const date = this.toDate(rawValue);
    return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())}`;
  }

  private toDate(rawValue: unknown) {
    if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
      return rawValue;
    }

    const date = new Date(this.normalizeTemplateText(rawValue));
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  private normalizeTemplateText(rawValue: unknown) {
    if (rawValue instanceof Date) {
      return rawValue.toISOString();
    }

    return String(rawValue ?? '').replace(/\s+/g, ' ').trim() || '-';
  }

  private getTemplateFieldMaxLength(fieldKey: string) {
    if (/^phrase\d*$/i.test(fieldKey)) return 5;
    if (/^name\d*$/i.test(fieldKey)) return 10;
    if (/^thing\d*$/i.test(fieldKey)) return 20;
    if (/^phone_number\d*$/i.test(fieldKey)) return 17;
    if (/^character_string\d*$/i.test(fieldKey)) return 32;
    if (/^(number|amount)\d*$/i.test(fieldKey)) return 32;
    return 20;
  }

  private pad(value: number) {
    return String(value).padStart(2, '0');
  }

  private asPlainRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
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
      throw new Error(body.errmsg || '获取微信 access_token 失败');
    }

    const expiresInMs = Math.max((body.expires_in ?? 7200) - 60, 60) * 1000;
    this.cachedAccessToken = body.access_token;
    this.cachedAccessTokenExpiresAt = now + expiresInMs;

    return body.access_token;
  }

  private async markAsSent(id: string, failureReason: string | null = null) {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        failureReason,
      },
    });

    return { id: updated.id, status: NotificationStatus.SENT };
  }

  private async markAsFailed(id: string, reason: string) {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.FAILED,
        failureReason: this.translateDeliveryError(reason),
      },
    });

    return { id: updated.id, status: NotificationStatus.FAILED };
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getUnsupportedChannelReason(channel: NotificationChannel) {
    const channelLabels: Record<NotificationChannel, string> = {
      [NotificationChannel.INTERNAL]: '站内通知',
      [NotificationChannel.MINI_PROGRAM]: '小程序订阅消息',
      [NotificationChannel.EMAIL]: '邮件',
      [NotificationChannel.SMS]: '短信',
    };

    return `发送失败：暂未配置${channelLabels[channel] ?? channel}投递服务`;
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
      return this.getUnsupportedChannelReason(unsupportedChannelMatch[1] as NotificationChannel);
    }

    const wechatApiMatch = normalized.match(/^WeChat API error (.+)$/);
    if (wechatApiMatch) {
      return `微信接口返回异常：${wechatApiMatch[1]}`;
    }

    return normalized || '未知通知投递错误';
  }
}
