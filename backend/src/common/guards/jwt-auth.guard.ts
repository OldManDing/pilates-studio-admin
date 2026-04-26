import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/skip-auth.decorator';
import { MiniUserStatus } from '../enums/domain.enums';
import { PrismaService } from '../../modules/prisma/prisma.service';

interface JwtPayload {
  sub: string;
  principalType?: 'ADMIN' | 'MINI_USER';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      if (payload.principalType === 'MINI_USER') {
        const miniUser = await this.prisma.miniUser.findUnique({
          where: { id: payload.sub },
          include: { member: true },
        });

        if (!miniUser || miniUser.status !== MiniUserStatus.ACTIVE) {
          throw new UnauthorizedException('Mini user not found or disabled');
        }

        request.user = {
          ...payload,
          principalType: 'MINI_USER',
          miniUser,
          member: miniUser.member,
        };

        return true;
      }

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
        throw new UnauthorizedException('User not found');
      }

      request.user = {
        ...payload,
        principalType: 'ADMIN',
        role: {
          id: admin.role.id,
          code: admin.role.code,
          name: admin.role.name,
          permissions: admin.role.permissions.map(
            (rp) => `${rp.permission.action}:${rp.permission.module}`,
          ),
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
