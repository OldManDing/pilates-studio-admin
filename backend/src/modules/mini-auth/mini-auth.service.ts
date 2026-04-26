import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MiniUserStatus } from '../../common/enums/domain.enums';
import { PrismaService } from '../prisma/prisma.service';
import { MiniLoginDto } from './dto/mini-login.dto';

interface WechatSessionResponse {
  openid?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class MiniAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: MiniLoginDto) {
    const session = await this.resolveWechatSession(dto);

    const miniUser = await this.prisma.miniUser.upsert({
      where: { openId: session.openId },
      create: {
        openId: session.openId,
        unionId: session.unionId,
        nickname: dto.nickname,
        avatarUrl: dto.avatarUrl,
        phone: dto.phone,
        status: MiniUserStatus.ACTIVE,
      },
      update: {
        ...(session.unionId !== undefined ? { unionId: session.unionId } : {}),
        ...(dto.nickname !== undefined ? { nickname: dto.nickname } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      },
      include: { member: true },
    });

    if (miniUser.status !== MiniUserStatus.ACTIVE) {
      throw new UnauthorizedException('Mini user is disabled');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: miniUser.id,
      principalType: 'MINI_USER',
      openId: miniUser.openId,
    });

    return {
      accessToken,
      miniUser,
      member: miniUser.member,
    };
  }

  private async resolveWechatSession(dto: MiniLoginDto): Promise<{ openId: string; unionId?: string }> {
    if (dto.code) {
      return this.exchangeCode(dto.code);
    }

    if (dto.openId && process.env.NODE_ENV !== 'production') {
      return {
        openId: dto.openId,
        unionId: dto.unionId,
      };
    }

    throw new BadRequestException('code is required');
  }

  private async exchangeCode(code: string): Promise<{ openId: string; unionId?: string }> {
    const appId = this.configService.get<string>('wechat.appId');
    const secret = this.configService.get<string>('wechat.secret');

    if (!appId || !secret) {
      throw new BadRequestException('WeChat app credentials are not configured');
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', secret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    const response = await fetch(url);
    const result = await response.json() as WechatSessionResponse;

    if (!response.ok || result.errcode || !result.openid) {
      throw new UnauthorizedException(result.errmsg || 'Failed to exchange WeChat code');
    }

    return {
      openId: result.openid,
      unionId: result.unionid,
    };
  }
}
