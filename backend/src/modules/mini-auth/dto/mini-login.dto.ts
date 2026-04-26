import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class MiniLoginDto {
  @ApiPropertyOptional({ description: 'WeChat wx.login code' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Local development OpenID fallback' })
  @IsOptional()
  @IsString()
  openId?: string;

  @ApiPropertyOptional({ description: 'WeChat UnionID, if available' })
  @IsOptional()
  @IsString()
  unionId?: string;

  @ApiPropertyOptional({ description: 'Mini-program nickname' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: 'Mini-program avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Phone number bound in mini-program' })
  @IsOptional()
  @Matches(/^[\d+\-()\s]{6,30}$/, { message: 'phone must be a valid contact number' })
  phone?: string;
}
