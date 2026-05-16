import { NotFoundException } from '@nestjs/common';
import { NotificationChannel } from '../../common/enums/domain.enums';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      notificationSetting: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      role: { findMany: jest.fn(), upsert: jest.fn() },
      permission: { findMany: jest.fn(), upsert: jest.fn() },
      rolePermission: { findMany: jest.fn(), upsert: jest.fn() },
      miniUser: { findMany: jest.fn(), upsert: jest.fn() },
      membershipPlan: { findMany: jest.fn(), upsert: jest.fn() },
      coach: { findMany: jest.fn(), upsert: jest.fn() },
      coachTag: { deleteMany: jest.fn(), create: jest.fn() },
      coachCertificate: { deleteMany: jest.fn(), create: jest.fn() },
      member: { findMany: jest.fn(), upsert: jest.fn() },
      course: { findMany: jest.fn(), upsert: jest.fn() },
      courseSession: { findMany: jest.fn(), upsert: jest.fn() },
      booking: { findMany: jest.fn(), upsert: jest.fn() },
      attendance: { findMany: jest.fn(), upsert: jest.fn() },
      courseReview: { findMany: jest.fn(), upsert: jest.fn() },
      transaction: { findMany: jest.fn(), upsert: jest.fn() },
      knowledgeArticle: { findMany: jest.fn(), upsert: jest.fn() },
      studioSetting: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      miniPageImage: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      adminUser: { findMany: jest.fn(), upsert: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
    service = new SettingsService(prisma);
  });

  it('returns default studio settings when none exist', async () => {
    prisma.studioSetting.findFirst.mockResolvedValue(null);

    const result = await service.getStudioSettings();

    expect(result).toEqual({
      studioName: '愈己CareMe工作室',
      phone: '',
      email: '',
      businessHours: '',
      address: '',
      imageUrl: '',
    });
  });

  it('updates existing studio settings when a record exists', async () => {
    prisma.studioSetting.findFirst.mockResolvedValue({ id: 'studio-1' });
    prisma.studioSetting.update.mockResolvedValue({ id: 'studio-1', studioName: '愈己CareMe工作室' });

    const result = await service.updateStudioSettings({ studioName: '愈己CareMe工作室' } as never);

    expect(prisma.studioSetting.update).toHaveBeenCalledWith({ where: { id: 'studio-1' }, data: { studioName: '愈己CareMe工作室' } });
    expect(result.id).toBe('studio-1');
  });

  it('returns mini-program page image defaults with saved overrides', async () => {
    prisma.miniPageImage.findMany.mockResolvedValue([
      { pageKey: 'courses', imageUrl: 'data:image/png;base64,courses', updatedAt: new Date('2026-05-08T08:00:00.000Z') },
    ]);

    const result = await service.getMiniPageImages();
    const coursesImage = result.find((item) => item.pageKey === 'courses');
    const profileImage = result.find((item) => item.pageKey === 'profile');

    expect(result.length).toBeGreaterThan(0);
    expect(coursesImage).toMatchObject({
      label: '预约',
      imageUrl: 'data:image/png;base64,courses',
      isDefault: false,
    });
    expect(profileImage).toMatchObject({
      label: '我的',
      imageUrl: '',
      isDefault: true,
    });
  });

  it('omits oversized inline page images in compact mini-program payloads', async () => {
    const oversizedInlineImage = `data:image/jpeg;base64,${'a'.repeat(130 * 1024)}`;
    const remoteImageUrl = 'https://cdn.example.com/courses.jpg';
    const smallInlineImage = 'data:image/png;base64,profile';

    prisma.miniPageImage.findMany.mockResolvedValue([
      { pageKey: 'home', imageUrl: oversizedInlineImage, updatedAt: new Date('2026-05-08T08:00:00.000Z') },
      { pageKey: 'courses', imageUrl: remoteImageUrl, updatedAt: new Date('2026-05-08T08:00:00.000Z') },
      { pageKey: 'profile', imageUrl: smallInlineImage, updatedAt: new Date('2026-05-08T08:00:00.000Z') },
    ]);

    const result = await service.getMiniPageImages({ compact: true });
    const homeImage = result.find((item) => item.pageKey === 'home');
    const coursesImage = result.find((item) => item.pageKey === 'courses');
    const profileImage = result.find((item) => item.pageKey === 'profile');

    expect(homeImage).toMatchObject({ imageUrl: '', isDefault: true });
    expect(coursesImage).toMatchObject({ imageUrl: remoteImageUrl, isDefault: false });
    expect(profileImage).toMatchObject({ imageUrl: smallInlineImage, isDefault: false });
  });

  it('returns a single full mini-program page image when pageKey is specified', async () => {
    const oversizedInlineImage = `data:image/jpeg;base64,${'a'.repeat(130 * 1024)}`;
    prisma.miniPageImage.findMany.mockResolvedValue([
      { pageKey: 'coaches', imageUrl: oversizedInlineImage, updatedAt: new Date('2026-05-08T08:00:00.000Z') },
    ]);

    const result = await service.getMiniPageImages({ pageKey: 'coaches' });

    expect(prisma.miniPageImage.findMany).toHaveBeenCalledWith({
      where: {
        pageKey: {
          in: ['coaches', 'myCoaches'],
        },
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      pageKey: 'coaches',
      imageUrl: oversizedInlineImage,
      isDefault: false,
    });
  });

  it('lets coach list pages inherit the my coaches image when they have no override', async () => {
    const coachImageUrl = 'https://cdn.example.com/coaches.jpg';
    prisma.miniPageImage.findMany.mockResolvedValue([
      { pageKey: 'coaches', imageUrl: '', updatedAt: new Date('2026-05-08T08:00:00.000Z') },
      { pageKey: 'myCoaches', imageUrl: coachImageUrl, updatedAt: new Date('2026-05-08T09:00:00.000Z') },
    ]);

    const result = await service.getMiniPageImages({ pageKey: 'coaches' });

    expect(prisma.miniPageImage.findMany).toHaveBeenCalledWith({
      where: {
        pageKey: {
          in: ['coaches', 'myCoaches'],
        },
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      pageKey: 'coaches',
      imageUrl: coachImageUrl,
      isDefault: false,
    });
  });

  it('rejects unknown mini-program page image keys when querying one page', async () => {
    await expect(service.getMiniPageImages({ pageKey: 'unknown' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a mini-program page image', async () => {
    const updatedAt = new Date('2026-05-08T09:00:00.000Z');
    prisma.miniPageImage.upsert.mockResolvedValue({ pageKey: 'profile', imageUrl: 'data:image/png;base64,profile', updatedAt });

    const result = await service.updateMiniPageImage('profile', { imageUrl: ' data:image/png;base64,profile ' });

    expect(prisma.miniPageImage.upsert).toHaveBeenCalledWith({
      where: { pageKey: 'profile' },
      update: { imageUrl: 'data:image/png;base64,profile' },
      create: { pageKey: 'profile', imageUrl: 'data:image/png;base64,profile' },
    });
    expect(result).toMatchObject({
      pageKey: 'profile',
      imageUrl: 'data:image/png;base64,profile',
      isDefault: false,
      updatedAt: updatedAt.toISOString(),
    });
  });

  it('rejects unknown mini-program page image keys', async () => {
    await expect(service.updateMiniPageImage('unknown', { imageUrl: '' })).rejects.toBeInstanceOf(NotFoundException);
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
    expect(result.message).toContain('members 在提供时必须为数组');
  });
});
