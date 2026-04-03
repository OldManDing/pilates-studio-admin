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
      { key: 'booking_confirmation', title: 'Booking Confirmation', channel: 'MINI_PROGRAM', description: 'Send notification when booking is confirmed' },
      { key: 'booking_reminder', title: 'Booking Reminder', channel: 'MINI_PROGRAM', description: 'Send reminder before class starts' },
      { key: 'membership_expiry', title: 'Membership Expiry', channel: 'SMS', description: 'Notify when membership is about to expire' },
      { key: 'payment_receipt', title: 'Payment Receipt', channel: 'EMAIL', description: 'Send receipt after payment' },
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
