import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { NotificationChannel } from '../../../common/enums/domain.enums';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ description: 'Business notification type', example: 'BOOKING_REMINDER' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Linked member ID' })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiPropertyOptional({ description: 'Linked mini user ID' })
  @IsOptional()
  @IsString()
  miniUserId?: string;

  @ApiPropertyOptional({ description: 'Linked admin user ID' })
  @IsOptional()
  @IsString()
  adminUserId?: string;

  @ApiPropertyOptional({ description: 'Optional JSON payload' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
