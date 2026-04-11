import { NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '../../common/enums/domain.enums';
import { NotificationsService } from './notifications.service';

const createNotification = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'notification-1',
  channel: NotificationChannel.EMAIL,
  status: NotificationStatus.PENDING,
  type: 'BOOKING_REMINDER',
  title: '课程提醒',
  content: '您的课程即将开始',
  payload: null,
  memberId: 'member-1',
  miniUserId: null,
  adminUserId: null,
  sentAt: null,
  readAt: null,
  member: { id: 'member-1', name: '林若溪' },
  miniUser: null,
  adminUser: null,
  createdAt: new Date('2026-04-10T00:00:00.000Z'),
  updatedAt: new Date('2026-04-10T00:00:00.000Z'),
  ...overrides,
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      notificationSetting: {
        findUnique: jest.fn(),
      },
    };
    service = new NotificationsService(prisma);
  });

  it('creates a notification with pending status', async () => {
    prisma.notification.create.mockResolvedValue(createNotification());

    const result = await service.create({
      channel: NotificationChannel.EMAIL,
      type: 'BOOKING_REMINDER',
      title: '课程提醒',
      content: '您的课程即将开始',
      memberId: 'member-1',
    });

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.PENDING,
          type: 'BOOKING_REMINDER',
        }),
      }),
    );
    expect(result.status).toBe(NotificationStatus.PENDING);
  });

  it('returns paginated notifications', async () => {
    prisma.notification.findMany.mockResolvedValue([createNotification()]);
    prisma.notification.count.mockResolvedValue(1);

    const result = await service.findAll({ page: 1, pageSize: 10, status: NotificationStatus.PENDING } as never);

    expect(result.meta).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
    expect(result.data[0].id).toBe('notification-1');
  });

  it('throws when notification is missing', async () => {
    prisma.notification.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks notification as read', async () => {
    prisma.notification.findUnique.mockResolvedValue(createNotification());
    prisma.notification.update.mockResolvedValue(createNotification({ status: NotificationStatus.READ, readAt: new Date() }));

    const result = await service.markAsRead('notification-1');

    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'notification-1' },
        data: expect.objectContaining({ status: NotificationStatus.READ, readAt: expect.any(Date) }),
      }),
    );
    expect(result.status).toBe(NotificationStatus.READ);
  });

  it('marks notification as sent', async () => {
    prisma.notification.findUnique.mockResolvedValue(createNotification());
    prisma.notification.update.mockResolvedValue(createNotification({ status: NotificationStatus.SENT, sentAt: new Date() }));

    const result = await service.markAsSent('notification-1');

    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'notification-1' },
        data: expect.objectContaining({ status: NotificationStatus.SENT, sentAt: expect.any(Date) }),
      }),
    );
    expect(result.status).toBe(NotificationStatus.SENT);
  });

  it('processes pending notifications into sent state', async () => {
    prisma.notification.findMany.mockResolvedValue([
      createNotification({ id: 'notification-1' }),
      createNotification({ id: 'notification-2' }),
    ]);
    prisma.notification.findUnique.mockResolvedValue(createNotification());
    prisma.notification.update
      .mockResolvedValueOnce(createNotification({ id: 'notification-1', status: NotificationStatus.SENT }))
      .mockResolvedValueOnce(createNotification({ id: 'notification-2', status: NotificationStatus.SENT }));

    const result = await service.processPendingNotifications();

    expect(result).toEqual([
      { id: 'notification-1', status: NotificationStatus.SENT },
      { id: 'notification-2', status: NotificationStatus.SENT },
    ]);
  });

  it('creates a notification from an enabled setting', async () => {
    prisma.notificationSetting.findUnique.mockResolvedValue({
      key: 'booking_confirmation',
      title: '预约确认',
      channel: NotificationChannel.MINI_PROGRAM,
      enabled: true,
    });
    prisma.notification.create.mockResolvedValue(createNotification({ channel: NotificationChannel.MINI_PROGRAM }));

    const result = await service.createFromSetting('booking_confirmation', {
      type: 'BOOKING_CONFIRMATION',
      content: '您已成功预约 Morning Flow',
      memberId: 'member-1',
    });

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: NotificationChannel.MINI_PROGRAM,
          title: '预约确认',
        }),
      }),
    );
    expect(result?.channel).toBe(NotificationChannel.MINI_PROGRAM);
  });

  it('returns null when the notification setting is disabled', async () => {
    prisma.notificationSetting.findUnique.mockResolvedValue({
      key: 'booking_confirmation',
      title: '预约确认',
      channel: NotificationChannel.MINI_PROGRAM,
      enabled: false,
    });

    const result = await service.createFromSetting('booking_confirmation', {
      type: 'BOOKING_CONFIRMATION',
      content: '您已成功预约 Morning Flow',
      memberId: 'member-1',
    });

    expect(result).toBeNull();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});
