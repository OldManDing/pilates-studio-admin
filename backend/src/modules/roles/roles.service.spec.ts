import { ConflictException, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';

const createRole = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'role-1',
  code: 'OWNER',
  name: '店长',
  description: '门店负责人',
  permissions: [],
  admins: [],
  _count: { admins: 0 },
  ...overrides,
});

describe('RolesService', () => {
  let service: RolesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      role: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      rolePermission: {
        deleteMany: jest.fn(),
      },
      permission: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    service = new RolesService(prisma);
  });

  it('creates a role when the code is available', async () => {
    prisma.role.findUnique.mockResolvedValue(null);
    prisma.role.create.mockResolvedValue(createRole());

    const result = await service.create({ code: 'OWNER' as never, name: '店长', permissionIds: ['perm-1'] });

    expect(prisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'OWNER',
          permissions: {
            create: [{ permission: { connect: { id: 'perm-1' } } }],
          },
        }),
      }),
    );
    expect(result.code).toBe('OWNER');
  });

  it('rejects duplicate role codes', async () => {
    prisma.role.findUnique.mockResolvedValue(createRole());

    await expect(service.create({ code: 'OWNER' as never, name: '店长' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when assigning permissions to a missing role', async () => {
    prisma.role.findUnique.mockResolvedValue(null);

    await expect(service.assignPermissions('missing', ['perm-1'])).rejects.toBeInstanceOf(NotFoundException);
  });

  it('replaces permissions during assignment', async () => {
    prisma.role.findUnique.mockResolvedValue(createRole());
    prisma.role.update.mockResolvedValue(createRole({ permissions: [{ permission: { id: 'perm-1' } }] }));

    await service.assignPermissions('role-1', ['perm-1']);

    expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'role-1' } });
    expect(prisma.role.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'role-1' },
        data: {
          permissions: {
            create: [{ permission: { connect: { id: 'perm-1' } } }],
          },
        },
      }),
    );
  });
});
