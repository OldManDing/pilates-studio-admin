import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getStudioSettings() {
    const settings = await this.prisma.studioSetting.findFirst();

    if (!settings) {
      // Return default settings if none exist
      return {
        studioName: 'Pilates Studio',
        phone: '',
        email: '',
        businessHours: '',
        address: '',
      };
    }

    return settings;
  }

  async updateStudioSettings(dto: UpdateStudioDto) {
    const existing = await this.prisma.studioSetting.findFirst();

    if (existing) {
      return this.prisma.studioSetting.update({
        where: { id: existing.id },
        data: dto,
      });
    }

    return this.prisma.studioSetting.create({
      data: dto,
    });
  }

  async getNotificationSettings() {
    return this.prisma.notificationSetting.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateNotificationSetting(dto: UpdateNotificationDto) {
    const setting = await this.prisma.notificationSetting.findUnique({
      where: { key: dto.key },
    });

    if (!setting) {
      throw new NotFoundException('Notification setting not found');
    }

    return this.prisma.notificationSetting.update({
      where: { key: dto.key },
      data: { enabled: dto.enabled },
    });
  }

  async initializeDefaultSettings() {
    const defaultSettings = [
      { key: 'booking_confirmation', title: '预约确认', channel: 'MINI_PROGRAM', description: '会员预约成功后发送确认通知' },
      { key: 'booking_reminder', title: '开课提醒', channel: 'MINI_PROGRAM', description: '课程开始前发送提醒通知' },
      { key: 'membership_expiry', title: '会籍到期', channel: 'SMS', description: '会员卡即将到期时发送通知' },
      { key: 'payment_receipt', title: '支付凭证', channel: 'EMAIL', description: '支付成功后发送电子收据' },
    ];

    for (const setting of defaultSettings) {
      const existing = await this.prisma.notificationSetting.findUnique({
        where: { key: setting.key },
      });

      if (!existing) {
        await this.prisma.notificationSetting.create({
          data: setting as any,
        });
      }
    }
  }
}
