import { MiniUserStatus } from '../../common/enums/domain.enums';
import { MiniUsersController } from './mini-users.controller';

describe('MiniUsersController', () => {
  const miniUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByOpenId: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
    getLinkedMember: jest.fn(),
    linkMember: jest.fn(),
    getStatus: jest.fn(),
  };

  const controller = new MiniUsersController(miniUsersService as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegates CRUD and query operations to the service', async () => {
    miniUsersService.create.mockResolvedValue({ id: 'mini-user-1' });
    miniUsersService.findAll.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } });
    miniUsersService.findByOpenId.mockResolvedValue({ id: 'mini-user-1', openId: 'openid-1' });
    miniUsersService.findOne.mockResolvedValue({ id: 'mini-user-1' });
    miniUsersService.update.mockResolvedValue({ id: 'mini-user-1', nickname: '更新昵称' });

    await expect(controller.create({ openId: 'openid-1' } as never)).resolves.toEqual({ id: 'mini-user-1' });
    await expect(controller.findAll({ page: 1, pageSize: 10 } as never)).resolves.toEqual({
      data: [],
      meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
    await expect(controller.findByOpenId('openid-1')).resolves.toEqual({ id: 'mini-user-1', openId: 'openid-1' });
    await expect(controller.findOne('mini-user-1')).resolves.toEqual({ id: 'mini-user-1' });
    await expect(controller.update('mini-user-1', { nickname: '更新昵称' } as never)).resolves.toEqual({
      id: 'mini-user-1',
      nickname: '更新昵称',
    });
  });

  it('delegates enable disable member link and status endpoints', async () => {
    miniUsersService.enable.mockResolvedValue({ id: 'mini-user-1', status: MiniUserStatus.ACTIVE });
    miniUsersService.disable.mockResolvedValue({ id: 'mini-user-1', status: MiniUserStatus.DISABLED });
    miniUsersService.getLinkedMember.mockResolvedValue({ id: 'member-1', name: '林若溪' });
    miniUsersService.linkMember.mockResolvedValue({ id: 'mini-user-1', member: { id: 'member-1' } });
    miniUsersService.getStatus.mockResolvedValue({ id: 'mini-user-1', status: MiniUserStatus.ACTIVE, hasLinkedMember: true, memberId: 'member-1' });

    await expect(controller.enable('mini-user-1')).resolves.toEqual({ id: 'mini-user-1', status: MiniUserStatus.ACTIVE });
    await expect(controller.disable('mini-user-1')).resolves.toEqual({ id: 'mini-user-1', status: MiniUserStatus.DISABLED });
    await expect(controller.getLinkedMember('mini-user-1')).resolves.toEqual({ id: 'member-1', name: '林若溪' });
    await expect(controller.linkMember('mini-user-1', 'member-1')).resolves.toEqual({ id: 'mini-user-1', member: { id: 'member-1' } });
    await expect(controller.getStatus('mini-user-1')).resolves.toEqual({
      id: 'mini-user-1',
      status: MiniUserStatus.ACTIVE,
      hasLinkedMember: true,
      memberId: 'member-1',
    });
  });
});
