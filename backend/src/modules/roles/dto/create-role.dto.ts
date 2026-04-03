import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRoleCode } from '../../../common/enums/domain.enums';

export class CreateRoleDto {
  @ApiProperty({ enum: AdminRoleCode })
  @IsEnum(AdminRoleCode)
  code: AdminRoleCode;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}
