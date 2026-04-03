import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionKind } from '../../../common/enums/domain.enums';

export class CreateTransactionDto {
  @ApiPropertyOptional({ description: 'Member ID' })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiPropertyOptional({ description: 'Membership Plan ID' })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiProperty({ enum: TransactionKind })
  @IsEnum(TransactionKind)
  kind: TransactionKind;

  @ApiProperty({ description: 'Amount in cents', example: 198000 })
  @IsInt()
  @Min(0)
  amountCents: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
