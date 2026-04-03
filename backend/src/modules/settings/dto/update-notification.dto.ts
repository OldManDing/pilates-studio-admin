import { IsBoolean, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotificationDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}
