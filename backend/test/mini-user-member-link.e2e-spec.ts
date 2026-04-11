import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MiniUsersController } from '../src/modules/mini-users/mini-users.controller';
import { MiniUsersService } from '../src/modules/mini-users/mini-users.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { MiniUserStatus } from '../src/common/enums/domain.enums';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

describe('Mini user to member linking flow', () => {
  let app: INestApplication;
  const miniUserId = 'mini-user-1';
  const memberId = 'member-1';

  const prisma = {
    miniUser: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn(),
    },
    member: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MiniUsersController],
      providers: [MiniUsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.miniUser.findUnique.mockImplementation(({ where }: { where: { id?: string; openId?: string } }) => {
      if (where.openId) {
        return Promise.resolve(null);
      }

      return Promise.resolve({
        id: miniUserId,
        openId: 'openid-1',
        unionId: null,
        nickname: '小溪',
        avatarUrl: null,
        phone: null,
        status: MiniUserStatus.ACTIVE,
        member: null,
      });
    });
    prisma.miniUser.findFirst.mockResolvedValue(null);
    prisma.miniUser.create.mockResolvedValue({
      id: miniUserId,
      openId: 'openid-1',
      unionId: null,
      nickname: '小溪',
      avatarUrl: null,
      phone: null,
      status: MiniUserStatus.ACTIVE,
      member: null,
    });
    prisma.member.findUnique.mockResolvedValue({ id: memberId, miniUserId: null, miniUser: null });
    prisma.member.update.mockResolvedValue({ id: memberId, miniUserId });
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a mini user then links it to a member', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/mini-users')
      .send({ openId: 'openid-1', nickname: '小溪' })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.openId).toBe('openid-1');

    prisma.miniUser.findUnique.mockImplementation(({ where }: { where: { id?: string; openId?: string } }) => {
      if (where.openId) {
        return Promise.resolve(null);
      }

      return Promise.resolve({
        id: miniUserId,
        openId: 'openid-1',
        unionId: null,
        nickname: '小溪',
        avatarUrl: null,
        phone: null,
        status: MiniUserStatus.ACTIVE,
        member: { id: memberId, name: '林若溪' },
      });
    });

    const linkResponse = await request(app.getHttpServer())
      .post(`/api/mini-users/${miniUserId}/link-member`)
      .send({ memberId })
      .expect(201);

    expect(linkResponse.body.success).toBe(true);
    expect(linkResponse.body.data.member.id).toBe(memberId);
    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: memberId },
      data: { miniUserId },
    });
  });
});
