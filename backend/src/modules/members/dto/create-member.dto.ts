import { IsString, IsOptional, IsInt, IsEmail, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberStatus } from '../../../common/enums/domain.enums';

export class CreateMemberDto {
  @ApiProperty({ example: '张三' })
  @IsString()
  name: string;

  @ApiProperty({ example: '13800138000' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'zhangsan@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '会员卡方案ID' })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({ description: '初始课时', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  initialCredits?: number = 0;

  @ApiPropertyOptional({ description: '剩余课时（兼容前端字段）', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  remainingCredits?: number;

  @ApiPropertyOptional({ enum: MemberStatus, default: MemberStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus = MemberStatus.ACTIVE;
}
