import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Client } from 'minio';
import sharp = require('sharp');

export type ImageUploadPurpose = 'miniPageHero' | 'studio' | 'courseCover' | 'coachAvatar' | 'generic';

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size: number;
}

interface ImagePurposeSpec {
  width?: number;
  height?: number;
  fit: keyof sharp.FitEnum;
  folder: string;
}

interface OptimizedImage {
  buffer: Buffer;
  width?: number;
  height?: number;
  size: number;
  format: string;
  contentType: string;
}

export interface ImageUploadResult {
  url: string;
  width?: number;
  height?: number;
  size: number;
  format: string;
  objectName: string;
}

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const IMAGE_PURPOSE_SPECS: Record<ImageUploadPurpose, ImagePurposeSpec> = {
  miniPageHero: { width: 1125, height: 640, fit: 'cover', folder: 'mini-page-images' },
  studio: { width: 960, height: 640, fit: 'cover', folder: 'studio' },
  courseCover: { width: 750, height: 520, fit: 'cover', folder: 'course-covers' },
  coachAvatar: { width: 320, height: 320, fit: 'cover', folder: 'coach-avatars' },
  generic: { width: 1280, fit: 'inside', folder: 'generic' },
};

const MAX_QUALITY = 92;
const MIN_QUALITY = 54;
const MIN_SCALE = 0.5;
const SCALE_STEP = 0.85;

@Injectable()
export class UploadsService {
  private minioClient: Client | null = null;
  private bucketReadyPromise: Promise<void> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async uploadImage(file: UploadedImageFile, purpose: ImageUploadPurpose = 'generic'): Promise<ImageUploadResult> {
    const spec = IMAGE_PURPOSE_SPECS[purpose] ?? IMAGE_PURPOSE_SPECS.generic;
    this.validateUpload(file);

    const optimizedImage = await this.optimizeImage(file, spec);
    const objectName = this.buildObjectName(spec.folder, optimizedImage.format);

    await this.ensureBucket();
    await this.getMinioClient().putObject(
      this.bucketName,
      objectName,
      optimizedImage.buffer,
      optimizedImage.size,
      {
        'Content-Type': optimizedImage.contentType,
      },
    );

    return {
      url: this.buildPublicUrl(objectName),
      width: optimizedImage.width,
      height: optimizedImage.height,
      size: optimizedImage.size,
      format: optimizedImage.format,
      objectName,
    };
  }

  private async optimizeImage(file: UploadedImageFile, spec: ImagePurposeSpec): Promise<OptimizedImage> {
    let metadata: sharp.Metadata;

    try {
      metadata = await sharp(file.buffer, { animated: true }).metadata();
    } catch {
      throw new BadRequestException('图片文件格式无效');
    }

    const isAnimated = Boolean(metadata.pages && metadata.pages > 1);
    if (isAnimated) {
      return this.handleAnimatedImage(file, metadata);
    }

    const baseDimensions = this.resolveTargetDimensions(metadata, spec);
    let scale = 1;

    while (scale >= MIN_SCALE) {
      const width = baseDimensions.width ? Math.max(1, Math.round(baseDimensions.width * scale)) : undefined;
      const height = baseDimensions.height ? Math.max(1, Math.round(baseDimensions.height * scale)) : undefined;
      const candidate = await this.findBestJpegCandidate(file.buffer, spec, width, height);

      if (candidate) {
        const candidateMetadata = await sharp(candidate.buffer).metadata();
        return {
          buffer: candidate.buffer,
          width: candidateMetadata.width,
          height: candidateMetadata.height,
          size: candidate.buffer.length,
          format: 'jpg',
          contentType: 'image/jpeg',
        };
      }

      scale *= SCALE_STEP;
    }

    throw new BadRequestException('图片压缩后仍超过 500KB，请更换更小或更清晰的原图');
  }

  private handleAnimatedImage(file: UploadedImageFile, metadata: sharp.Metadata): OptimizedImage {
    if (file.size > this.maxOutputBytes) {
      throw new BadRequestException('动图超过 500KB，保留全部帧的前提下无法自动压缩，请上传静态图或更小的动图');
    }

    return {
      buffer: file.buffer,
      width: metadata.width,
      height: metadata.height,
      size: file.size,
      format: this.resolveOriginalFormat(metadata.format, file.mimetype),
      contentType: this.resolveContentType(metadata.format, file.mimetype),
    };
  }

  private async findBestJpegCandidate(
    input: Buffer,
    spec: ImagePurposeSpec,
    width?: number,
    height?: number,
  ): Promise<{ buffer: Buffer; quality: number } | null> {
    let low = MIN_QUALITY;
    let high = MAX_QUALITY;
    let best: { buffer: Buffer; quality: number } | null = null;

    while (low <= high) {
      const quality = Math.floor((low + high) / 2);
      const buffer = await this.renderJpeg(input, spec, quality, width, height);

      if (buffer.length <= this.maxOutputBytes) {
        best = { buffer, quality };
        low = quality + 1;
      } else {
        high = quality - 1;
      }
    }

    return best;
  }

