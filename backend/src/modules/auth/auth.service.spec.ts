import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { generateSecret, verify } from 'otplib';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  verify: jest.fn(),
}));

const mockedCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;
const mockedHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
const mockedVerify = verify as jest.MockedFunction<typeof verify>;
const mockedGenerateSecret = generateSecret as jest.MockedFunction<typeof generateSecret>;

const createAdmin = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'admin-1',
  email: 'owner@pilates.com',
  displayName: 'Owner',
  passwordHash: 'hashed-password',
  twoFactorEnabled: false,
  twoFactorSecret: null,
  role: {
    id: 'role-1',
    code: 'OWNER',
    name: 'Owner',
    permissions: [
      {
        permission: {
          action: 'READ',
          module: 'DASHBOARD',
        },
      },
    ],
  },
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    adminUser: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    refreshToken: {
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwtService: {
    sign: jest.Mock;
    verify: jest.Mock;
  };
  let configService: {
    get: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      adminUser: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'auth.refreshSecret') return 'refresh-secret';
        if (key === 'auth.refreshExpiresIn') return '7d';
        return undefined;
      }),
    };

    mockedCompare.mockReset();
    mockedHash.mockReset();
    mockedVerify.mockReset();
    mockedGenerateSecret.mockReset();

    mockedHash.mockResolvedValue('hashed-refresh-token' as never);
    mockedGenerateSecret.mockReturnValue('generated-secret' as never);
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.refreshToken.update.mockResolvedValue({});
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    service = new AuthService(
      prisma as unknown as never,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('returns a two-factor challenge when the account has 2FA enabled', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(
      createAdmin({ twoFactorEnabled: true, twoFactorSecret: 'secret-123' }),
    );
    mockedCompare.mockResolvedValue(true as never);
    jwtService.sign.mockReturnValue('mfa-token');

    const result = await service.login({ email: 'owner@pilates.com', password: 'Admin123!' });

    expect(result).toEqual({
      requiresTwoFactor: true,
      mfaToken: 'mfa-token',
      message: 'Two-factor verification required',
    });
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('creates an auth session when the account does not require 2FA', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(createAdmin());
    mockedCompare.mockResolvedValue(true as never);
    jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

    const result = await service.login({ email: 'owner@pilates.com', password: 'Admin123!' });

    expect(result).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 900,
      user: {
        email: 'owner@pilates.com',
        role: {
          code: 'OWNER',
          permissions: ['READ:DASHBOARD'],
        },
      },
    });
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a login when the password is invalid', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(createAdmin());
    mockedCompare.mockResolvedValue(false as never);

    await expect(service.login({ email: 'owner@pilates.com', password: 'wrong' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects login challenge verification when the code is invalid', async () => {
    jwtService.verify.mockReturnValue({ sub: 'admin-1', email: 'owner@pilates.com', purpose: '2fa-login' });
    prisma.adminUser.findUnique.mockResolvedValue(
      createAdmin({ twoFactorEnabled: true, twoFactorSecret: 'secret-123' }),
    );
    mockedVerify.mockResolvedValue({ valid: false } as never);

    await expect(
      service.verifyLoginTwoFactor({ mfaToken: 'mfa-token', code: '123456' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('creates a session after successful 2FA challenge verification', async () => {
    jwtService.verify.mockReturnValue({ sub: 'admin-1', email: 'owner@pilates.com', purpose: '2fa-login' });
    prisma.adminUser.findUnique.mockResolvedValue(
      createAdmin({ twoFactorEnabled: true, twoFactorSecret: 'secret-123' }),
    );
    mockedVerify.mockResolvedValue({ valid: true } as never);
    jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

    const result = await service.verifyLoginTwoFactor({ mfaToken: 'mfa-token', code: '123456' });

    expect(result).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { email: 'owner@pilates.com' },
    });
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('rotates refresh tokens when the refresh token is valid', async () => {
    jwtService.verify.mockReturnValue({ sub: 'admin-1', email: 'owner@pilates.com' });
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'refresh-1',
      adminUserId: 'admin-1',
      tokenHash: 'stored-hash',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockedCompare.mockResolvedValue(true as never);
    jwtService.sign.mockReturnValueOnce('new-access-token').mockReturnValueOnce('new-refresh-token');

    const result = await service.refresh('refresh-token');

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'refresh-1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 900,
    });
  });

  it('rejects refresh when the stored token hash does not match', async () => {
    jwtService.verify.mockReturnValue({ sub: 'admin-1', email: 'owner@pilates.com' });
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'refresh-1',
      adminUserId: 'admin-1',
      tokenHash: 'stored-hash',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockedCompare.mockResolvedValue(false as never);

    await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects password change when confirmation does not match', async () => {
    await expect(
      service.changePassword('admin-1', {
        currentPassword: 'old-password',
        newPassword: 'new-password',
        confirmPassword: 'different-password',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns current two-factor status for a valid user', async () => {
    prisma.adminUser.findUnique.mockResolvedValue({ twoFactorEnabled: true, twoFactorSecret: 'secret-123' });

    const result = await service.getTwoFactorStatus('admin-1');

    expect(result).toEqual({ enabled: true, hasSecret: true });
  });

  it('generates and stores a two-factor secret', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(createAdmin());

    const result = await service.generateTwoFactorSecret('admin-1');

    expect(prisma.adminUser.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { twoFactorSecret: 'generated-secret' },
    });
    expect(result.secret).toBe('generated-secret');
    expect(result.backupCode).toHaveLength(8);
  });

  it('enables two-factor authentication after a valid verification code', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(createAdmin({ twoFactorSecret: 'secret-123' }));
    mockedVerify.mockResolvedValue({ valid: true } as never);

    const result = await service.verifyTwoFactor('admin-1', '123456');

    expect(prisma.adminUser.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { twoFactorEnabled: true },
    });
    expect(result).toEqual({ success: true, message: 'Two-factor authentication enabled' });
  });

  it('rejects two-factor verification when setup has not started', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(createAdmin({ twoFactorSecret: null }));

    await expect(service.verifyTwoFactor('admin-1', '123456')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('disables two-factor authentication after password verification', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(createAdmin({ twoFactorEnabled: true, twoFactorSecret: 'secret-123' }));
    mockedCompare.mockResolvedValue(true as never);

    const result = await service.disableTwoFactor('admin-1', 'Admin123!');

    expect(prisma.adminUser.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    expect(result).toEqual({ success: true, message: 'Two-factor authentication disabled' });
  });

  it('rejects disabling two-factor authentication with a wrong password', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(createAdmin({ twoFactorEnabled: true, twoFactorSecret: 'secret-123' }));
    mockedCompare.mockResolvedValue(false as never);

    await expect(service.disableTwoFactor('admin-1', 'wrong-password')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('changes password when current password is valid', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(createAdmin());
    mockedCompare.mockResolvedValue(true as never);
    mockedHash.mockResolvedValue('new-password-hash' as never);

    const result = await service.changePassword('admin-1', {
      currentPassword: 'old-password',
      newPassword: 'new-password',
      confirmPassword: 'new-password',
    });

    expect(prisma.adminUser.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { passwordHash: 'new-password-hash' },
    });
    expect(result).toEqual({ success: true, message: 'Password changed successfully' });
  });
});
