import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMiniPageImageDto {
  @ApiProperty({ required: false, description: 'Data URL or remote URL. Empty value restores the mini-program default image.' })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}
