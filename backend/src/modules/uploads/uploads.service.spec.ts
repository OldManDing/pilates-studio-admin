import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp = require('sharp');
import { UploadsService, UploadedImageFile } from './uploads.service';

const mockMinioClient = {
  bucketExists: jest.fn(),
  makeBucket: jest.fn(),
  setBucketPolicy: jest.fn(),
  putObject: jest.fn(),
};

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => mockMinioClient),
}));

function createConfigService(overrides: Record<string, string | number | boolean> = {}) {
  const values: Record<string, string | number | boolean> = {
    'image.maxOutputBytes': 500 * 1024,
    'image.maxUploadBytes': 10 * 1024 * 1024,
    'image.minio.endpoint': '127.0.0.1',
    'image.minio.port': 9000,
    'image.minio.useSSL': false,
    'image.minio.accessKey': 'minioadmin',
    'image.minio.secretKey': 'minioadmin',
    'image.minio.bucket': 'pilates-images',
    'image.minio.region': 'us-east-1',
    'image.minio.publicBaseUrl': 'https://cdn.example.com/pilates-images',
    'image.minio.setPublicRead': true,
    ...overrides,
  };

  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

async function createTestImageFile(): Promise<UploadedImageFile> {
  const buffer = await sharp({
    create: {
      width: 2000,
      height: 1200,
      channels: 3,
      background: { r: 196, g: 165, b: 116 },
    },
  }).png().toBuffer();

  return {
    buffer,
    mimetype: 'image/png',
    originalname: 'studio.png',
    size: buffer.length,
  };
}

describe('UploadsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMinioClient.bucketExists.mockResolvedValue(true);
    mockMinioClient.putObject.mockResolvedValue({});
  });

  it('optimizes static images and uploads JPEG files to MinIO', async () => {
    const service = new UploadsService(createConfigService());
    const file = await createTestImageFile();

    const result = await service.uploadImage(file, 'miniPageHero');
    const uploadedBuffer = mockMinioClient.putObject.mock.calls[0][2] as Buffer;
    const uploadedMetadata = await sharp(uploadedBuffer).metadata();

    expect(result.url).toMatch(/^https:\/\/cdn\.example\.com\/pilates-images\/images\/mini-page-images\//);
    expect(result.size).toBeLessThanOrEqual(500 * 1024);
    expect(result.format).toBe('jpg');
    expect(uploadedMetadata.format).toBe('jpeg');
    expect(uploadedMetadata.width).toBe(1125);
    expect(uploadedMetadata.height).toBe(640);
    expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('pilates-images');
    expect(mockMinioClient.setBucketPolicy).toHaveBeenCalledWith(
      'pilates-images',
      expect.stringContaining('s3:GetObject'),
    );
    expect(mockMinioClient.putObject).toHaveBeenCalledWith(
      'pilates-images',
      expect.stringMatching(/^images\/mini-page-images\/\d{4}\/\d{2}\/.+\.jpg$/),
      expect.any(Buffer),
      expect.any(Number),
      { 'Content-Type': 'image/jpeg' },
    );
  });

  it('creates the MinIO bucket when it does not exist', async () => {
    mockMinioClient.bucketExists.mockResolvedValue(false);
    const service = new UploadsService(createConfigService());
    const file = await createTestImageFile();

    await service.uploadImage(file, 'studio');

    expect(mockMinioClient.makeBucket).toHaveBeenCalledWith('pilates-images', 'us-east-1');
  });

  it('rejects non-raster image uploads', async () => {
    const service = new UploadsService(createConfigService());

    await expect(
      service.uploadImage({
        buffer: Buffer.from('<svg></svg>'),
        mimetype: 'image/svg+xml',
        originalname: 'bad.svg',
        size: 11,
      }, 'generic'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockMinioClient.putObject).not.toHaveBeenCalled();
  });
});
