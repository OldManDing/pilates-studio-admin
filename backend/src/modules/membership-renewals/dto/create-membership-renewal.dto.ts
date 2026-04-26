import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMembershipRenewalDto {
  @ApiProperty({ description: 'Membership plan ID selected for renewal' })
  @IsString()
  @IsNotEmpty()
  planId: string;
}
