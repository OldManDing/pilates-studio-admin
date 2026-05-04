import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMembershipRenewalPaymentDto {
  @ApiProperty({ description: 'Membership plan ID selected for payment' })
  @IsString()
  @IsNotEmpty()
  planId: string;
}
