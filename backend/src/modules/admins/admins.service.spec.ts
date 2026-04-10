import * as bcrypt from 'bcrypt';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminsService } from './admins.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

const mockedHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;

const createAdmin = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'admin-1',
  email: 'owner@pilates.com',
  phone: '13800000000',
  displayName: 'Owner',
  roleId: 'role-1',
  role: { id: 'role-1', code: 'OWNER', name: '店长' },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  passwordHash: 'hashed-password',
  ...overrides,
});

describe('AdminsService', () => {
  let service: AdminsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      adminUser: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    mockedHash.mockReset();
    mockedHash.mockResolvedValue('hashed-secret' as never);
    service = new AdminsService(prisma);
  });

  it('creates an admin with hashed password', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(null);
    prisma.adminUser.create.mockResolvedValue(createAdmin());

    const result = await service.create({
      email: 'owner@pilates.com',
      phone: '13800000000',
      displayName: 'Owner',
      password: 'Admin123!',
      roleId: 'role-1',
    });

    expect(prisma.adminUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordHash: 'hashed-secret' }),
      }),
    );
    expect(result.email).toBe('owner@pilates.com');
  });

  it('rejects duplicate admin emails', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(createAdmin());

    await expect(
      service.create({
        email: 'owner@pilates.com',
        phone: '13800000000',
        displayName: 'Owner',
        password: 'Admin123!',
        roleId: 'role-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when admin does not exist', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates passwordHash when password is provided during update', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(createAdmin());
    prisma.adminUser.update.mockResolvedValue(createAdmin({ displayName: 'Updated' }));

    await service.update('admin-1', { password: 'NewSecret123', displayName: 'Updated' } as never);

    expect(prisma.adminUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'admin-1' },
        data: expect.objectContaining({ passwordHash: 'hashed-secret', displayName: 'Updated' }),
      }),
    );
  });

  it('resets password through resetPassword helper', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(createAdmin());
    prisma.adminUser.update.mockResolvedValue({ id: 'admin-1', email: 'owner@pilates.com', updatedAt: new Date() });

    const result = await service.resetPassword('admin-1', 'Reset123!');

    expect(prisma.adminUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'admin-1' },
        data: { passwordHash: 'hashed-secret' },
      }),
    );
    expect(result.id).toBe('admin-1');
  });
});
