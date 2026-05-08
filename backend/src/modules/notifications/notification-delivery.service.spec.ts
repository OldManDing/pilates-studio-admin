import { NotificationChannel, NotificationStatus } from '../../common/enums/domain.enums';
import { NotificationDeliveryService } from './notification-delivery.service';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

const nodemailer = require('nodemailer').default;

describe('NotificationDeliveryService', () => {
  let prisma: any;
  let configService: any;
  let service: NotificationDeliveryService;

  beforeEach(() => {
    prisma = {
      notification: {
        update: jest.fn().mockResolvedValue({ id: 'notification-1' }),
        findUnique: jest.fn(),
      },
    };
    configService = {
      get: jest.fn(() => ''),
    };
    service = new NotificationDeliveryService(prisma, configService);
    jest.restoreAllMocks();
    nodemailer.createTransport.mockReset();
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

  it('keeps mini-program inbox delivery visible when subscribe message push fails', async () => {
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
          status: NotificationStatus.SENT,
          failureReason: '小程序消息中心已生成；微信订阅消息推送失败：临时网络异常',
        }),
      }),
    );
    expect(result).toEqual({ id: 'notification-1', status: NotificationStatus.SENT });
  });

  it('keeps mini-program inbox delivery visible when subscribe message config is missing', async () => {
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
          status: NotificationStatus.SENT,
          failureReason: '小程序消息中心已生成；微信订阅消息未发送：缺少微信配置、订阅消息模板或接收人 openId',
        }),
      }),
    );
    expect(result).toEqual({ id: 'notification-1', status: NotificationStatus.SENT });
  });

  it('sends EMAIL notifications through nodemailer when config and recipient are present', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'message-1' });
    nodemailer.createTransport.mockReturnValue({ sendMail });
    prisma.notification.findUnique.mockResolvedValue({
      id: 'notification-1',
      member: { email: 'lin@example.com' },
    });
    configService.get.mockImplementation((key: string) => {
      if (key === 'email.host') return 'smtp.example.com';
      if (key === 'email.port') return 587;
      if (key === 'email.user') return 'mailer';
      if (key === 'email.password') return 'secret';
      if (key === 'email.from') return 'no-reply@example.com';
      return '';
    });

    const result = await service.deliver({
      id: 'notification-1',
      channel: NotificationChannel.EMAIL,
      title: '支付凭证',
      content: '已记录一笔金额为 1000.00 元的交易。',
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'lin@example.com',
        subject: '支付凭证',
      }),
    );
    expect(result).toEqual({ id: 'notification-1', status: NotificationStatus.SENT });
  });

  it('marks EMAIL notifications as failed when recipient email is missing', async () => {
    prisma.notification.findUnique.mockResolvedValue({ id: 'notification-1', member: { email: null } });
    configService.get.mockImplementation((key: string) => {
      if (key === 'email.host') return 'smtp.example.com';
      if (key === 'email.port') return 587;
      if (key === 'email.user') return 'mailer';
      if (key === 'email.password') return 'secret';
      if (key === 'email.from') return 'no-reply@example.com';
      return '';
    });

    const result = await service.deliver({
      id: 'notification-1',
      channel: NotificationChannel.EMAIL,
      title: '支付凭证',
      content: '已记录一笔金额为 1000.00 元的交易。',
    });

    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationStatus.FAILED,
          failureReason: '邮件未发送：缺少 SMTP 配置或接收人邮箱',
        }),
      }),
    );
    expect(result).toEqual({ id: 'notification-1', status: NotificationStatus.FAILED });
  });
});
