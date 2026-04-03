import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStudioDto {
  @ApiProperty()
  @IsString()
  studioName: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  businessHours: string;

  @ApiProperty()
  @IsString()
  address: string;
}
