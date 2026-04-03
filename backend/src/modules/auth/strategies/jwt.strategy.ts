import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.accessSecret'),
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
        name: admin.role.name,
        permissions: admin.role.permissions.map(
          (rp) => `${rp.permission.action}:${rp.permission.module}`,
        ),
      },
    };
  }
}
