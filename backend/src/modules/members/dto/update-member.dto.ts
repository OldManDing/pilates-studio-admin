import { PartialType } from '@nestjs/swagger';
import { CreateMemberDto } from './create-member.dto';
import { IsEnum, IsOptional, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MemberStatus } from '../../../common/enums/domain.enums';

export class UpdateMemberDto extends PartialType(CreateMemberDto) {
  @ApiPropertyOptional({ enum: MemberStatus })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @ApiPropertyOptional({ description: '剩余课时' })
  @IsOptional()
  @IsInt()
  remainingCredits?: number;
}
