import { IsString, IsOptional, IsInt, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipPlanCategory } from '../../../common/enums/domain.enums';

export class CreatePlanDto {
  @ApiProperty({ example: 'MONTHLY_UNLIMITED' })
  @IsString()
  code: string;

  @ApiProperty({ example: '月度无限卡' })
  @IsString()
  name: string;

  @ApiProperty({ enum: MembershipPlanCategory })
  @IsEnum(MembershipPlanCategory)
  category: MembershipPlanCategory;

  @ApiPropertyOptional({ description: '有效期天数（期限卡）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional({ description: '总课时数（次卡/套餐）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalCredits?: number;

  @ApiProperty({ description: '价格（分）', example: 198000 })
  @IsInt()
  @Min(0)
  priceCents: number;

  @ApiPropertyOptional({ example: '每月无限次上课' })
  @IsOptional()
  @IsString()
  description?: string;
}
