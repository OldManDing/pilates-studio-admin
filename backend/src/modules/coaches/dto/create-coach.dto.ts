import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CoachStatus } from '../../../common/enums/domain.enums';

export class CreateCoachDto {
  @ApiProperty({ example: 'Sarah Chen' })
  @IsString()
  name: string;

  @ApiProperty({ example: '13800138000' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'sarah@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: CoachStatus, default: CoachStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CoachStatus)
  status?: CoachStatus = CoachStatus.ACTIVE;

  @ApiPropertyOptional({ example: '5年普拉提教学经验' })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiPropertyOptional({ example: 'STOTT认证教练，擅长康复训练' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ type: [String], example: ['Reformer', 'Mat'] })
  @IsOptional()
  specialties?: string[];

  @ApiPropertyOptional({ type: [String], example: ['STOTT认证'] })
  @IsOptional()
  certificates?: string[];
}
