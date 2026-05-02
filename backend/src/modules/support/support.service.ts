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

    const existing = await this.prisma.notification.findFirst({
      where: {
        type: 'ACCOUNT_DELETION_REQUEST',
        miniUserId,
        status: NotificationStatus.PENDING,
      },
    });

    if (existing) {
      throw new ConflictException('An account deletion request is already pending');
    }

    const reason = dto.reason?.trim() || '';
    const applicant = miniUser.nickname || miniUser.member?.name || '小程序用户';
    const content = reason ? `${applicant} 提交了账号注销申请：${reason}` : `${applicant} 提交了账号注销申请。`;

    const notification = await this.notificationsService.create({
      channel: NotificationChannel.INTERNAL,
      type: 'ACCOUNT_DELETION_REQUEST',
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
}
