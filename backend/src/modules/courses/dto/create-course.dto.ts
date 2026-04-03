import { IsString, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({ example: 'Reformer Fundamentals' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'EQUIPMENT' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'Beginner' })
  @IsString()
  level: string;

  @ApiProperty({ description: 'Duration in minutes', example: 60 })
  @IsInt()
  @Min(15)
  durationMinutes: number;

  @ApiProperty({ description: 'Maximum capacity', example: 6 })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ description: 'Coach ID' })
  @IsOptional()
  @IsString()
  coachId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
