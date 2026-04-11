import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { CoachStatus } from '../../../common/enums/domain.enums';

export class QueryCoachesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by name, phone, email, or coach code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CoachStatus })
  @IsOptional()
  @IsEnum(CoachStatus)
  status?: CoachStatus;
}
