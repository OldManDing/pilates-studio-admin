import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  verify: jest.fn(),
}));

import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { MembersController } from '../src/modules/members/members.controller';
import { MembersService } from '../src/modules/members/members.service';
import { BookingsController } from '../src/modules/bookings/bookings.controller';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { BookingSource } from '../src/common/enums/domain.enums';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

describe('Auth -> Members -> Bookings integration flow', () => {
  let app: INestApplication;

  const adminId = '11111111-1111-4111-8111-111111111111';
  const memberId = '22222222-2222-4222-8222-222222222222';
  const sessionId = '33333333-3333-4333-8333-333333333333';

  const prisma = {
    adminUser: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    member: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    booking: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    courseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'auth.refreshExpiresIn') return '7d';
      return undefined;
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, MembersController, BookingsController],
      providers: [
        AuthService,
        MembersService,
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
    prisma.member.count.mockResolvedValue(0);
    prisma.booking.count.mockResolvedValue(0);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.refreshToken.create.mockResolvedValue({ id: 'refresh-1' });
    prisma.courseSession.update.mockResolvedValue({});
    prisma.member.findMany.mockResolvedValue([]);
    prisma.transaction.findMany.mockResolvedValue([]);

    const passwordHash = await bcrypt.hash('Admin123!', 10);
    prisma.adminUser.findUnique.mockResolvedValue({
      id: adminId,
      email: 'owner@pilates.com',
      displayName: 'Owner',
      passwordHash,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      role: {
        id: 'role-1',
        code: 'OWNER',
        name: 'Owner',
        permissions: [
          { permission: { action: 'READ', module: 'DASHBOARD' } },
          { permission: { action: 'WRITE', module: 'MEMBERS' } },
          { permission: { action: 'WRITE', module: 'BOOKINGS' } },
        ],
      },
    });

    jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in, creates a member, then creates a booking', async () => {
    const createdMember = {
      id: memberId,
      memberCode: 'M000001',
      name: '林若溪',
      phone: '13800000000',
      email: 'lin@example.com',
      remainingCredits: 12,
      planId: null,
      status: 'ACTIVE',
      joinedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      plan: null,
      miniUser: null,
      bookings: [],
      transactions: [],
    };

    prisma.member.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createdMember);
    prisma.member.create.mockResolvedValue(createdMember);

    prisma.courseSession.findUnique.mockResolvedValue({
      id: sessionId,
      capacity: 10,
      bookedCount: 1,
      course: { id: 'course-1', name: 'Morning Flow' },
      _count: { bookings: 1 },
    });

    prisma.booking.create.mockResolvedValue({
      id: 'booking-1',
      bookingCode: 'B00000001',
      memberId,
      sessionId,
      source: BookingSource.ADMIN,
      status: 'CONFIRMED',
      bookedAt: new Date('2026-01-02T09:00:00.000Z'),
      member: createdMember,
      session: {
        id: sessionId,
        course: { id: 'course-1', name: 'Morning Flow' },
        coach: { id: 'coach-1', name: '李静' },
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'owner@pilates.com', password: 'Admin123!' })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.accessToken).toBe('access-token');

    const memberResponse = await request(app.getHttpServer())
      .post('/api/members')
      .send({
        name: '林若溪',
        phone: '13800000000',
        email: 'lin@example.com',
        initialCredits: 12,
      })
      .expect(201);

    expect(memberResponse.body.success).toBe(true);
    expect(memberResponse.body.data.memberCode).toBe('M000001');

    const bookingResponse = await request(app.getHttpServer())
      .post('/api/bookings')
      .send({
        memberId,
        sessionId,
        source: BookingSource.ADMIN,
      })
      .expect(201);

    expect(bookingResponse.body.success).toBe(true);
    expect(bookingResponse.body.data.status).toBe('CONFIRMED');
    expect(prisma.courseSession.update).toHaveBeenCalledWith({
      where: { id: sessionId },
      data: { bookedCount: { increment: 1 } },
    });
  });
});
