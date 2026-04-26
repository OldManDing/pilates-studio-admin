import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel } from '../../common/enums/domain.enums';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
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
      feedbackId: notification.id,
    };
  }
}
