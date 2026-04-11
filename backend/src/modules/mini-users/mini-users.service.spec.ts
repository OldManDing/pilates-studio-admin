import { ConflictException, NotFoundException } from '@nestjs/common';
import { MiniUserStatus } from '../../common/enums/domain.enums';
import { MiniUsersService } from './mini-users.service';

const createMiniUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'mini-user-1',
  openId: 'openid-1',
  unionId: 'unionid-1',
  nickname: '小溪',
  avatarUrl: 'https://example.com/avatar.png',
  phone: '13800000000',
  status: MiniUserStatus.ACTIVE,
  member: null,
  createdAt: new Date('2026-04-10T00:00:00.000Z'),
  updatedAt: new Date('2026-04-10T00:00:00.000Z'),
  ...overrides,
});

describe('MiniUsersService', () => {
  let service: MiniUsersService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      miniUser: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      member: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new MiniUsersService(prisma);
  });

  it('creates a mini user when identifiers are unique', async () => {
    prisma.miniUser.findUnique.mockResolvedValue(null);
    prisma.miniUser.findFirst.mockResolvedValue(null);
    prisma.miniUser.create.mockResolvedValue(createMiniUser());

    const result = await service.create({
      openId: 'openid-1',
      unionId: 'unionid-1',
      nickname: '小溪',
    });

    expect(prisma.miniUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          openId: 'openid-1',
          unionId: 'unionid-1',
          status: MiniUserStatus.ACTIVE,
        }),
      }),
    );
    expect(result.openId).toBe('openid-1');
  });

  it('rejects duplicate openId values', async () => {
    prisma.miniUser.findUnique.mockResolvedValue(createMiniUser());

    await expect(service.create({ openId: 'openid-1' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws not found when mini user does not exist', async () => {
    prisma.miniUser.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('links a member to a mini user', async () => {
    prisma.miniUser.findUnique.mockResolvedValue(createMiniUser());
    prisma.member.findUnique.mockResolvedValue({ id: 'member-1', miniUserId: null, miniUser: null });
    prisma.member.update.mockResolvedValue({ id: 'member-1', miniUserId: 'mini-user-1' });

    await service.linkMember('mini-user-1', 'member-1');

    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { miniUserId: 'mini-user-1' },
    });
  });

  it('rejects linking a member already bound to another mini user', async () => {
    prisma.miniUser.findUnique.mockResolvedValue(createMiniUser());
    prisma.member.findUnique.mockResolvedValue({ id: 'member-1', miniUserId: 'another-mini-user', miniUser: { id: 'another-mini-user' } });

    await expect(service.linkMember('mini-user-1', 'member-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns a compact status summary', async () => {
    prisma.miniUser.findUnique.mockResolvedValue(createMiniUser({ member: { id: 'member-1' } }));

    const result = await service.getStatus('mini-user-1');

    expect(result).toEqual({
      id: 'mini-user-1',
      status: MiniUserStatus.ACTIVE,
      hasLinkedMember: true,
      memberId: 'member-1',
    });
  });
});
