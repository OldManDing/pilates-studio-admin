import { NotificationChannel, NotificationStatus } from '../../common/enums/domain.enums';
import { NotificationDeliveryService } from './notification-delivery.service';

describe('NotificationDeliveryService', () => {
  let prisma: any;
  let configService: any;
  let service: NotificationDeliveryService;

  beforeEach(() => {
    prisma = {
      notification: {
        update: jest.fn().mockResolvedValue({ id: 'notification-1' }),
      },
    };
    configService = {
      get: jest.fn(() => ''),
    };
    service = new NotificationDeliveryService(prisma, configService);
    jest.restoreAllMocks();
  });

  it('marks MINI_PROGRAM notifications as sent', async () => {
    const fetchMock = jest.spyOn(global, 'fetch' as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ errcode: 0 }) } as Response);
    configService.get.mockImplementation((key: string) => {
      if (key === 'wechat.appId') return 'appid';
      if (key === 'wechat.secret') return 'secret';
      if (key === 'notifications.templateIds') return { bookingConfirmation: 'template-1' };
      return '';
    });

    const result = await service.deliver({
      id: 'notification-1',
      channel: NotificationChannel.MINI_PROGRAM,
      type: 'BOOKING_CONFIRMATION',
      title: '预约确认',
      content: '您已成功预约 Morning Flow',
      miniUser: { openId: 'openid-1' },
      payload: { page: 'pages/bookings/index' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: NotificationStatus.SENT }) }),
    );
    expect(result).toEqual({ id: 'notification-1', status: NotificationStatus.SENT });
  });

  it('reuses cached WeChat access token across deliveries', async () => {
    const fetchMock = jest.spyOn(global, 'fetch' as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'cached-token', expires_in: 7200 }) } as Response)
      .mockResolvedValue({ ok: true, json: async () => ({ errcode: 0 }) } as Response);
    configService.get.mockImplementation((key: string) => {
      if (key === 'wechat.appId') return 'appid';
      if (key === 'wechat.secret') return 'secret';
      if (key === 'notifications.templateIds') return { bookingConfirmation: 'template-1' };
      return '';
    });

    await service.deliver({
      id: 'notification-1',
      channel: NotificationChannel.MINI_PROGRAM,
      type: 'BOOKING_CONFIRMATION',
      title: '预约确认',
      content: '您已成功预约 Morning Flow',
      miniUser: { openId: 'openid-1' },
    });

    await service.deliver({
      id: 'notification-2',
      channel: NotificationChannel.MINI_PROGRAM,
      type: 'BOOKING_CONFIRMATION',
      title: '预约确认',
      content: '您已成功预约 Evening Flow',
      miniUser: { openId: 'openid-2' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries mini-program delivery and records the failure reason', async () => {
    jest.spyOn(global, 'fetch' as any).mockRejectedValue(new Error('temporary network error'));
    configService.get.mockImplementation((key: string) => {
      if (key === 'wechat.appId') return 'appid';
      if (key === 'wechat.secret') return 'secret';
      if (key === 'notifications.templateIds') return { bookingConfirmation: 'template-1' };
      return '';
    });

    const result = await service.deliver({
      id: 'notification-1',
      channel: NotificationChannel.MINI_PROGRAM,
      type: 'BOOKING_CONFIRMATION',
      title: '预约确认',
      content: '您已成功预约 Morning Flow',
      miniUser: { openId: 'openid-1' },
    });

    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationStatus.FAILED,
          failureReason: 'temporary network error',
        }),
      }),
    );
    expect(result).toEqual({ id: 'notification-1', status: NotificationStatus.FAILED });
  });

  it('marks unsupported delivery attempts as failed when credentials are missing', async () => {
    const result = await service.deliver({
      id: 'notification-1',
      channel: NotificationChannel.MINI_PROGRAM,
      type: 'BOOKING_CONFIRMATION',
      title: '预约确认',
      content: '您已成功预约 Morning Flow',
      miniUser: { openId: 'openid-1' },
    });

    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationStatus.FAILED,
          failureReason: 'Missing WeChat credentials, template id, or recipient openId',
        }),
      }),
    );
    expect(result).toEqual({ id: 'notification-1', status: NotificationStatus.FAILED });
  });
});
