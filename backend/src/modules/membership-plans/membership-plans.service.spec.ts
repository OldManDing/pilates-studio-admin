import { ConflictException, NotFoundException } from '@nestjs/common';
import { MembershipPlansService } from './membership-plans.service';

const createPlan = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'plan-1',
  code: 'YEARLY',
  name: '年卡会员',
  category: 'PERIOD_CARD',
  durationDays: 365,
  totalCredits: 20,
  priceCents: 100000,
  isActive: true,
  members: [],
  ...overrides,
});

describe('MembershipPlansService', () => {
  let service: MembershipPlansService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      membershipPlan: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      member: {
        count: jest.fn(),
      },
    };
    service = new MembershipPlansService(prisma);
  });

  it('creates a membership plan when code is unique', async () => {
    prisma.membershipPlan.findUnique.mockResolvedValue(null);
    prisma.membershipPlan.create.mockResolvedValue(createPlan());

    const result = await service.create({ code: 'YEARLY', name: '年卡会员' } as never);

    expect(prisma.membershipPlan.create).toHaveBeenCalledWith({ data: { code: 'YEARLY', name: '年卡会员' } });
    expect(result.code).toBe('YEARLY');
  });

  it('rejects duplicate plan codes', async () => {
    prisma.membershipPlan.findUnique.mockResolvedValue(createPlan());

    await expect(service.create({ code: 'YEARLY', name: '年卡会员' } as never)).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws not found when plan is missing', async () => {
    prisma.membershipPlan.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents deleting plans used by members', async () => {
    prisma.membershipPlan.findUnique.mockResolvedValue(createPlan());
    prisma.member.count.mockResolvedValue(2);

    await expect(service.remove('plan-1')).rejects.toBeInstanceOf(ConflictException);
  });
});
