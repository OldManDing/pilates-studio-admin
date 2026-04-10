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

  it('delegates getMe and changePassword to auth service', async () => {
    authService.getMe.mockResolvedValue({ id: 'admin-1', email: 'owner@pilates.com' });
    authService.changePassword.mockResolvedValue({ success: true });
    const dto = { currentPassword: 'old', newPassword: 'new-pass', confirmPassword: 'new-pass' };

    await expect(controller.getMe('admin-1')).resolves.toEqual({ id: 'admin-1', email: 'owner@pilates.com' });
    await expect(controller.changePassword('admin-1', dto as never)).resolves.toEqual({ success: true });

    expect(authService.getMe).toHaveBeenCalledWith('admin-1');
    expect(authService.changePassword).toHaveBeenCalledWith('admin-1', dto);
  });

  it('delegates 2FA status and setup endpoints to auth service', async () => {
    authService.getTwoFactorStatus.mockResolvedValue({ enabled: false, hasSecret: false });
    authService.generateTwoFactorSecret.mockResolvedValue({ secret: 'secret', backupCode: 'BACKUP' });
    authService.verifyTwoFactor.mockResolvedValue({ success: true });
    authService.disableTwoFactor.mockResolvedValue({ success: true });

    await expect(controller.getTwoFactorStatus('admin-1')).resolves.toEqual({ enabled: false, hasSecret: false });
    await expect(controller.generateTwoFactorSecret('admin-1')).resolves.toEqual({ secret: 'secret', backupCode: 'BACKUP' });
    await expect(controller.verifyTwoFactor('admin-1', '123456')).resolves.toEqual({ success: true });
    await expect(controller.disableTwoFactor('admin-1', 'Admin123!')).resolves.toEqual({ success: true });

    expect(authService.getTwoFactorStatus).toHaveBeenCalledWith('admin-1');
    expect(authService.generateTwoFactorSecret).toHaveBeenCalledWith('admin-1');
    expect(authService.verifyTwoFactor).toHaveBeenCalledWith('admin-1', '123456');
    expect(authService.disableTwoFactor).toHaveBeenCalledWith('admin-1', 'Admin123!');
  });
});
