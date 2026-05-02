import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateMemberPreferencesDto {
  @ApiPropertyOptional({ description: 'Whether course-related notifications are enabled' })
  @IsOptional()
  @IsBoolean()
  courseReminder?: boolean;

  @ApiPropertyOptional({ description: 'Whether system notifications are enabled' })
  @IsOptional()
  @IsBoolean()
  systemNotification?: boolean;
}
