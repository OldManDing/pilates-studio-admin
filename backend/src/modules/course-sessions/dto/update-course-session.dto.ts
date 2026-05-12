import { IsString, IsDateString, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCourseSessionDto {
  @ApiPropertyOptional({ description: 'Course ID' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Session coach override. Send null to use the course default coach.' })
  @IsOptional()
  @IsString()
  coachId?: string | null;

  @ApiPropertyOptional({ description: 'Session start time (ISO 8601)', example: '2025-04-10T09:00:00Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Session end time (ISO 8601)', example: '2025-04-10T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ description: 'Session capacity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Studio room or location shown to members' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Whether this session is open for mini-program booking' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
