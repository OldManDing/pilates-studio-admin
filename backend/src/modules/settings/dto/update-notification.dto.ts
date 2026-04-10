import { IsBoolean, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannel } from '../../../common/enums/domain.enums';

export class UpdateNotificationDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty({ enum: NotificationChannel, required: false })
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}