  private renderJpeg(
    input: Buffer,
    spec: ImagePurposeSpec,
    quality: number,
    width?: number,
    height?: number,
  ) {
    let pipeline = sharp(input, { limitInputPixels: 40_000_000 })
      .rotate()
      .flatten({ background: '#ffffff' });

    if (width || height) {
      pipeline = pipeline.resize({
        width,
        height,
        fit: spec.fit,
        position: 'centre',
        withoutEnlargement: true,
      });
    }

    return pipeline.jpeg({
      quality,
      mozjpeg: true,
    }).toBuffer();
  }

  private resolveTargetDimensions(metadata: sharp.Metadata, spec: ImagePurposeSpec) {
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    if (!originalWidth || !originalHeight) {
      return { width: spec.width, height: spec.height };
    }

    if (spec.fit === 'inside') {
      const maxWidth = spec.width ?? originalWidth;
      const maxHeight = spec.height ?? originalHeight;
      const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight, 1);
      return {
        width: Math.round(originalWidth * ratio),
        height: Math.round(originalHeight * ratio),
      };
    }

    return {
      width: spec.width ?? originalWidth,
      height: spec.height ?? originalHeight,
    };
  }

  private validateUpload(file: UploadedImageFile) {
    if (!file.buffer?.length) {
      throw new BadRequestException('图片文件为空');
    }

    if (file.size > this.maxUploadBytes) {
      throw new BadRequestException(`图片文件过大，请上传 ${Math.floor(this.maxUploadBytes / 1024 / 1024)}MB 以内图片`);
    }

    const mimeType = file.mimetype.toLowerCase();
    if (!SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('仅支持 JPG、PNG、WebP、GIF 图片');
    }
  }

  private ensureBucket() {
    if (!this.bucketReadyPromise) {
      this.bucketReadyPromise = (async () => {
        const minioClient = this.getMinioClient();
        const exists = await minioClient.bucketExists(this.bucketName);
        if (!exists) {
          await minioClient.makeBucket(this.bucketName, this.region);
        }

        if (this.getBoolean('image.minio.setPublicRead', true)) {
          await minioClient.setBucketPolicy(this.bucketName, this.buildPublicReadPolicy());
        }
      })().catch((error) => {
        this.bucketReadyPromise = null;
        throw error;
      });
    }

    return this.bucketReadyPromise;
  }

  private buildObjectName(folder: string, format: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `images/${folder}/${year}/${month}/${randomUUID()}.${format}`;
  }

  private buildPublicUrl(objectName: string) {
    const publicBaseUrl = this.getRequiredString('image.minio.publicBaseUrl').replace(/\/+$/, '');
    return `${publicBaseUrl}/${objectName}`;
  }

  private buildPublicReadPolicy() {
    return JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucketName}/*`],
        },
      ],
    });
  }

  private getMinioClient() {
    if (!this.minioClient) {
      this.minioClient = new Client({
        endPoint: this.getRequiredString('image.minio.endpoint'),
        port: this.getNumber('image.minio.port', 9000),
        useSSL: this.getBoolean('image.minio.useSSL', false),
        accessKey: this.getRequiredString('image.minio.accessKey'),
        secretKey: this.getRequiredString('image.minio.secretKey'),
      });
    }

    return this.minioClient;
  }

  private resolveOriginalFormat(format: string | undefined, mimeType: string) {
    if (format === 'jpeg') {
      return 'jpg';
    }

    if (format) {
      return format;
    }

    return mimeType.split('/')[1] || 'bin';
  }

  private resolveContentType(format: string | undefined, fallback: string) {
    if (format === 'jpeg') {
      return 'image/jpeg';
    }

    return format ? `image/${format}` : fallback;
  }

  private get maxOutputBytes() {
    return this.getNumber('image.maxOutputBytes', 500 * 1024);
  }

  private get maxUploadBytes() {
    return this.getNumber('image.maxUploadBytes', 10 * 1024 * 1024);
  }

  private get bucketName() {
    return this.getRequiredString('image.minio.bucket');
  }

  private get region() {
    return this.configService.get<string>('image.minio.region') ?? 'us-east-1';
  }

  private getRequiredString(key: string) {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new InternalServerErrorException(`缺少图片存储配置：${key}`);
    }

    return value;
  }

  private getNumber(key: string, fallback: number) {
    const value = this.configService.get<number | string>(key);
    const parsed = Number(value ?? fallback);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private getBoolean(key: string, fallback: boolean) {
    const value = this.configService.get<boolean | string>(key);
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value === 'true';
    }

    return fallback;
  }
}
