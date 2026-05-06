import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RefundTransactionDto {
  @ApiPropertyOptional({ description: 'Refund amount in cents. Defaults to the original amount.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  @ApiPropertyOptional({ description: 'Refund reason or operator note' })
  @IsOptional()
  @IsString()
  reason?: string;
}
