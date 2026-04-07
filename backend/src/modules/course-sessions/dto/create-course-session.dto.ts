import { IsString, IsDateString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCourseSessionDto {
  @ApiProperty({ description: 'Course ID' })
  @IsString()
  courseId: string;

  @ApiProperty({ description: 'Coach ID' })
  @IsString()
  coachId: string;

  @ApiProperty({ description: 'Session start time (ISO 8601)', example: '2025-04-10T09:00:00Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ description: 'Session end time (ISO 8601)', example: '2025-04-10T10:00:00Z' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ description: 'Session capacity', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
