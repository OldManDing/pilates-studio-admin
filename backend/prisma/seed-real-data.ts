import { PrismaClient, BookingSource, BookingStatus, CoachStatus, MemberStatus, TransactionKind, TransactionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const members = [
    { name: '李若溪', phone: '13911110001', email: 'ruoxi.li@example.com' },
    { name: '周子涵', phone: '13911110002', email: 'zihan.zhou@example.com' },
    { name: '陈语桐', phone: '13911110003', email: 'yutong.chen@example.com' },
  ];

  const plan = await prisma.membershipPlan.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
  const coach = await prisma.coach.findFirst({ where: { status: CoachStatus.ACTIVE }, orderBy: { createdAt: 'asc' } });
  const course = await prisma.course.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });

  if (!plan || !coach || !course) {
    throw new Error('Missing base data: plan/coach/course not ready');
  }

  for (const [idx, member] of members.entries()) {
    await prisma.member.upsert({
      where: { phone: member.phone },
      update: {
        name: member.name,
        email: member.email,
        status: MemberStatus.ACTIVE,
        planId: plan.id,
        remainingCredits: 20 - idx * 4,
      },
      create: {
        memberCode: `M${String(1000 + idx + 1)}`,
        name: member.name,
        phone: member.phone,
        email: member.email,
        status: MemberStatus.ACTIVE,
        joinedAt: new Date(),
        planId: plan.id,
        remainingCredits: 20 - idx * 4,
      },
    });
  }

  const seededMembers = await prisma.member.findMany({ where: { phone: { in: members.map((m) => m.phone) } } });

  const startBase = new Date();
  startBase.setHours(10, 0, 0, 0);

  const sessions = [] as { id: string; code: string }[];
  for (let i = 1; i <= 3; i++) {
    const startsAt = new Date(startBase.getTime() + i * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const sessionCode = `AUTO-${startsAt.getMonth() + 1}${startsAt.getDate()}-${i}`;

    const existing = await prisma.courseSession.findUnique({ where: { sessionCode } });
    const session = existing
      ? await prisma.courseSession.update({
          where: { id: existing.id },
          data: { courseId: course.id, coachId: coach.id, startsAt, endsAt, capacity: 8, location: '主训练厅', bookedCount: 0 },
        })
      : await prisma.courseSession.create({
          data: {
            sessionCode,
            courseId: course.id,
            coachId: coach.id,
            startsAt,
            endsAt,
            capacity: 8,
            location: '主训练厅',
            bookedCount: 0,
          },
        });

    sessions.push({ id: session.id, code: sessionCode });
  }

  for (const member of seededMembers) {
    for (const session of sessions.slice(0, 2)) {
      const existingBooking = await prisma.booking.findFirst({ where: { memberId: member.id, sessionId: session.id } });
      if (!existingBooking) {
        await prisma.booking.create({
          data: {
            bookingCode: `B-${member.memberCode}-${session.code}`,
            memberId: member.id,
            sessionId: session.id,
            source: BookingSource.ADMIN,
            status: BookingStatus.CONFIRMED,
            bookedAt: new Date(),
          },
        });
      }
    }

    await prisma.transaction.create({
      data: {
        transactionCode: `T-${member.memberCode}-${Date.now()}`,
        memberId: member.id,
        planId: plan.id,
        kind: TransactionKind.MEMBERSHIP_PURCHASE,
        status: TransactionStatus.COMPLETED,
        amountCents: plan.priceCents,
        happenedAt: new Date(),
        notes: '线下录入测试数据',
      },
    });
  }

  for (const session of sessions) {
    const count = await prisma.booking.count({ where: { sessionId: session.id, status: { not: BookingStatus.CANCELLED } } });
    await prisma.courseSession.update({ where: { id: session.id }, data: { bookedCount: count } });
  }

  console.log('Real demo data seeded successfully');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
