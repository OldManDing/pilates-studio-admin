import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '../../common/enums/domain.enums';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitAccountDeletionRequestDto } from './dto/submit-account-deletion-request.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private readonly accountDeletionRequestType = 'ACCOUNT_DELETION_REQUEST';

  private isAccountDeletionProcessedStatus(status: string) {
    return status === NotificationStatus.READ;
  }

  private hasProcessedPayload(payload: unknown) {
    return Boolean(
      payload
      && typeof payload === 'object'
      && !Array.isArray(payload)
      && 'accountDeletionProcessedAt' in payload,
    );
  }

  private isAccountDeletionRequestProcessed(request: { status: string; payload: unknown; readAt?: Date | null }) {
    return this.isAccountDeletionProcessedStatus(request.status)
      && (this.hasProcessedPayload(request.payload) || Boolean(request.readAt));
  }

  async submitFeedback(dto: SubmitFeedbackDto, miniUserId: string) {
    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException('Feedback content is required');
    }

    const miniUser = await this.prisma.miniUser.findUnique({
      where: { id: miniUserId },
      include: { member: true },
    });

    if (!miniUser) {
      throw new NotFoundException('Mini user not found');
    }

    const notification = await this.notificationsService.create({
      channel: NotificationChannel.INTERNAL,
      type: 'MINI_PROGRAM_FEEDBACK',
      title: '小程序意见反馈',
      content,
      memberId: miniUser.member?.id,
      miniUserId: miniUser.id,
      payload: {
        phone: miniUser.phone ?? miniUser.member?.phone ?? null,
        nickname: miniUser.nickname ?? null,
      },
    });

    return {
      submitted: true,
      feedbackId: notification?.id,
    };
  }

  async submitAccountDeletionRequest(dto: SubmitAccountDeletionRequestDto, miniUserId: string) {
    const miniUser = await this.prisma.miniUser.findUnique({
      where: { id: miniUserId },
      include: { member: true },
    });

    if (!miniUser) {
      throw new NotFoundException('Mini user not found');
    }

    const latestRequest = await this.prisma.notification.findFirst({
      where: {
        type: this.accountDeletionRequestType,
        miniUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        status: true,
        payload: true,
        readAt: true,
      },
    });

    if (latestRequest && !this.isAccountDeletionRequestProcessed(latestRequest)) {
      throw new ConflictException('An account deletion request is already pending');
    }

    const reason = dto.reason?.trim() || '';
    const applicant = miniUser.nickname || miniUser.member?.name || '小程序用户';
    const content = reason ? `${applicant} 提交了账号注销申请：${reason}` : `${applicant} 提交了账号注销申请。`;

    const notification = await this.notificationsService.create({
      channel: NotificationChannel.INTERNAL,
      type: this.accountDeletionRequestType,
      title: '账号注销申请',
      content,
      memberId: miniUser.member?.id,
      miniUserId: miniUser.id,
      payload: {
        reason: reason || null,
        phone: miniUser.phone ?? miniUser.member?.phone ?? null,
        nickname: miniUser.nickname ?? null,
        memberCode: miniUser.member?.memberCode ?? null,
      },
    });

    return {
      submitted: true,
      requestId: notification?.id,
    };
  }

  async getAccountDeletionRequestStatus(miniUserId: string) {
    const latestRequest = await this.prisma.notification.findFirst({
      where: {
        type: this.accountDeletionRequestType,
        miniUserId,
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

    if (!latestRequest) {
      return {
        status: 'no_request' as const,
        requestId: null,
        notificationStatus: null,
        requestedAt: null,
        processedAt: null,
        updatedAt: null,
      };
    }

    const isProcessed = this.isAccountDeletionRequestProcessed(latestRequest);

    return {
      status: isProcessed ? ('processed' as const) : ('pending' as const),
      requestId: latestRequest.id,
      notificationStatus: latestRequest.status,
      requestedAt: latestRequest.createdAt,
      processedAt: isProcessed ? latestRequest.readAt ?? latestRequest.updatedAt : null,
      updatedAt: latestRequest.updatedAt,
    };
  }
}
