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
