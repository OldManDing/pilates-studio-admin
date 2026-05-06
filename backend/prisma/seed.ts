import { PrismaClient, AdminRoleCode, MemberStatus, BookingStatus, MembershipPlanCategory, BookingSource, MiniUserStatus, NotificationChannel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@pilates.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error('SEED_ADMIN_PASSWORD must be set before running the seed script.');
  }

  const defaultPermissions = [
    { module: 'ADMINS', action: 'READ', description: '查看系统管理员账号' },
    { module: 'ADMINS', action: 'MANAGE', description: '管理系统管理员账号' },
    { module: 'ROLES', action: 'READ', description: '查看角色与权限配置' },
    { module: 'ROLES', action: 'MANAGE', description: '管理角色与权限配置' },
    { module: 'MEMBERS', action: 'READ', description: '查看会员信息' },
    { module: 'MEMBERS', action: 'WRITE', description: '新增、编辑会员' },
    { module: 'MEMBERS', action: 'MANAGE', description: '删除会员、管理会籍' },
    { module: 'PLANS', action: 'READ', description: '查看会籍方案' },
    { module: 'PLANS', action: 'MANAGE', description: '管理会籍方案' },
    { module: 'COACHES', action: 'READ', description: '查看教练信息' },
    { module: 'COACHES', action: 'WRITE', description: '新增、编辑教练' },
    { module: 'COACHES', action: 'MANAGE', description: '管理教练排班' },
    { module: 'COURSES', action: 'READ', description: '查看课程信息' },
    { module: 'COURSES', action: 'WRITE', description: '新增、编辑课程' },
    { module: 'COURSES', action: 'MANAGE', description: '管理课程排期' },
    { module: 'SESSIONS', action: 'READ', description: '查看课程时段' },
    { module: 'SESSIONS', action: 'WRITE', description: '排课程时段' },
    { module: 'BOOKINGS', action: 'READ', description: '查看预约记录' },
    { module: 'BOOKINGS', action: 'WRITE', description: '创建、处理预约' },
    { module: 'ATTENDANCE', action: 'READ', description: '查看签到记录' },
    { module: 'ATTENDANCE', action: 'WRITE', description: '签到管理' },
    { module: 'TRANSACTIONS', action: 'READ', description: '查看交易记录' },
    { module: 'TRANSACTIONS', action: 'WRITE', description: '新增交易记录' },
    { module: 'MINI_USERS', action: 'READ', description: '查看小程序用户信息' },
    { module: 'MINI_USERS', action: 'WRITE', description: '管理小程序用户绑定与状态' },
    { module: 'ANALYTICS', action: 'READ', description: '查看数据分析' },
    { module: 'NOTIFICATIONS', action: 'READ', description: '查看通知记录与状态' },
    { module: 'NOTIFICATIONS', action: 'WRITE', description: '创建通知并标记已读' },
    { module: 'KNOWLEDGE', action: 'READ', description: '查看帮助知识库' },
    { module: 'KNOWLEDGE', action: 'WRITE', description: '新增、编辑帮助知识库' },
    { module: 'KNOWLEDGE', action: 'MANAGE', description: '删除帮助知识库内容' },
    { module: 'REPORTS', action: 'READ', description: '查看经营报表' },
    { module: 'SETTINGS', action: 'READ', description: '查看系统设置' },
    { module: 'SETTINGS', action: 'MANAGE', description: '管理系统设置' },
  ] as const;

  const rolePermissionsMap: Record<AdminRoleCode, Array<{ module: string; action: string }>> = {
    [AdminRoleCode.OWNER]: defaultPermissions.map(({ module, action }) => ({ module, action })),
    [AdminRoleCode.FRONTDESK]: [
      { module: 'MEMBERS', action: 'READ' },
      { module: 'MEMBERS', action: 'WRITE' },
      { module: 'PLANS', action: 'READ' },
      { module: 'BOOKINGS', action: 'READ' },
      { module: 'BOOKINGS', action: 'WRITE' },
      { module: 'COURSES', action: 'READ' },
      { module: 'COACHES', action: 'READ' },
      { module: 'MINI_USERS', action: 'READ' },
      { module: 'MINI_USERS', action: 'WRITE' },
      { module: 'NOTIFICATIONS', action: 'READ' },
      { module: 'NOTIFICATIONS', action: 'WRITE' },
      { module: 'KNOWLEDGE', action: 'READ' },
      { module: 'KNOWLEDGE', action: 'WRITE' },
      { module: 'SETTINGS', action: 'READ' },
    ],
    [AdminRoleCode.COACH]: [
      { module: 'COURSES', action: 'READ' },
      { module: 'COURSES', action: 'WRITE' },
      { module: 'SESSIONS', action: 'READ' },
      { module: 'SESSIONS', action: 'WRITE' },
      { module: 'BOOKINGS', action: 'READ' },
      { module: 'BOOKINGS', action: 'WRITE' },
      { module: 'ATTENDANCE', action: 'READ' },
      { module: 'ATTENDANCE', action: 'WRITE' },
      { module: 'COACHES', action: 'READ' },
      { module: 'MEMBERS', action: 'READ' },
      { module: 'KNOWLEDGE', action: 'READ' },
    ],
    [AdminRoleCode.FINANCE]: [
      { module: 'TRANSACTIONS', action: 'READ' },
      { module: 'TRANSACTIONS', action: 'WRITE' },
      { module: 'REPORTS', action: 'READ' },
      { module: 'ANALYTICS', action: 'READ' },
      { module: 'MEMBERS', action: 'READ' },
      { module: 'PLANS', action: 'READ' },
      { module: 'NOTIFICATIONS', action: 'READ' },
      { module: 'KNOWLEDGE', action: 'READ' },
    ],
  };

  console.log(`Creating roles and permissions...`);

  for (const permission of defaultPermissions) {
    const existingPermission = await prisma.permission.findFirst({
      where: {
        module: permission.module,
        action: permission.action,
      },
    });

    if (existingPermission) {
      await prisma.permission.update({
        where: { id: existingPermission.id },
        data: { description: permission.description },
      });
    } else {
      await prisma.permission.create({
        data: permission,
      });
    }
  }

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
      update: { name: role.name, description: role.description },
      create: role,
    });
  }

  for (const role of roles) {
    const dbRole = await prisma.role.findUnique({ where: { code: role.code } });
    if (!dbRole) {
      continue;
    }

    const permissionLinks = rolePermissionsMap[role.code];
    await prisma.rolePermission.deleteMany({ where: { roleId: dbRole.id } });
    for (const permissionLink of permissionLinks) {
      const permission = await prisma.permission.findFirst({
        where: {
          module: permissionLink.module,
          action: permissionLink.action,
        },
      });
      if (!permission) {
        continue;
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: dbRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: dbRole.id,
          permissionId: permission.id,
        },
      });
    }
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

  const faqItems = [
    {
      category: 'booking',
      question: '如何预约课程？',
      answer: '进入「预约」页面，选择日期与课程类型，点击课程即可查看详情并完成预约。',
      sortOrder: 10,
    },
    {
      category: 'booking',
      question: '如何取消或改约？',
      answer: '课程开始前 4 小时可在「我的预约」中取消。超过时限取消会按未到场规则扣除一次权益；改约请先取消原预约后重新预约。',
      sortOrder: 20,
    },
    {
      category: 'member',
      question: '会员卡如何续费？',
      answer: '进入「会员中心」，点击「续费会员」后选择方案并完成支付。当前会籍未到期时，仅支持同方案续费顺延。',
      sortOrder: 30,
    },
    {
      category: 'account',
      question: '如何注销账户？',
      answer: '进入「设置」提交账号注销申请，门店会在核实历史权益和身份后处理。',
      sortOrder: 40,
    },
  ];

  for (const faq of faqItems) {
    const existing = await prisma.knowledgeArticle.findFirst({
      where: {
        category: faq.category,
        question: faq.question,
      },
    });

    if (existing) {
      await prisma.knowledgeArticle.update({
        where: { id: existing.id },
        data: {
          answer: faq.answer,
          sortOrder: faq.sortOrder,
          isActive: true,
        },
      });
    } else {
      await prisma.knowledgeArticle.create({ data: faq });
    }
  }

  console.log(`Created ${faqItems.length} knowledge FAQ items`);

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
