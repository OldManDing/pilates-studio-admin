import { ConflictException, NotFoundException } from '@nestjs/common';
import { NotificationChannel } from '../../common/enums/domain.enums';
import { SupportService } from './support.service';

describe('SupportService', () => {
  let service: SupportService;
  let prisma: any;
  let notificationsService: { create: jest.Mock };

  beforeEach(() => {
    prisma = {
      miniUser: {
        findUnique: jest.fn(),
      },
      notification: {
        findFirst: jest.fn(),
      },
    };

    notificationsService = {
      create: jest.fn(),
    };

    service = new SupportService(prisma, notificationsService as never);
  });

  it('creates feedback notification', async () => {
    prisma.miniUser.findUnique.mockResolvedValue({ id: 'mini-1', nickname: '小溪', phone: '13800000000', member: { id: 'member-1', phone: '13800000000' } });
    notificationsService.create.mockResolvedValue({ id: 'notification-1' });

    const result = await service.submitFeedback({ content: 'feedback' }, 'mini-1');

    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.INTERNAL,
        type: 'MINI_PROGRAM_FEEDBACK',
      }),
    );
    expect(result.feedbackId).toBe('notification-1');
  });

  it('creates account deletion request notification', async () => {
    prisma.miniUser.findUnique.mockResolvedValue({ id: 'mini-1', nickname: '小溪', phone: '13800000000', member: { id: 'member-1', phone: '13800000000', memberCode: 'M000001', name: '小溪' } });
    prisma.notification.findFirst.mockResolvedValue(null);
    notificationsService.create.mockResolvedValue({ id: 'notification-2' });

    const result = await service.submitAccountDeletionRequest({ reason: 'test' }, 'mini-1');

    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ACCOUNT_DELETION_REQUEST',
        memberId: 'member-1',
        miniUserId: 'mini-1',
      }),
    );
    expect(result.requestId).toBe('notification-2');
  });

  it('rejects duplicate pending deletion requests', async () => {
    prisma.miniUser.findUnique.mockResolvedValue({ id: 'mini-1', nickname: '小溪', phone: '13800000000', member: { id: 'member-1', phone: '13800000000', memberCode: 'M000001', name: '小溪' } });
    prisma.notification.findFirst.mockResolvedValue({ id: 'existing-request' });

    await expect(service.submitAccountDeletionRequest({}, 'mini-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when mini user does not exist', async () => {
    prisma.miniUser.findUnique.mockResolvedValue(null);

    await expect(service.submitAccountDeletionRequest({}, 'missing-mini-user')).rejects.toBeInstanceOf(NotFoundException);
  });
});
