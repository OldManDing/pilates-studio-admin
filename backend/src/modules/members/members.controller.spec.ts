import { MembersController } from './members.controller';

describe('MembersController', () => {
  const membersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByMiniUserId: jest.fn(),
    getMembershipsByMiniUserId: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getMemberBookings: jest.fn(),
    getMemberTransactions: jest.fn(),
    adjustCredits: jest.fn(),
  };

  const controller = new MembersController(membersService as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegates create and list operations', async () => {
    membersService.create.mockResolvedValue({ id: 'member-1' });
    membersService.findAll.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } });

    await expect(controller.create({ name: 'Alice', phone: '13800000000' } as never)).resolves.toEqual({ id: 'member-1' });
    await expect(controller.findAll({ page: 1, pageSize: 10 } as never)).resolves.toEqual({
      data: [],
      meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
  });

  it('delegates mini-program membership endpoints', async () => {
    membersService.findByMiniUserId.mockResolvedValue({ id: 'member-1' });
    membersService.getMembershipsByMiniUserId.mockResolvedValue({ memberships: [] });

    await expect(controller.getMyProfile('mini-user-1')).resolves.toEqual({ id: 'member-1' });
    await expect(controller.getMyMemberships('mini-user-1')).resolves.toEqual({ memberships: [] });
  });

  it('delegates member detail and mutation operations', async () => {
    membersService.findOne.mockResolvedValue({ id: 'member-1' });
    membersService.update.mockResolvedValue({ id: 'member-1', name: 'Updated' });
    membersService.remove.mockResolvedValue({ success: true });
    membersService.adjustCredits.mockResolvedValue({ id: 'member-1', remainingCredits: 6 });

    await expect(controller.findOne('member-1')).resolves.toEqual({ id: 'member-1' });
    await expect(controller.update('member-1', { name: 'Updated' } as never)).resolves.toEqual({ id: 'member-1', name: 'Updated' });
    await expect(controller.remove('member-1')).resolves.toEqual({ success: true });
    await expect(controller.adjustCredits('member-1', 3)).resolves.toEqual({ id: 'member-1', remainingCredits: 6 });
  });
});
