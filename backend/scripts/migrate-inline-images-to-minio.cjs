const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const INLINE_IMAGE_DATA_URL_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i;

function loadEnvFile(fileName) {
  const envPath = resolve(process.cwd(), fileName);
  if (!existsSync(envPath)) {
    return;
  }

  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return;
      }

      const separatorIndex = trimmedLine.indexOf('=');
      if (separatorIndex === -1) {
        return;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = trimmedLine.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
}

function loadUploadsService() {
  try {
    return require('../dist/src/modules/uploads/uploads.service').UploadsService;
  } catch (error) {
    throw new Error(`Cannot load compiled UploadsService. Run npm run build before this migration. ${error.message}`);
  }
}

function createConfigService() {
  const values = {
    'image.maxOutputBytes': Number(process.env.IMAGE_MAX_OUTPUT_BYTES ?? 500 * 1024),
    'image.maxUploadBytes': Number(process.env.IMAGE_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024),
    'image.minio.endpoint': (process.env.MINIO_ENDPOINT ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, ''),
    'image.minio.port': Number(process.env.MINIO_PORT ?? 9000),
    'image.minio.useSSL': process.env.MINIO_USE_SSL === 'true',
    'image.minio.accessKey': process.env.MINIO_ACCESS_KEY ?? '',
    'image.minio.secretKey': process.env.MINIO_SECRET_KEY ?? '',
    'image.minio.bucket': process.env.MINIO_BUCKET ?? '',
    'image.minio.region': process.env.MINIO_REGION ?? 'us-east-1',
    'image.minio.publicBaseUrl': process.env.MINIO_PUBLIC_BASE_URL ?? '',
    'image.minio.setPublicRead': process.env.MINIO_SET_PUBLIC_READ !== 'false',
  };

  return {
    get: (key) => values[key],
  };
}

function parseInlineImage(dataUrl, originalname) {
  const match = INLINE_IMAGE_DATA_URL_PATTERN.exec(dataUrl.trim());
  if (!match) {
    return null;
  }

  const mimetype = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');
  return {
    buffer,
    mimetype,
    originalname,
    size: buffer.length,
  };
}

async function uploadInlineImage(uploadsService, dataUrl, purpose, originalname) {
  if (!dataUrl?.trim().startsWith('data:image/')) {
    return null;
  }

  const file = parseInlineImage(dataUrl, originalname);
  if (!file) {
    return null;
  }

  const uploaded = await uploadsService.uploadImage(file, purpose);
  return uploaded.url;
}

function shouldSkipImageError(error) {
  return error?.status === 400;
}

async function tryUploadInlineImage(uploadsService, dataUrl, purpose, originalname, recordLabel) {
  try {
    return await uploadInlineImage(uploadsService, dataUrl, purpose, originalname);
  } catch (error) {
    if (shouldSkipImageError(error)) {
      console.warn(`Skipped ${recordLabel}: ${error.message}`);
      return null;
    }

    throw error;
  }
}

async function migrateMiniPageImages(uploadsService) {
  const records = await prisma.miniPageImage.findMany();
  let migrated = 0;

  for (const record of records) {
    const url = await tryUploadInlineImage(
      uploadsService,
      record.imageUrl,
      'miniPageHero',
      `mini-page-${record.pageKey}`,
      `miniPageImage.${record.pageKey}`,
    );
    if (!url) {
      continue;
    }

    await prisma.miniPageImage.update({
      where: { id: record.id },
      data: { imageUrl: url },
    });
    migrated += 1;
    console.log(`Migrated miniPageImage.${record.pageKey}`);
  }

  return migrated;
}

async function migrateStudioImages(uploadsService) {
  const records = await prisma.studioSetting.findMany();
  let migrated = 0;

  for (const record of records) {
    const url = await tryUploadInlineImage(
      uploadsService,
      record.imageUrl,
      'studio',
      `studio-${record.id}`,
      `studioSetting.${record.id}`,
    );
    if (!url) {
      continue;
    }

    await prisma.studioSetting.update({
      where: { id: record.id },
      data: { imageUrl: url },
    });
    migrated += 1;
    console.log(`Migrated studioSetting.${record.id}`);
  }

  return migrated;
}

async function migrateCourseImages(uploadsService) {
  const records = await prisma.course.findMany();
  let migrated = 0;

  for (const record of records) {
    const url = await tryUploadInlineImage(
      uploadsService,
      record.coverImageUrl,
      'courseCover',
      `course-${record.id}`,
      `course.${record.id}`,
    );
    if (!url) {
      continue;
    }

    await prisma.course.update({
      where: { id: record.id },
      data: { coverImageUrl: url },
    });
    migrated += 1;
    console.log(`Migrated course.${record.id}`);
  }

  return migrated;
}

async function migrateCoachImages(uploadsService) {
  const records = await prisma.coach.findMany();
  let migrated = 0;

  for (const record of records) {
    const url = await tryUploadInlineImage(
      uploadsService,
      record.avatarUrl,
      'coachAvatar',
      `coach-${record.id}`,
      `coach.${record.id}`,
    );
    if (!url) {
      continue;
    }

    await prisma.coach.update({
      where: { id: record.id },
      data: { avatarUrl: url },
    });
    migrated += 1;
    console.log(`Migrated coach.${record.id}`);
  }

  return migrated;
}

async function main() {
  loadEnvFile('local-config');
  loadEnvFile('.env');

  const UploadsService = loadUploadsService();
  const uploadsService = new UploadsService(createConfigService());
  const result = {
    miniPageImages: await migrateMiniPageImages(uploadsService),
    studioSettings: await migrateStudioImages(uploadsService),
    courses: await migrateCourseImages(uploadsService),
    coaches: await migrateCoachImages(uploadsService),
  };

  console.log('Inline image migration completed:', result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
