import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { MiniUserStatus } from '../../../common/enums/domain.enums';

export class QueryMiniUserDto extends PaginationDto {
  @ApiPropertyOptional({ enum: MiniUserStatus })
  @IsOptional()
  @IsEnum(MiniUserStatus)
  status?: MiniUserStatus;
}
