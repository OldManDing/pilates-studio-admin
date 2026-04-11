import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { MiniUserStatus } from '../../../common/enums/domain.enums';

export class CreateMiniUserDto {
  @ApiProperty({ description: 'Mini-program OpenID' })
  @IsString()
  openId: string;

  @ApiPropertyOptional({ description: 'Mini-program UnionID' })
  @IsOptional()
  @IsString()
  unionId?: string;

  @ApiPropertyOptional({ description: 'Nickname shown in mini-program' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @Matches(/^[\d+\-()\s]{6,30}$/, { message: 'phone must be a valid contact number' })
  phone?: string;

  @ApiPropertyOptional({ enum: MiniUserStatus, default: MiniUserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MiniUserStatus)
  status?: MiniUserStatus = MiniUserStatus.ACTIVE;

  @ApiPropertyOptional({ description: 'Member ID to link immediately' })
  @IsOptional()
  @IsUUID()
  memberId?: string;
}
