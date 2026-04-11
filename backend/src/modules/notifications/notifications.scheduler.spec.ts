import { NotificationChannel, NotificationStatus } from '../../common/enums/domain.enums';
import { NotificationsScheduler } from './notifications.scheduler';

describe('NotificationsScheduler', () => {
  let scheduler: NotificationsScheduler;
  let prisma: any;
  let configService: any;
  let notificationsService: any;
  let notificationDeliveryService: any;

  beforeEach(() => {
    prisma = {
      member: {
        findMany: jest.fn(),
      },
      booking: {
        findMany: jest.fn(),
      },
      notification: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'notifications.expiryReminderDays') return 3;
        if (key === 'notifications.bookingReminderMinutes') return 60;
        if (key === 'notifications.processingBatchSize') return 50;
        return undefined;
      }),
    };

    notificationsService = {
      createFromSetting: jest.fn(),
    };

    notificationDeliveryService = {
      deliver: jest.fn(),
    };

    scheduler = new NotificationsScheduler(
      prisma,
      configService,
      notificationsService,
      notificationDeliveryService,
    );
  });

  it('creates membership expiry reminders for matching members', async () => {
    const now = new Date();
    const joinedAt = new Date(now.getTime() - (365 - 3) * 24 * 60 * 60 * 1000);

    prisma.member.findMany.mockResolvedValue([
      {
        id: 'member-1',
        name: '林若溪',
        joinedAt,
        planId: 'plan-1',
        miniUserId: 'mini-user-1',
        plan: { id: 'plan-1', name: '年卡会员', durationDays: 365 },
      },
    ]);
    prisma.notification.findFirst.mockResolvedValue(null);
    notificationsService.createFromSetting.mockResolvedValue({ id: 'notification-1' });

    const result = await scheduler.scheduleMembershipExpiryReminders();

    expect(notificationsService.createFromSetting).toHaveBeenCalledWith(
      'membership_expiry',
      expect.objectContaining({
        type: 'MEMBERSHIP_EXPIRY',
        memberId: 'member-1',
        miniUserId: 'mini-user-1',
      }),
    );
    expect(result).toEqual([{ memberId: 'member-1', notificationId: 'notification-1' }]);
  });

  it('creates booking reminders for confirmed bookings within the reminder window', async () => {
    const startsAt = new Date(Date.now() + 30 * 60 * 1000);
    prisma.booking.findMany.mockResolvedValue([
      {
        id: 'booking-1',
        memberId: 'member-1',
        sessionId: 'session-1',
        member: {
          miniUserId: 'mini-user-1',
        },
        session: {
          startsAt,
          course: { name: 'Morning Flow' },
        },
      },
    ]);
    prisma.notification.findFirst.mockResolvedValue(null);
    notificationsService.createFromSetting.mockResolvedValue({ id: 'notification-2' });

    const result = await scheduler.scheduleBookingReminders();

    expect(notificationsService.createFromSetting).toHaveBeenCalledWith(
      'booking_reminder',
      expect.objectContaining({
        type: 'BOOKING_REMINDER',
        memberId: 'member-1',
        miniUserId: 'mini-user-1',
      }),
    );
    expect(result).toEqual([{ bookingId: 'booking-1', notificationId: 'notification-2' }]);
  });

  it('processes pending notifications through the delivery service', async () => {
    prisma.notification.findMany.mockResolvedValue([
      { id: 'notification-1', channel: NotificationChannel.MINI_PROGRAM },
      { id: 'notification-2', channel: NotificationChannel.INTERNAL },
    ]);
    notificationDeliveryService.deliver
      .mockResolvedValueOnce({ id: 'notification-1', status: NotificationStatus.SENT })
      .mockResolvedValueOnce({ id: 'notification-2', status: NotificationStatus.SENT });

    const result = await scheduler.processPendingNotifications();

    expect(notificationDeliveryService.deliver).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { id: 'notification-1', status: NotificationStatus.SENT },
      { id: 'notification-2', status: NotificationStatus.SENT },
    ]);
  });
});
