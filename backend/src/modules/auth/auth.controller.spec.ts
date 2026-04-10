jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  verify: jest.fn(),
}));

import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const authService = {
    login: jest.fn(),
    verifyLoginTwoFactor: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
    changePassword: jest.fn(),
    getTwoFactorStatus: jest.fn(),
    generateTwoFactorSecret: jest.fn(),
    verifyTwoFactor: jest.fn(),
    disableTwoFactor: jest.fn(),
  };

  const controller = new AuthController(authService as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegates login to auth service', async () => {
    authService.login.mockResolvedValue({ success: true });
    const dto = { email: 'owner@pilates.com', password: 'Admin123!' };

    await expect(controller.login(dto as never)).resolves.toEqual({ success: true });
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('delegates two-factor verification to auth service', async () => {
    authService.verifyLoginTwoFactor.mockResolvedValue({ accessToken: 'token' });
    const dto = { mfaToken: 'mfa-token', code: '123456' };

    await expect(controller.verifyLoginTwoFactor(dto as never)).resolves.toEqual({ accessToken: 'token' });
    expect(authService.verifyLoginTwoFactor).toHaveBeenCalledWith(dto);
  });

  it('delegates refresh and logout to auth service', async () => {
    authService.refresh.mockResolvedValue({ accessToken: 'new-token' });
    authService.logout.mockResolvedValue({ success: true });

    await expect(controller.refresh({ refreshToken: 'refresh-token' } as never)).resolves.toEqual({ accessToken: 'new-token' });
    await expect(controller.logout('admin-1')).resolves.toEqual({ success: true });

    expect(authService.refresh).toHaveBeenCalledWith('refresh-token');
    expect(authService.logout).toHaveBeenCalledWith('admin-1');
  });
});
