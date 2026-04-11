import { NotificationChannel, NotificationStatus } from '../../common/enums/domain.enums';
import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  const notificationsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    markAsRead: jest.fn(),
  };

  const controller = new NotificationsController(notificationsService as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegates create and list operations', async () => {
    notificationsService.create.mockResolvedValue({ id: 'notification-1' });
    notificationsService.findAll.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } });

    await expect(
      controller.create({
        channel: NotificationChannel.EMAIL,
        type: 'BOOKING_REMINDER',
        title: '课程提醒',
        content: '您的课程即将开始',
      } as never),
    ).resolves.toEqual({ id: 'notification-1' });

    await expect(controller.findAll({ page: 1, pageSize: 10, status: NotificationStatus.PENDING } as never)).resolves.toEqual({
      data: [],
      meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
  });

  it('delegates get-by-id and mark-as-read', async () => {
    notificationsService.findOne.mockResolvedValue({ id: 'notification-1' });
    notificationsService.markAsRead.mockResolvedValue({ id: 'notification-1', status: NotificationStatus.READ });

    await expect(controller.findOne('notification-1')).resolves.toEqual({ id: 'notification-1' });
    await expect(controller.markAsRead('notification-1')).resolves.toEqual({ id: 'notification-1', status: NotificationStatus.READ });
  });
});
