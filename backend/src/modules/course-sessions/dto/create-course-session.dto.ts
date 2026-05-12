import { IsString, IsDateString, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCourseSessionDto {
  @ApiProperty({ description: 'Course ID' })
  @IsString()
  courseId: string;

  @ApiPropertyOptional({ description: 'Session coach override. Omit or send null to use the course default coach.' })
  @IsOptional()
  @IsString()
  coachId?: string | null;

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

  @ApiPropertyOptional({ description: 'Studio room or location shown to members' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Whether this session is open for mini-program booking', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
