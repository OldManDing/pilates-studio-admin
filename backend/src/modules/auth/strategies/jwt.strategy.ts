import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  OWNER: '店长',
  FRONTDESK: '前台',
  COACH: '教练',
  FINANCE: '财务',
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.accessSecret'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
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
      return null;
    }

    return {
      sub: admin.id,
      email: admin.email,
      displayName: admin.displayName,
      role: {
        id: admin.role.id,
        code: admin.role.code,
        name: ROLE_DISPLAY_NAMES[admin.role.code] || admin.role.name,
        permissions: admin.role.permissions.map(
          (rp) => `${rp.permission.action}:${rp.permission.module}`,
        ),
      },
    };
  }
}
