import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateKnowledgeArticleDto {
  @ApiProperty({ example: 'booking' })
  @IsString()
  category: string;

  @ApiProperty({ example: '如何取消预约？' })
  @IsString()
  question: string;

  @ApiProperty({ example: '课程开始前 4 小时可在我的预约中取消。' })
  @IsString()
  answer: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
