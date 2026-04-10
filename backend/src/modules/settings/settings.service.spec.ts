import { NotFoundException } from '@nestjs/common';
import { NotificationChannel } from '../../common/enums/domain.enums';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      studioSetting: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      notificationSetting: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      membershipPlan: { findMany: jest.fn(), upsert: jest.fn() },
      coach: { findMany: jest.fn(), upsert: jest.fn() },
      coachTag: { deleteMany: jest.fn(), create: jest.fn() },
      coachCertificate: { deleteMany: jest.fn(), create: jest.fn() },
      member: { findMany: jest.fn(), upsert: jest.fn() },
      course: { findMany: jest.fn(), upsert: jest.fn() },
      courseSession: { findMany: jest.fn(), upsert: jest.fn() },
      booking: { findMany: jest.fn(), upsert: jest.fn() },
      transaction: { findMany: jest.fn(), upsert: jest.fn() },
      adminUser: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
    service = new SettingsService(prisma);
  });

  it('returns default studio settings when none exist', async () => {
    prisma.studioSetting.findFirst.mockResolvedValue(null);

    const result = await service.getStudioSettings();

    expect(result).toEqual({
      studioName: 'Pilates Studio',
      phone: '',
      email: '',
      businessHours: '',
      address: '',
    });
  });

  it('updates existing studio settings when a record exists', async () => {
    prisma.studioSetting.findFirst.mockResolvedValue({ id: 'studio-1' });
    prisma.studioSetting.update.mockResolvedValue({ id: 'studio-1', studioName: 'Pilates Studio' });

    const result = await service.updateStudioSettings({ studioName: 'Pilates Studio' } as never);

    expect(prisma.studioSetting.update).toHaveBeenCalledWith({ where: { id: 'studio-1' }, data: { studioName: 'Pilates Studio' } });
    expect(result.id).toBe('studio-1');
  });

  it('throws when updating a missing notification setting', async () => {
    prisma.notificationSetting.findUnique.mockResolvedValue(null);

    await expect(
      service.updateNotificationSetting({ key: 'missing', enabled: true, channel: NotificationChannel.EMAIL } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates notification channel and enabled state', async () => {
    prisma.notificationSetting.findUnique.mockResolvedValue({ key: 'booking_confirmation' });
    prisma.notificationSetting.update.mockResolvedValue({ key: 'booking_confirmation', enabled: true, channel: NotificationChannel.EMAIL });

    const result = await service.updateNotificationSetting({
      key: 'booking_confirmation',
      enabled: true,
      channel: NotificationChannel.EMAIL,
    } as never);

    expect(prisma.notificationSetting.update).toHaveBeenCalledWith({
      where: { key: 'booking_confirmation' },
      data: { enabled: true, channel: NotificationChannel.EMAIL },
    });
    expect(result.channel).toBe(NotificationChannel.EMAIL);
  });

  it('rejects invalid backup payloads before restore', async () => {
    const result = await service.restoreFromBackup({ version: '1.0', data: { members: {} } });

    expect(result.success).toBe(false);
    expect(result.message).toContain('members must be an array');
  });
});
