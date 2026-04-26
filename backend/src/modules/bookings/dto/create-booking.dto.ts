import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingSource } from '../../../common/enums/domain.enums';

export class CreateBookingDto {
  @ApiPropertyOptional({ description: 'Member ID (optional for mini-program self booking)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  memberId?: string;

  @ApiProperty({ description: 'Course Session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({ enum: BookingSource, default: BookingSource.ADMIN })
  @IsOptional()
  @IsEnum(BookingSource)
  source?: BookingSource = BookingSource.ADMIN;
}
