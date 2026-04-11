import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannel } from '../../../common/enums/domain.enums';

export class UpdateNotificationDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty({ enum: NotificationChannel, required: false })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}
