import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingSource } from '../../../common/enums/domain.enums';

export class CreateBookingDto {
  @ApiPropertyOptional({ description: 'Member ID (optional for mini-program self booking)' })
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiProperty({ description: 'Course Session ID' })
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({ enum: BookingSource, default: BookingSource.ADMIN })
  @IsOptional()
  @IsEnum(BookingSource)
  source?: BookingSource = BookingSource.ADMIN;
}
