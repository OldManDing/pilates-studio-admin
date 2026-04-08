import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: admin.id, email: admin.email };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('auth.refreshExpiresIn'),
    });

    // Store refresh token hash
    await this.prisma.refreshToken.create({
      data: {
        adminUserId: admin.id,
        tokenHash: await bcrypt.hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
      user: {
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        role: {
          id: admin.role.id,
          code: admin.role.code,
          name: admin.role.name,
          permissions: admin.role.permissions.map(
            (rp) => `${rp.permission.action}:${rp.permission.module}`,
          ),
        },
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('auth.refreshSecret'),
      });

      const tokenRecord = await this.prisma.refreshToken.findFirst({
        where: {
          adminUserId: payload.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!tokenRecord) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isTokenValid = await bcrypt.compare(
        refreshToken,
        tokenRecord.tokenHash,
      );

      if (!isTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Revoke old refresh token
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });

      // Generate new tokens
      const newPayload = { sub: payload.sub, email: payload.email };
      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('auth.refreshExpiresIn'),
      });

      // Store new refresh token
      await this.prisma.refreshToken.create({
        data: {
          adminUserId: payload.sub,
          tokenHash: await bcrypt.hash(newRefreshToken, 10),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        adminUserId: userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  async getMe(userId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!admin) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: admin.id,
      email: admin.email,
      displayName: admin.displayName,
      role: {
        id: admin.role.id,
        code: admin.role.code,
        name: admin.role.name,
        permissions: admin.role.permissions.map(
          (rp) => `${rp.permission.action}:${rp.permission.module}`,
        ),
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    // Validate new password confirmation
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    // Get current user
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!admin) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      admin.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.prisma.adminUser.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  async getTwoFactorStatus(userId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('User not found');
    }

    return {
      enabled: admin.twoFactorEnabled,
      hasSecret: !!admin.twoFactorSecret,
    };
  }

  async generateTwoFactorSecret(userId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!admin) {
      throw new UnauthorizedException('User not found');
    }

    // Generate a random secret
    const secret = crypto.randomBytes(20).toString('hex');
    const backupCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Store the secret (but don't enable 2FA yet)
    await this.prisma.adminUser.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return {
      secret,
      backupCode,
      message: 'Secret generated. Please verify with a code to enable 2FA.',
    };
  }

  async verifyTwoFactor(userId: string, code: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!admin) {
      throw new UnauthorizedException('User not found');
    }

    if (!admin.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication not set up');
    }

    // Simple code verification (in production, use TOTP)
    // For now, we'll accept any 6-digit code
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Invalid code format');
    }

    // Enable 2FA
    await this.prisma.adminUser.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { success: true, message: 'Two-factor authentication enabled' };
  }

  async disableTwoFactor(userId: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!admin) {
      throw new UnauthorizedException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Disable 2FA
    await this.prisma.adminUser.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    return { success: true, message: 'Two-factor authentication disabled' };
  }
}
