import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ example: 'admin@studio.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '13800138000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Admin Name' })
  @IsString()
  displayName: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Role ID' })
  @IsString()
  roleId: string;
}
