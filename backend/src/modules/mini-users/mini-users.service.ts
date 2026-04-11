import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
import { MiniUserStatus } from '../../common/enums/domain.enums';
import { CreateMiniUserDto } from './dto/create-mini-user.dto';
import { QueryMiniUserDto } from './dto/query-mini-user.dto';
import { UpdateMiniUserDto } from './dto/update-mini-user.dto';

@Injectable()
export class MiniUsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMiniUserDto) {
    await this.ensureIdentifiersAvailable(dto.openId, dto.unionId);

    const miniUser = await this.prisma.miniUser.create({
      data: {
        openId: dto.openId,
        unionId: dto.unionId,
        nickname: dto.nickname,
        avatarUrl: dto.avatarUrl,
        phone: dto.phone,
        status: dto.status ?? MiniUserStatus.ACTIVE,
      },
      include: {
        member: true,
      },
    });

    if (dto.memberId) {
      await this.linkMember(miniUser.id, dto.memberId);
      return this.findOne(miniUser.id);
    }

    return miniUser;
  }

  async findAll(query: QueryMiniUserDto): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const search = query.search?.trim();
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { nickname: { contains: search } },
              { openId: { contains: search } },
              { phone: { contains: search } },
              { member: { name: { contains: search } } },
              { member: { memberCode: { contains: search } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.miniUser.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          member: {
            select: {
              id: true,
              memberCode: true,
              name: true,
              phone: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.miniUser.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const miniUser = await this.prisma.miniUser.findUnique({
      where: { id },
      include: {
        member: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!miniUser) {
      throw new NotFoundException('Mini user not found');
    }

    return miniUser;
  }

  async findByOpenId(openId: string) {
    const miniUser = await this.prisma.miniUser.findUnique({
      where: { openId },
      include: {
        member: true,
      },
    });

    if (!miniUser) {
      throw new NotFoundException('Mini user not found');
    }

    return miniUser;
  }

  async update(id: string, dto: UpdateMiniUserDto) {
    const existing = await this.findOne(id);

    if (dto.openId && dto.openId !== existing.openId) {
      await this.ensureIdentifiersAvailable(dto.openId, undefined, id);
    }

    if (dto.unionId && dto.unionId !== existing.unionId) {
      await this.ensureIdentifiersAvailable(existing.openId, dto.unionId, id);
    }

    if (dto.memberId) {
      await this.linkMember(id, dto.memberId);
    }

    return this.prisma.miniUser.update({
      where: { id },
      data: {
        ...(dto.openId !== undefined ? { openId: dto.openId } : {}),
        ...(dto.unionId !== undefined ? { unionId: dto.unionId } : {}),
        ...(dto.nickname !== undefined ? { nickname: dto.nickname } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: {
        member: true,
      },
    });
  }

  async enable(id: string) {
    await this.findOne(id);

    return this.prisma.miniUser.update({
      where: { id },
      data: { status: MiniUserStatus.ACTIVE },
      include: { member: true },
    });
  }

  async disable(id: string) {
    await this.findOne(id);

    return this.prisma.miniUser.update({
      where: { id },
      data: { status: MiniUserStatus.DISABLED },
      include: { member: true },
    });
  }

  async getLinkedMember(id: string) {
    const miniUser = await this.findOne(id);
    return miniUser.member;
  }

  async linkMember(id: string, memberId: string) {
    const [miniUser, member] = await Promise.all([
      this.findOne(id),
      this.prisma.member.findUnique({
        where: { id: memberId },
        include: {
          miniUser: true,
        },
      }),
    ]);

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (miniUser.member && miniUser.member.id !== memberId) {
      throw new ConflictException('Mini user is already linked to another member');
    }

    if (member.miniUserId && member.miniUserId !== id) {
      throw new ConflictException('Member is already linked to another mini user');
    }

    await this.prisma.member.update({
      where: { id: memberId },
      data: { miniUserId: id },
    });

    return this.findOne(id);
  }

  async getStatus(id: string) {
    const miniUser = await this.findOne(id);

    return {
      id: miniUser.id,
      status: miniUser.status,
      hasLinkedMember: !!miniUser.member,
      memberId: miniUser.member?.id ?? null,
    };
  }

  private async ensureIdentifiersAvailable(openId: string, unionId?: string, currentId?: string) {
    const existingOpenId = await this.prisma.miniUser.findUnique({
      where: { openId },
    });

    if (existingOpenId && existingOpenId.id !== currentId) {
      throw new ConflictException('OpenID already exists');
    }

    if (unionId) {
      const existingUnionId = await this.prisma.miniUser.findFirst({
        where: { unionId },
      });

      if (existingUnionId && existingUnionId.id !== currentId) {
        throw new ConflictException('UnionID already exists');
      }
    }
  }
}
