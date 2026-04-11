import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
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
  @IsUUID()
  memberId?: string;

  @ApiPropertyOptional({ description: 'Linked mini user ID' })
  @IsOptional()
  @IsUUID()
  miniUserId?: string;

  @ApiPropertyOptional({ description: 'Linked admin user ID' })
  @IsOptional()
  @IsUUID()
  adminUserId?: string;

  @ApiPropertyOptional({ description: 'Optional JSON payload' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
