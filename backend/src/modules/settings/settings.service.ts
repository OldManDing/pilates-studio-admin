import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { BookingStatus, CoachStatus, MembershipPlanCategory, NotificationChannel, TransactionKind, TransactionStatus, MemberStatus } from '../../common/enums/domain.enums';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getStudioSettings() {
    const settings = await this.prisma.studioSetting.findFirst();

    if (!settings) {
      // Return default settings if none exist
      return {
        studioName: 'Pilates Studio',
        phone: '',
        email: '',
        businessHours: '',
        address: '',
      };
    }

    return settings;
  }

  async updateStudioSettings(dto: UpdateStudioDto) {
    const existing = await this.prisma.studioSetting.findFirst();

    if (existing) {
      return this.prisma.studioSetting.update({
        where: { id: existing.id },
        data: dto,
      });
    }

    return this.prisma.studioSetting.create({
      data: dto,
    });
  }

  async getNotificationSettings() {
    return this.prisma.notificationSetting.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateNotificationSetting(dto: UpdateNotificationDto) {
    const setting = await this.prisma.notificationSetting.findUnique({
      where: { key: dto.key },
    });

    if (!setting) {
      throw new NotFoundException('Notification setting not found');
    }

    return this.prisma.notificationSetting.update({
      where: { key: dto.key },
      data: {
        enabled: dto.enabled,
        ...(dto.channel ? { channel: dto.channel } : {}),
      },
    });
  }

  async initializeDefaultSettings() {
    const defaultSettings = [
        { key: 'booking_confirmation', title: '预约确认', channel: 'MINI_PROGRAM', description: '会员预约成功后发送确认通知' },
        { key: 'booking_cancelled', title: '预约取消', channel: 'MINI_PROGRAM', description: '预约取消后发送提醒通知' },
        { key: 'booking_reminder', title: '开课提醒', channel: 'MINI_PROGRAM', description: '课程开始前发送提醒通知' },
        { key: 'attendance_checked_in', title: '签到成功', channel: 'INTERNAL', description: '会员完成签到后记录通知' },
        { key: 'membership_expiry', title: '会籍到期', channel: 'SMS', description: '会员卡即将到期时发送通知' },
        { key: 'payment_receipt', title: '支付凭证', channel: 'EMAIL', description: '支付成功后发送电子收据' },
      ];

    for (const setting of defaultSettings) {
      const existing = await this.prisma.notificationSetting.findUnique({
        where: { key: setting.key },
      });

      if (!existing) {
        await this.prisma.notificationSetting.create({
          data: setting as any,
        });
      }
    }
  }

  async exportAllData() {
    const [
      members,
      coaches,
      courses,
      sessions,
      bookings,
      transactions,
      membershipPlans,
      adminUsers,
    ] = await Promise.all([
      this.prisma.member.findMany({
        include: { plan: true },
      }),
      this.prisma.coach.findMany({
        include: { specialties: true, certificates: true },
      }),
      this.prisma.course.findMany({
        include: { coach: true },
      }),
      this.prisma.courseSession.findMany({
        include: { course: true, coach: true },
      }),
      this.prisma.booking.findMany({
        include: { member: true, session: true },
      }),
      this.prisma.transaction.findMany({
        include: { member: true },
      }),
      this.prisma.membershipPlan.findMany(),
      this.prisma.adminUser.findMany({
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        members,
        coaches,
        courses,
        sessions,
        bookings,
        transactions,
        membershipPlans,
        adminUsers,
      },
    };
  }

  async restoreFromBackup(backupData: any) {
    // Validate backup format
    if (!backupData.data || !backupData.version) {
      return { success: false, message: 'Invalid backup format' };
    }

    const { data } = backupData;

    try {
      this.validateBackupPayload(backupData);

      // Use transaction to ensure data consistency
      await this.prisma.$transaction(async (prisma) => {
        // Restore membership plans first (no dependencies)
        if (data.membershipPlans?.length) {
          for (const plan of data.membershipPlans) {
            await prisma.membershipPlan.upsert({
              where: { id: plan.id },
              update: plan,
              create: plan,
            });
          }
        }

        // Restore coaches
        if (data.coaches?.length) {
          for (const coach of data.coaches) {
            const { specialties, certificates, ...coachData } = coach;
            await prisma.coach.upsert({
              where: { id: coach.id },
              update: coachData,
              create: coachData,
            });

            // Restore specialties
            if (specialties?.length) {
              await prisma.coachTag.deleteMany({ where: { coachId: coach.id } });
              for (const tag of specialties) {
                await prisma.coachTag.create({
                  data: { coachId: coach.id, value: tag.value },
                });
              }
            }

            // Restore certificates
            if (certificates?.length) {
              await prisma.coachCertificate.deleteMany({ where: { coachId: coach.id } });
              for (const cert of certificates) {
                await prisma.coachCertificate.create({
                  data: { coachId: coach.id, value: cert.value },
                });
              }
            }
          }
        }

        // Restore members
        if (data.members?.length) {
          for (const member of data.members) {
            const { plan, membershipPlan, ...memberData } = member;
            await prisma.member.upsert({
              where: { id: member.id },
              update: memberData,
              create: memberData,
            });
          }
        }

        // Restore courses
        if (data.courses?.length) {
          for (const course of data.courses) {
            const { coach, ...courseData } = course;
            await prisma.course.upsert({
              where: { id: course.id },
              update: courseData,
              create: courseData,
            });
          }
        }

        // Restore sessions
        if (data.sessions?.length) {
          for (const session of data.sessions) {
            const { course, coach, ...sessionData } = session;
            await prisma.courseSession.upsert({
              where: { id: session.id },
              update: sessionData,
              create: sessionData,
            });
          }
        }

        // Restore bookings
        if (data.bookings?.length) {
          for (const booking of data.bookings) {
            const { member, session, ...bookingData } = booking;
            await prisma.booking.upsert({
              where: { id: booking.id },
              update: bookingData,
              create: bookingData,
            });
          }
        }

        // Restore transactions
        if (data.transactions?.length) {
          for (const transaction of data.transactions) {
            const { member, ...transactionData } = transaction;
            await prisma.transaction.upsert({
              where: { id: transaction.id },
              update: transactionData,
              create: transactionData,
            });
          }
        }
      });

      return { success: true, message: 'Data restored successfully' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown restore error';
      return { success: false, message: `Restore failed: ${message}` };
    }
  }

  private validateBackupPayload(backupData: any) {
    const { data } = backupData;

    this.ensureArrayPayload(data.membershipPlans, 'membershipPlans');
    this.ensureArrayPayload(data.coaches, 'coaches');
    this.ensureArrayPayload(data.members, 'members');
    this.ensureArrayPayload(data.courses, 'courses');
    this.ensureArrayPayload(data.sessions, 'sessions');
    this.ensureArrayPayload(data.bookings, 'bookings');
    this.ensureArrayPayload(data.transactions, 'transactions');

    data.membershipPlans?.forEach((plan: any, index: number) => {
      this.ensureRequired(plan, ['id', 'code', 'name', 'category', 'priceCents'], `membershipPlans[${index}]`);
      this.ensureEnumValue(plan.category, MembershipPlanCategory, `membershipPlans[${index}].category`);
      this.ensureNumber(plan.priceCents, `membershipPlans[${index}].priceCents`);
    });

    data.coaches?.forEach((coach: any, index: number) => {
      this.ensureRequired(coach, ['id', 'coachCode', 'name', 'phone', 'status'], `coaches[${index}]`);
      this.ensureEnumValue(coach.status, CoachStatus, `coaches[${index}].status`);
    });

    data.members?.forEach((member: any, index: number) => {
      this.ensureRequired(member, ['id', 'memberCode', 'name', 'phone', 'status', 'joinedAt', 'remainingCredits'], `members[${index}]`);
      this.ensureEnumValue(member.status, MemberStatus, `members[${index}].status`);
      this.ensureNumber(member.remainingCredits, `members[${index}].remainingCredits`);
    });

    data.courses?.forEach((course: any, index: number) => {
      this.ensureRequired(course, ['id', 'courseCode', 'name', 'type', 'level', 'durationMinutes', 'capacity'], `courses[${index}]`);
      this.ensureNumber(course.durationMinutes, `courses[${index}].durationMinutes`);
      this.ensureNumber(course.capacity, `courses[${index}].capacity`);
    });

    data.sessions?.forEach((session: any, index: number) => {
      this.ensureRequired(session, ['id', 'sessionCode', 'courseId', 'coachId', 'startsAt', 'endsAt', 'capacity', 'bookedCount'], `sessions[${index}]`);
      this.ensureNumber(session.capacity, `sessions[${index}].capacity`);
      this.ensureNumber(session.bookedCount, `sessions[${index}].bookedCount`);
    });

    data.bookings?.forEach((booking: any, index: number) => {
      this.ensureRequired(booking, ['id', 'bookingCode', 'memberId', 'sessionId', 'source', 'status', 'bookedAt'], `bookings[${index}]`);
      this.ensureEnumValue(booking.status, BookingStatus, `bookings[${index}].status`);
    });

    data.transactions?.forEach((transaction: any, index: number) => {
      this.ensureRequired(transaction, ['id', 'transactionCode', 'kind', 'status', 'amountCents', 'happenedAt'], `transactions[${index}]`);
      this.ensureEnumValue(transaction.kind, TransactionKind, `transactions[${index}].kind`);
      this.ensureEnumValue(transaction.status, TransactionStatus, `transactions[${index}].status`);
      this.ensureNumber(transaction.amountCents, `transactions[${index}].amountCents`);
    });
  }

  private ensureArrayPayload(value: unknown, field: string) {
    if (value !== undefined && !Array.isArray(value)) {
      throw new BadRequestException(`${field} must be an array when provided`);
    }
  }

  private ensureRequired(record: Record<string, any>, fields: string[], context: string) {
    fields.forEach((field) => {
      if (record?.[field] === undefined || record?.[field] === null || record?.[field] === '') {
        throw new BadRequestException(`${context}.${field} is required`);
      }
    });
  }

  private ensureEnumValue<T extends Record<string, string>>(value: string, enumType: T, context: string) {
    if (!Object.values(enumType).includes(value)) {
      throw new BadRequestException(`${context} contains invalid enum value`);
    }
  }

  private ensureNumber(value: unknown, context: string) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new BadRequestException(`${context} must be a valid number`);
    }
  }
}
