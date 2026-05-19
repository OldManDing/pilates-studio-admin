import { NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { NotificationChannel } from '../../common/enums/domain.enums';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: any;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    delete process.env.TENCENT_MAP_KEY;
    delete process.env.TENCENT_LBS_KEY;
    delete process.env.QQ_MAP_KEY;
    delete process.env.TENCENT_MAP_SK;
    delete process.env.TENCENT_LBS_SK;
    delete process.env.QQ_MAP_SK;
    delete process.env.AMAP_KEY;
    delete process.env.GAODE_MAP_KEY;
    fetchMock = jest.fn();
    (globalThis as typeof globalThis & { fetch: jest.Mock }).fetch = fetchMock;
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
      latitude: null,
      longitude: null,
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

  it('does not use inaccurate fallback geocoding for Chinese addresses without a local map key', async () => {
    prisma.studioSetting.findFirst.mockResolvedValue({ id: 'studio-1' });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '31.2304', lon: '121.4737' }],
    });

    await service.updateStudioSettings({
      studioName: 'CareMe Studio',
      phone: '400-123-4567',
      email: 'info@example.com',
      businessHours: '09:00-21:00',
      address: '上海市静安区南京西路1000号',
    } as never);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(prisma.studioSetting.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          latitude: null,
          longitude: null,
        }),
      }),
    );
  });

  it('uses Tencent Maps geocoding when a map key is configured', async () => {
    process.env.TENCENT_MAP_KEY = 'test-map-key';
    prisma.studioSetting.findFirst.mockResolvedValue({ id: 'studio-1' });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 0,
        result: {
          location: {
            lat: 31.2304,
            lng: 121.4737,
          },
        },
      }),
    });

    await service.updateStudioSettings({
      studioName: 'CareMe Studio',
      phone: '400-123-4567',
      email: 'info@example.com',
      businessHours: '09:00-21:00',
      address: '上海市静安区南京西路1000号',
    } as never);

    expect(fetchMock.mock.calls[0][0]).toContain('apis.map.qq.com/ws/geocoder/v1/');
    expect(fetchMock.mock.calls[0][0]).toContain('key=test-map-key');
    expect(prisma.studioSetting.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          latitude: 31.2304,
          longitude: 121.4737,
        }),
      }),
    );
  });

  it('signs Tencent Maps geocoding requests when a map SK is configured', async () => {
    process.env.TENCENT_MAP_KEY = 'test-map-key';
    process.env.TENCENT_MAP_SK = 'test-map-sk';
    prisma.studioSetting.findFirst.mockResolvedValue({ id: 'studio-1' });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 0,
        result: {
          location: {
            lat: 31.2304,
            lng: 121.4737,
          },
        },
      }),
    });

    await service.updateStudioSettings({
      address: '上海市静安区南京西路1000号',
    } as never);

    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string);
    const queryEntries = Array.from(requestUrl.searchParams.entries())
      .filter(([key]) => key !== 'sig')
      .sort(([left], [right]) => left.localeCompare(right));
    const rawQuery = queryEntries
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const expectedSig = createHash('md5')
      .update(`/ws/geocoder/v1/?${rawQuery}test-map-sk`)
      .digest('hex');

    expect(requestUrl.searchParams.get('sig')).toBe(expectedSig);
  });

  it('re-geocodes a changed studio address instead of keeping unchanged old coordinates', async () => {
    process.env.AMAP_KEY = 'test-amap-key';
    prisma.studioSetting.findFirst.mockResolvedValue({
      id: 'studio-1',
      address: '旧地址',
      latitude: 31.2304,
      longitude: 121.4737,
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: '1',
        geocodes: [{ location: '118.7303,32.0034' }],
      }),
    });

    await service.updateStudioSettings({
      studioName: 'CareMe Studio',
      phone: '400-123-4567',
      email: 'info@example.com',
      businessHours: '09:00-21:00',
      address: '新地址',
      latitude: 31.2304,
      longitude: 121.4737,
    } as never);

    expect(fetchMock).toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][0]).toContain('restapi.amap.com/v3/geocode/geo');
    expect(prisma.studioSetting.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          address: '新地址',
          latitude: 32.0034,
          longitude: 118.7303,
        }),
      }),
    );
  });

  it('tries simplified Chinese address variants with Tencent Maps when the full address is not resolved', async () => {
    process.env.TENCENT_MAP_KEY = 'test-map-key';
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 0, result: {} }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 0, result: {} }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 0, result: {} }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 0, result: {} }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 0, result: {} }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 0,
          result: {
            location: {
              lat: 32.0058,
              lng: 118.7243,
            },
          },
        }),
      });

    await expect(service.geocodeStudioLocation('江苏省南京市建邺区信安大厦B座')).resolves.toEqual({
      latitude: 32.0058,
      longitude: 118.7243,
      source: 'geocoded',
    });
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(fetchMock.mock.calls[5][0]).toContain(encodeURIComponent('建邺区 信安大厦'));
  });

  it('stops Tencent geocoding retries when the API returns a fatal status', async () => {
    process.env.TENCENT_MAP_KEY = 'test-map-key';
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 121,
        message: 'daily quota exceeded',
      }),
    });

    await expect(service.geocodeStudioLocation('江苏省南京市建邺区信安大厦A座')).rejects.toBeInstanceOf(NotFoundException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
