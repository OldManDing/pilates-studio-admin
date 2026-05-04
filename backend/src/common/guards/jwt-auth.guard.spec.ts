import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { MiniUserStatus } from '../enums/domain.enums';
import { JwtAuthGuard } from './jwt-auth.guard';

const createExecutionContext = (authorization?: string) => {
  const request = {
    headers: authorization ? { authorization } : {},
    user: undefined as unknown,
  };

  return {
    context: {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext,
    request,
  };
};

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: {
    miniUser: { findUnique: jest.Mock };
    adminUser: { findUnique: jest.Mock };
  };

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };
    prisma = {
      miniUser: {
        findUnique: jest.fn(),
      },
      adminUser: {
        findUnique: jest.fn(),
      },
    };

    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      reflector as unknown as Reflector,
      prisma as never,
    );
  });

  it('preserves disabled mini user message instead of masking it as token failure', async () => {
    const { context } = createExecutionContext('Bearer valid-token');

    jwtService.verifyAsync.mockResolvedValue({ sub: 'mini-1', principalType: 'MINI_USER' });
    prisma.miniUser.findUnique.mockResolvedValue({
      id: 'mini-1',
      status: MiniUserStatus.DISABLED,
      member: null,
    });

    await expect(guard.canActivate(context)).rejects.toThrow('Mini user not found or disabled');
  });

  it('preserves missing admin message instead of masking it as token failure', async () => {
    const { context } = createExecutionContext('Bearer valid-token');

    jwtService.verifyAsync.mockResolvedValue({ sub: 'admin-1' });
    prisma.adminUser.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow('User not found');
  });

  it('still maps unexpected verification failures to invalid token', async () => {
    const { context } = createExecutionContext('Bearer broken-token');

    jwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
  });
});
