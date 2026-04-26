import { PrismaClient, AdminRoleCode, MemberStatus, BookingStatus, AttendanceStatus, TransactionKind, TransactionStatus, MembershipPlanCategory, BookingSource, CoachStatus, MiniUserStatus, NotificationChannel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@pilates.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

  console.log(`Creating roles and permissions...`);

  // Create roles
  const roles = [
    { code: AdminRoleCode.OWNER, name: 'Owner', description: '系统所有者，拥有所有权限' },
    { code: AdminRoleCode.FRONTDESK, name: 'Front Desk', description: '前台，管理会员和预约' },
    { code: AdminRoleCode.COACH, name: 'Coach', description: '教练，管理课程和签到' },
    { code: AdminRoleCode.FINANCE, name: 'Finance', description: '财务，管理交易和报表' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {},
      create: role,
    });
  }

  console.log(`Created ${roles.length} roles`);

  // Create owner admin
  console.log(`Creating admin user: ${adminEmail}`);

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const ownerRole = await prisma.role.findUnique({ where: { code: AdminRoleCode.OWNER } });

  if (!ownerRole) {
    throw new Error('Owner role not found');
  }

  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      displayName: 'System Admin',
      roleId: ownerRole.id,
    },
  });

  console.log(`Admin user created: ${admin.email} (${ownerRole.name})`);

  // Create membership plans
  const plans = [
    { code: 'MONTHLY', name: '月度会员', category: MembershipPlanCategory.PERIOD_CARD, durationDays: 30, priceCents: 89900 },
    { code: 'QUARTERLY', name: '季度会员', category: MembershipPlanCategory.PERIOD_CARD, durationDays: 90, priceCents: 239900 },
    { code: 'ANNUAL', name: '年度会员', category: MembershipPlanCategory.PERIOD_CARD, durationDays: 365, priceCents: 799900 },
    { code: 'CLASS_10', name: '次卡10次', category: MembershipPlanCategory.TIME_CARD, durationDays: 90, totalCredits: 10, priceCents: 129900 },
  ];

  for (const plan of plans) {
    await prisma.membershipPlan.upsert({
      where: { code: plan.code },
      update: {},
      create: plan,
    });
  }

  console.log(`Created ${plans.length} membership plans`);

  // Create sample coaches
  const coaches = [
    { coachCode: 'COACH001', name: 'Sarah Chen', bio: '专业普拉提教练，10年教学经验', phone: '13800138001' },
    { coachCode: 'COACH002', name: 'Mike Wang', bio: '专注于康复训练和运动损伤预防', phone: '13800138002' },
  ];

  for (const coach of coaches) {
    await prisma.coach.upsert({
      where: { coachCode: coach.coachCode },
      update: {},
      create: coach,
    });
  }

  console.log(`Created ${coaches.length} coaches`);

  // Create sample courses
  const courses = [
    { courseCode: 'C001', name: '初级普拉提', type: 'MAT', level: 'BEGINNER', durationMinutes: 60, capacity: 8 },
    { courseCode: 'C002', name: '中级普拉提', type: 'REFORMER', level: 'INTERMEDIATE', durationMinutes: 60, capacity: 6 },
    { courseCode: 'C003', name: '高级普拉提', type: 'COMBO', level: 'ADVANCED', durationMinutes: 75, capacity: 4 },
  ];

  for (const course of courses) {
    await prisma.course.upsert({
      where: { courseCode: course.courseCode },
      update: {},
      create: course,
    });
  }

  console.log(`Created ${courses.length} courses`);

  const annualPlan = await prisma.membershipPlan.findUnique({ where: { code: 'ANNUAL' } });
  const firstCoach = await prisma.coach.findUnique({ where: { coachCode: 'COACH001' } });
  const secondCoach = await prisma.coach.findUnique({ where: { coachCode: 'COACH002' } });
  const firstCourse = await prisma.course.findUnique({ where: { courseCode: 'C001' } });
  const secondCourse = await prisma.course.findUnique({ where: { courseCode: 'C002' } });

  if (!annualPlan || !firstCoach || !secondCoach || !firstCourse || !secondCourse) {
    throw new Error('Seed prerequisites not found');
  }

  const seedMiniOpenId = process.env.SEED_MINI_OPEN_ID || 'dev-openid-pilates';

  const miniUser = await prisma.miniUser.upsert({
    where: { openId: seedMiniOpenId },
    update: {
      nickname: 'Mini Demo User',
      status: MiniUserStatus.ACTIVE,
    },
    create: {
      openId: seedMiniOpenId,
      nickname: 'Mini Demo User',
      phone: '13900139000',
      status: MiniUserStatus.ACTIVE,
    },
  });

  const member = await prisma.member.upsert({
    where: { memberCode: 'MDEMO001' },
    update: {
      miniUserId: miniUser.id,
      planId: annualPlan.id,
      remainingCredits: 20,
      status: MemberStatus.ACTIVE,
    },
    create: {
      memberCode: 'MDEMO001',
      name: '小程序测试会员',
      phone: '13900139000',
      email: 'mini-demo@pilates.com',
      status: MemberStatus.ACTIVE,
      joinedAt: new Date(),
      remainingCredits: 20,
      planId: annualPlan.id,
      miniUserId: miniUser.id,
    },
  });

  console.log(`Created demo mini user and member: ${seedMiniOpenId}`);

  const now = new Date();
  const sessions = [
    {
      sessionCode: 'SDEMO001',
      courseId: firstCourse.id,
      coachId: firstCoach.id,
      startsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 25 * 60 * 60 * 1000),
      capacity: 8,
      location: '一号教室',
    },
    {
      sessionCode: 'SDEMO002',
      courseId: secondCourse.id,
      coachId: secondCoach.id,
      startsAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 49 * 60 * 60 * 1000),
      capacity: 6,
      location: '器械教室',
    },
  ];

  for (const session of sessions) {
    await prisma.courseSession.upsert({
      where: { sessionCode: session.sessionCode },
      update: {
        courseId: session.courseId,
        coachId: session.coachId,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        capacity: session.capacity,
        location: session.location,
      },
      create: session,
    });
  }

  const firstSession = await prisma.courseSession.findUnique({ where: { sessionCode: 'SDEMO001' } });

  if (!firstSession) {
    throw new Error('Demo course session not found');
  }

  await prisma.booking.upsert({
    where: { bookingCode: 'BDEMO001' },
    update: {
      memberId: member.id,
      sessionId: firstSession.id,
      status: BookingStatus.CONFIRMED,
      source: BookingSource.MINI_PROGRAM,
    },
    create: {
      bookingCode: 'BDEMO001',
      memberId: member.id,
      sessionId: firstSession.id,
      source: BookingSource.MINI_PROGRAM,
      status: BookingStatus.CONFIRMED,
      bookedAt: new Date(),
    },
  });

  console.log(`Created ${sessions.length} demo course sessions and one demo booking`);

  // Create studio settings
  await prisma.studioSetting.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      studioName: 'Pilates Studio',
      phone: '400-123-4567',
      email: 'info@pilates.com',
      businessHours: '周一至周日 9:00-21:00',
      address: '上海市静安区南京西路1000号',
    },
  });
  
  console.log('Created studio settings');

  const notificationSettings = [
    { key: 'booking_confirmation', title: '预约确认', channel: NotificationChannel.MINI_PROGRAM, description: '会员预约成功后发送确认通知' },
    { key: 'booking_cancelled', title: '预约取消', channel: NotificationChannel.MINI_PROGRAM, description: '预约取消后发送提醒通知' },
    { key: 'booking_reminder', title: '开课提醒', channel: NotificationChannel.MINI_PROGRAM, description: '课程开始前发送提醒通知' },
    { key: 'attendance_checked_in', title: '签到成功', channel: NotificationChannel.INTERNAL, description: '会员完成签到后记录通知' },
    { key: 'membership_expiry', title: '会籍到期', channel: NotificationChannel.SMS, description: '会员卡即将到期时发送通知' },
    { key: 'payment_receipt', title: '支付凭证', channel: NotificationChannel.EMAIL, description: '支付成功后发送电子收据' },
  ];

  for (const setting of notificationSettings) {
    await prisma.notificationSetting.upsert({
      where: { key: setting.key },
      update: {
        title: setting.title,
        channel: setting.channel,
        description: setting.description,
      },
      create: setting,
    });
  }

  console.log(`Created ${notificationSettings.length} notification settings`);

  console.log('Seed completed successfully!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
