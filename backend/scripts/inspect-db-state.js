const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const migrations = await prisma.$queryRawUnsafe(
    'SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name',
  );

  const twoFactorEnabled = await prisma.$queryRawUnsafe(
    'SHOW COLUMNS FROM AdminUser LIKE "twoFactorEnabled"',
  );
  const twoFactorSecret = await prisma.$queryRawUnsafe(
    'SHOW COLUMNS FROM AdminUser LIKE "twoFactorSecret"',
  );
  const notificationTable = await prisma.$queryRawUnsafe(
    'SHOW TABLES LIKE "Notification"',
  );
  const courseReviewTable = await prisma.$queryRawUnsafe(
    'SHOW TABLES LIKE "CourseReview"',
  );

  console.log(
    JSON.stringify(
      {
        migrations,
        twoFactorEnabled,
        twoFactorSecret,
        notificationTable,
        courseReviewTable,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
