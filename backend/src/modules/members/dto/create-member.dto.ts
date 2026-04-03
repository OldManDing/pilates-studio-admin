import { IsString, IsOptional, IsInt, IsEmail, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}
