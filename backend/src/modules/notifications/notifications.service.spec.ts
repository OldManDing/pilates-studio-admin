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
  let notificationDeliveryService: { deliver: jest.Mock };

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      notificationSetting: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };
    notificationDeliveryService = {
      deliver: jest.fn().mockResolvedValue({ id: 'notification-1', status: NotificationStatus.SENT }),
    };
    service = new NotificationsService(prisma, notificationDeliveryService as never);
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
    expect(result?.status).toBe(NotificationStatus.PENDING);
    expect(notificationDeliveryService.deliver).toHaveBeenCalledWith(expect.objectContaining({
      id: 'notification-1',
      channel: NotificationChannel.EMAIL,
    }));
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

  it('rejects marking account deletion request as read directly', async () => {
    prisma.notification.findUnique.mockResolvedValue(createNotification({
      id: 'notification-deletion',
      type: 'ACCOUNT_DELETION_REQUEST',
    }));

    await expect(service.markAsRead('notification-deletion')).rejects.toThrow(
      'Account deletion requests must be processed through the dedicated endpoint',
    );
    expect(prisma.notification.update).not.toHaveBeenCalled();
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
    prisma.notification.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    notificationDeliveryService.deliver
      .mockResolvedValueOnce({ id: 'notification-1', status: NotificationStatus.SENT })
      .mockResolvedValueOnce({ id: 'notification-2', status: NotificationStatus.SENT });

    const result = await service.processPendingNotifications();

    expect(result).toEqual([
      { id: 'notification-1', status: NotificationStatus.SENT },
      { id: 'notification-2', status: NotificationStatus.SENT },
    ]);
  });

  it('marks a locked pending notification as failed when delivery throws unexpectedly', async () => {
    prisma.notification.findMany.mockResolvedValue([
      createNotification({ id: 'notification-1' }),
    ]);
    prisma.notification.updateMany = jest.fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    notificationDeliveryService.deliver.mockRejectedValueOnce(new Error('unexpected update failure'));

    const result = await service.processPendingNotifications();

    expect(prisma.notification.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'notification-1',
          status: NotificationStatus.PENDING,
        }),
        data: expect.objectContaining({
          status: NotificationStatus.FAILED,
          failureReason: 'unexpected update failure',
        }),
      }),
    );
    expect(result).toEqual([{ id: 'notification-1', status: NotificationStatus.FAILED }]);
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

  it('auto-initializes a missing default notification setting before creating', async () => {
    prisma.notificationSetting.findUnique.mockResolvedValue(null);
    prisma.notificationSetting.upsert.mockResolvedValue({
      key: 'membership_renewal_request',
      title: '会员续费申请',
      channel: NotificationChannel.INTERNAL,
      enabled: true,
    });
    prisma.notification.create.mockResolvedValue(createNotification({ channel: NotificationChannel.INTERNAL, type: 'MEMBERSHIP_RENEWAL_REQUEST' }));

    const result = await service.createFromSetting('membership_renewal_request', {
      type: 'MEMBERSHIP_RENEWAL_REQUEST',
      content: '会员提交了续费申请。',
      memberId: 'member-1',
    });

    expect(prisma.notificationSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { key: 'membership_renewal_request' },
    }));
    expect(result?.type).toBe('MEMBERSHIP_RENEWAL_REQUEST');
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

  it('skips mini notification creation when member preference disables it', async () => {
    prisma.notificationSetting.findUnique.mockResolvedValueOnce({ enabled: false });

    const result = await service.create({
      channel: NotificationChannel.MINI_PROGRAM,
      type: 'BOOKING_REMINDER',
      title: '课程提醒',
      content: '提醒',
      miniUserId: 'mini-1',
    });

    expect(result).toBeNull();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('filters mini notification list to sent and read by default', async () => {
    prisma.notification.findMany.mockResolvedValue([createNotification({ status: NotificationStatus.SENT, miniUserId: 'mini-1', channel: NotificationChannel.MINI_PROGRAM })]);
    prisma.notification.count.mockResolvedValue(1);

    await service.findMine('mini-1', { page: 1, pageSize: 10 } as never);

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          miniUserId: 'mini-1',
          channel: NotificationChannel.MINI_PROGRAM,
          status: { in: [NotificationStatus.SENT, NotificationStatus.READ] },
        }),
      }),
    );
  });

  it('processes account deletion request in one service call', async () => {
    prisma.notification.findUnique.mockResolvedValue(createNotification({
      id: 'notification-3',
      type: 'ACCOUNT_DELETION_REQUEST',
      memberId: 'member-1',
      miniUserId: 'mini-1',
      payload: { reason: 'test' },
    }));
    prisma.notification.update.mockResolvedValue(createNotification({
      id: 'notification-3',
      type: 'ACCOUNT_DELETION_REQUEST',
      status: NotificationStatus.READ,
      memberId: 'member-1',
      miniUserId: 'mini-1',
      readAt: new Date(),
      payload: { reason: 'test', accountDeletionProcessedAt: '2026-05-03T00:00:00.000Z' },
    }));
    prisma.member = { update: jest.fn().mockResolvedValue({ id: 'member-1', status: 'SUSPENDED' }) };
    prisma.miniUser = { update: jest.fn().mockResolvedValue({ id: 'mini-1', status: 'DISABLED' }) };
    prisma.$transaction = jest.fn().mockImplementation(async (callback: (tx: any) => unknown) => callback(prisma));

    const result = await service.processAccountDeletionRequest('notification-3');

    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { status: 'SUSPENDED' },
    });
    expect(prisma.miniUser.update).toHaveBeenCalledWith({
      where: { id: 'mini-1' },
      data: { status: 'DISABLED' },
    });
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'notification-3' },
        data: expect.objectContaining({
          status: NotificationStatus.READ,
          payload: expect.objectContaining({
            reason: 'test',
            accountDeletionProcessedAt: expect.any(String),
          }),
          readAt: expect.any(Date),
        }),
      }),
    );
    expect(result.status).toBe(NotificationStatus.READ);
  });
});
