import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { BookingStatus, CoachStatus, MembershipPlanCategory, NotificationChannel, TransactionKind, TransactionStatus, MemberStatus } from '../../common/enums/domain.enums';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  private readonly defaultNotificationSettings = [
    { key: 'booking_confirmation', title: '预约确认', channel: 'MINI_PROGRAM', description: '会员预约成功后发送确认通知' },
    { key: 'booking_cancelled', title: '预约取消', channel: 'MINI_PROGRAM', description: '预约取消后发送提醒通知' },
    { key: 'booking_reminder', title: '开课提醒', channel: 'MINI_PROGRAM', description: '课程开始前发送提醒通知' },
    { key: 'attendance_checked_in', title: '签到成功', channel: 'INTERNAL', description: '会员完成签到后记录通知' },
    { key: 'membership_expiry', title: '会籍到期', channel: 'SMS', description: '会员卡即将到期时发送通知' },
    { key: 'payment_receipt', title: '支付凭证', channel: 'EMAIL', description: '支付成功后发送电子收据' },
  ] as const;

  async getStudioSettings() {
    const settings = await this.prisma.studioSetting.findFirst();

    if (!settings) {
      return {
        studioName: '普拉提工作室',
        phone: '',
        email: '',
        businessHours: '',
        address: '',
        imageUrl: '',
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
    const settings = await this.prisma.notificationSetting.findMany({
      where: {
        key: {
          in: this.defaultNotificationSettings.map((item) => item.key),
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const localizedMap = new Map<string, (typeof this.defaultNotificationSettings)[number]>(
      this.defaultNotificationSettings.map((item) => [item.key, item]),
    );

    return settings.map((setting) => {
      const localized = localizedMap.get(setting.key);
      if (!localized) {
        return setting;
      }

      return {
        ...setting,
        title: localized.title,
        description: localized.description,
        channel: localized.channel as NotificationChannel,
      };
    });
  }

  async updateNotificationSetting(dto: UpdateNotificationDto) {
    const setting = await this.prisma.notificationSetting.findUnique({
      where: { key: dto.key },
    });

    if (!setting) {
      throw new NotFoundException('通知设置不存在');
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
    for (const setting of this.defaultNotificationSettings) {
      const existing = await this.prisma.notificationSetting.findUnique({
        where: { key: setting.key },
      });

      if (!existing) {
        await this.prisma.notificationSetting.create({
          data: setting as any,
        });
      } else {
        await this.prisma.notificationSetting.update({
          where: { key: setting.key },
          data: {
            title: setting.title,
            description: setting.description,
            channel: setting.channel as NotificationChannel,
          },
        });
      }
    }
  }

  async exportAllData(range?: string) {
    const dayCount = range === '近 7 天' ? 7 : range === '本季度' ? 90 : range === '近 30 天' ? 30 : null;
    const startsAt = dayCount ? new Date(Date.now() - dayCount * 24 * 60 * 60 * 1000) : null;

    const includeAdminUsers = !startsAt;

    const [
      studioSettings,
      notificationSettings,
      roles,
      permissions,
      rolePermissions,
      miniUsers,
      membershipPlans,
      members,
      coaches,
      courses,
      sessions,
      bookings,
      attendance,
      courseReviews,
      transactions,
      knowledgeArticles,
      adminUsers,
    ] = await Promise.all([
      this.prisma.studioSetting.findMany(),
      this.prisma.notificationSetting.findMany(),
      this.prisma.role.findMany(),
      this.prisma.permission.findMany(),
      this.prisma.rolePermission.findMany(),
      this.prisma.miniUser.findMany(),
      this.prisma.membershipPlan.findMany(),
      this.prisma.member.findMany({ include: { plan: true } }),
      this.prisma.coach.findMany({ include: { specialties: true, certificates: true } }),
      this.prisma.course.findMany({ include: { coach: true } }),
      this.prisma.courseSession.findMany({ include: { course: true, coach: true } }),
      this.prisma.booking.findMany({
        where: startsAt ? { bookedAt: { gte: startsAt } } : undefined,
        include: { member: true, session: true },
      }),
      this.prisma.attendance.findMany({
        where: startsAt ? { createdAt: { gte: startsAt } } : undefined,
      }),
      this.prisma.courseReview.findMany({
        where: startsAt ? { createdAt: { gte: startsAt } } : undefined,
      }),
      this.prisma.transaction.findMany({
        where: startsAt ? { happenedAt: { gte: startsAt } } : undefined,
        include: { member: true },
      }),
      this.prisma.knowledgeArticle.findMany(),
      includeAdminUsers
        ? this.prisma.adminUser.findMany({
            select: {
              id: true,
              email: true,
              phone: true,
              passwordHash: true,
              displayName: true,
              roleId: true,
              twoFactorEnabled: true,
              twoFactorSecret: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    return {
      exportDate: new Date().toISOString(),
      version: '1.0',
      exportRange: range || '近 30 天',
      data: {
        studioSettings,
        notificationSettings,
        roles,
        permissions,
        rolePermissions,
        miniUsers,
        membershipPlans,
        members,
        coaches,
        courses,
        sessions,
        bookings,
        attendance,
        courseReviews,
        transactions,
        knowledgeArticles,
        adminUsers,
      },
    };
  }

  async restoreFromBackup(backupData: any) {
    // Validate backup format
    if (!backupData.data || !backupData.version) {
      return { success: false, message: '备份文件格式无效' };
    }

    const { data } = backupData;

    const adminUsers = data.adminUsers ?? [];
    data.adminUsers = adminUsers.map((admin: any) => ({
      ...admin,
      roleId: admin.roleId ?? admin.role?.id,
    }));

    try {
      this.validateBackupPayload(backupData);

      // Use transaction to ensure data consistency
      await this.prisma.$transaction(async (prisma) => {
        if (data.studioSettings?.length) {
          for (const studioSetting of data.studioSettings) {
            await prisma.studioSetting.upsert({
              where: { id: studioSetting.id },
              update: studioSetting,
              create: studioSetting,
            });
          }
        }

        if (data.notificationSettings?.length) {
          for (const notificationSetting of data.notificationSettings) {
            await prisma.notificationSetting.upsert({
              where: { key: notificationSetting.key },
              update: notificationSetting,
              create: notificationSetting,
            });
          }
        }

        if (data.roles?.length) {
          for (const role of data.roles) {
            await prisma.role.upsert({
              where: { id: role.id },
              update: role,
              create: role,
            });
          }
        }

        if (data.permissions?.length) {
          for (const permission of data.permissions) {
            await prisma.permission.upsert({
              where: { id: permission.id },
              update: permission,
              create: permission,
            });
          }
        }

        if (data.rolePermissions?.length) {
          for (const rolePermission of data.rolePermissions) {
            await prisma.rolePermission.upsert({
              where: {
                roleId_permissionId: {
                  roleId: rolePermission.roleId,
                  permissionId: rolePermission.permissionId,
                },
              },
              update: rolePermission,
              create: rolePermission,
            });
          }
        }

        if (data.miniUsers?.length) {
          for (const miniUser of data.miniUsers) {
            await prisma.miniUser.upsert({
              where: { id: miniUser.id },
              update: miniUser,
              create: miniUser,
            });
          }
        }

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

        if (data.attendance?.length) {
          for (const attendance of data.attendance) {
            await prisma.attendance.upsert({
              where: { id: attendance.id },
              update: attendance,
              create: attendance,
            });
          }
        }

        if (data.courseReviews?.length) {
          for (const review of data.courseReviews) {
            await prisma.courseReview.upsert({
              where: { id: review.id },
              update: review,
              create: review,
            });
          }
        }

        if (data.knowledgeArticles?.length) {
          for (const article of data.knowledgeArticles) {
            await prisma.knowledgeArticle.upsert({
              where: { id: article.id },
              update: article,
              create: article,
            });
          }
        }

        // Restore admin users (for internal backups)
        if (data.adminUsers?.length) {
          for (const adminUser of data.adminUsers) {
            await prisma.adminUser.upsert({
              where: { id: adminUser.id },
              update: {
                email: adminUser.email,
                phone: adminUser.phone ?? null,
                passwordHash: adminUser.passwordHash,
                displayName: adminUser.displayName,
                roleId: adminUser.roleId,
                twoFactorEnabled: Boolean(adminUser.twoFactorEnabled),
                twoFactorSecret: adminUser.twoFactorSecret ?? null,
              },
              create: {
                id: adminUser.id,
                email: adminUser.email,
                phone: adminUser.phone ?? null,
                passwordHash: adminUser.passwordHash,
                displayName: adminUser.displayName,
                roleId: adminUser.roleId,
                twoFactorEnabled: Boolean(adminUser.twoFactorEnabled),
                twoFactorSecret: adminUser.twoFactorSecret ?? null,
              },
            });
          }
        }
      });

      return { success: true, message: '数据恢复成功' };
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知恢复错误';
      return { success: false, message: `恢复失败：${message}` };
    }
  }

  private validateBackupPayload(backupData: any) {
    const { data } = backupData;

    this.ensureArrayPayload(data.membershipPlans, 'membershipPlans');
    this.ensureArrayPayload(data.studioSettings, 'studioSettings');
    this.ensureArrayPayload(data.notificationSettings, 'notificationSettings');
    this.ensureArrayPayload(data.roles, 'roles');
    this.ensureArrayPayload(data.permissions, 'permissions');
    this.ensureArrayPayload(data.rolePermissions, 'rolePermissions');
    this.ensureArrayPayload(data.miniUsers, 'miniUsers');
    this.ensureArrayPayload(data.coaches, 'coaches');
    this.ensureArrayPayload(data.members, 'members');
    this.ensureArrayPayload(data.courses, 'courses');
    this.ensureArrayPayload(data.sessions, 'sessions');
    this.ensureArrayPayload(data.bookings, 'bookings');
    this.ensureArrayPayload(data.attendance, 'attendance');
    this.ensureArrayPayload(data.courseReviews, 'courseReviews');
    this.ensureArrayPayload(data.transactions, 'transactions');
    this.ensureArrayPayload(data.knowledgeArticles, 'knowledgeArticles');
    this.ensureArrayPayload(data.adminUsers, 'adminUsers');

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

    data.knowledgeArticles?.forEach((article: any, index: number) => {
      this.ensureRequired(article, ['id', 'category', 'question', 'answer'], `knowledgeArticles[${index}]`);
      if (article.sortOrder !== undefined) {
        this.ensureNumber(article.sortOrder, `knowledgeArticles[${index}].sortOrder`);
      }
    });

    data.adminUsers?.forEach((adminUser: any, index: number) => {
      this.ensureRequired(adminUser, ['id', 'email', 'passwordHash', 'displayName', 'roleId'], `adminUsers[${index}]`);
    });
  }

  private ensureArrayPayload(value: unknown, field: string) {
    if (value !== undefined && !Array.isArray(value)) {
      throw new BadRequestException(`${field} 在提供时必须为数组`);
    }
  }

  private ensureRequired(record: Record<string, any>, fields: string[], context: string) {
    fields.forEach((field) => {
      if (record?.[field] === undefined || record?.[field] === null || record?.[field] === '') {
        throw new BadRequestException(`${context}.${field} 为必填项`);
      }
    });
  }

  private ensureEnumValue<T extends Record<string, string>>(value: string, enumType: T, context: string) {
    if (!Object.values(enumType).includes(value)) {
      throw new BadRequestException(`${context} 包含无效枚举值`);
    }
  }

  private ensureNumber(value: unknown, context: string) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new BadRequestException(`${context} 必须为有效数字`);
    }
  }
}
