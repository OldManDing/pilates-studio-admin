import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MemberStatus } from '../../common/enums/domain.enums';
import { MembersService } from './members.service';

const createMember = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'member-1',
  memberCode: 'M000001',
  name: 'Alice',
  phone: '13800000000',
  email: 'alice@example.com',
  remainingCredits: 10,
  planId: 'plan-1',
  status: MemberStatus.ACTIVE,
  joinedAt: new Date('2025-01-01T00:00:00.000Z'),
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  plan: {
    id: 'plan-1',
    name: '年卡会员',
    durationDays: 365,
    totalCredits: 20,
  },
  miniUser: null,
  bookings: [],
  transactions: [],
  ...overrides,
});

describe('MembersService', () => {
  let service: MembersService;
  let prisma: {
    member: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    booking: {
      findMany: jest.Mock;
    };
    transaction: {
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      member: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      booking: {
        findMany: jest.fn(),
      },
      transaction: {
        findMany: jest.fn(),
      },
    };

    prisma.member.count.mockResolvedValue(1);

    service = new MembersService(prisma as unknown as never);
  });

  it('creates a member with generated code and active status', async () => {
    prisma.member.findUnique.mockResolvedValueOnce(null);
    prisma.member.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(createMember(data)),
    );

    const result = await service.create({
      name: 'Alice',
      phone: '13800000000',
      email: 'alice@example.com',
      initialCredits: 12,
      planId: 'plan-1',
    });

    expect(prisma.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          memberCode: 'M000002',
          status: MemberStatus.ACTIVE,
          remainingCredits: 12,
        }),
      }),
    );
    expect(result.memberCode).toBe('M000002');
    expect(result.status).toBe(MemberStatus.ACTIVE);
  });

  it('rejects create when the phone number already exists', async () => {
    prisma.member.findUnique.mockResolvedValue(createMember());

    await expect(
      service.create({
        name: 'Alice',
        phone: '13800000000',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when adjustCredits would make credits negative', async () => {
    prisma.member.findUnique.mockResolvedValue(createMember({ bookings: [], transactions: [] }));

    await expect(service.adjustCredits('member-1', -11)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates member credits when the adjustment stays non-negative', async () => {
    prisma.member.findUnique.mockResolvedValue(createMember({ bookings: [], transactions: [] }));
    prisma.member.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(createMember({ remainingCredits: data.remainingCredits })),
    );

    const result = await service.adjustCredits('member-1', -4);

    expect(prisma.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'member-1' },
        data: { remainingCredits: 6 },
      }),
    );
    expect(result.remainingCredits).toBe(6);
  });

  it('returns memberships for an active mini-program member', async () => {
    prisma.member.findUnique.mockResolvedValue(
      createMember({
        miniUser: { id: 'mini-1', avatarUrl: 'avatar.png' },
        remainingCredits: 8,
      }),
    );

    const result = await service.getMembershipsByMiniUserId('mini-1');

    expect(result.memberships).toHaveLength(1);
    expect(result.memberships[0]).toMatchObject({
      memberId: 'member-1',
      remainingCredits: 8,
      planName: '年卡会员',
    });
    expect(typeof result.memberships[0].isActive).toBe('boolean');
  });

  it('returns an empty membership list when no member is linked to the mini user', async () => {
    prisma.member.findUnique.mockResolvedValue(null);

    const result = await service.getMembershipsByMiniUserId('missing-mini-user');

    expect(result).toEqual({ memberships: [] });
  });

  it('throws not found when requesting a missing member', async () => {
    prisma.member.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing-member')).rejects.toBeInstanceOf(NotFoundException);
  });
});
