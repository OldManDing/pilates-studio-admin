import { ConflictException, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '../../common/enums/domain.enums';
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

  it('rejects sent deletion requests that are still unprocessed', async () => {
    prisma.miniUser.findUnique.mockResolvedValue({ id: 'mini-1', nickname: '小溪', phone: '13800000000', member: { id: 'member-1', phone: '13800000000', memberCode: 'M000001', name: '小溪' } });
    prisma.notification.findFirst.mockResolvedValue({
      id: 'sent-request',
      status: NotificationStatus.SENT,
      payload: null,
      readAt: null,
    });

    await expect(service.submitAccountDeletionRequest({}, 'mini-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when mini user does not exist', async () => {
    prisma.miniUser.findUnique.mockResolvedValue(null);

    await expect(service.submitAccountDeletionRequest({}, 'missing-mini-user')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns no_request when no deletion request exists', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);

    const result = await service.getAccountDeletionRequestStatus('mini-1');

    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: {
        type: 'ACCOUNT_DELETION_REQUEST',
        miniUserId: 'mini-1',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        payload: true,
        createdAt: true,
        readAt: true,
        updatedAt: true,
      },
    });
    expect(result).toEqual({
      status: 'no_request',
      requestId: null,
      notificationStatus: null,
      requestedAt: null,
      processedAt: null,
      updatedAt: null,
    });
  });

  it('maps processed account deletion request for mini user status query', async () => {
    const createdAt = new Date('2026-05-01T10:00:00.000Z');
    const processedAt = new Date('2026-05-02T12:00:00.000Z');
    prisma.notification.findFirst.mockResolvedValue({
      id: 'request-1',
      status: NotificationStatus.READ,
      payload: { accountDeletionProcessedAt: processedAt.toISOString() },
      createdAt,
      readAt: processedAt,
      updatedAt: processedAt,
    });

    const result = await service.getAccountDeletionRequestStatus('mini-1');

    expect(result).toEqual({
      status: 'processed',
      requestId: 'request-1',
      notificationStatus: NotificationStatus.READ,
      requestedAt: createdAt,
      processedAt,
      updatedAt: processedAt,
    });
  });

  it('keeps legacy read deletion request compatible in status query', async () => {
    const createdAt = new Date('2026-05-01T10:00:00.000Z');
    const readAt = new Date('2026-05-02T12:00:00.000Z');
    prisma.notification.findFirst.mockResolvedValue({
      id: 'request-legacy',
      status: NotificationStatus.READ,
      payload: null,
      createdAt,
      readAt,
      updatedAt: readAt,
    });

    const result = await service.getAccountDeletionRequestStatus('mini-1');

    expect(result.status).toBe('processed');
    expect(result.notificationStatus).toBe(NotificationStatus.READ);
    expect(result.processedAt).toBe(readAt);
  });
});
