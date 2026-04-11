import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { MiniUserStatus } from '../../../common/enums/domain.enums';

export class QueryMiniUserDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by nickname, openId, phone, or linked member info' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MiniUserStatus })
  @IsOptional()
  @IsEnum(MiniUserStatus)
  status?: MiniUserStatus;
}
