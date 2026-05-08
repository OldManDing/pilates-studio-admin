import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@pilates.studio' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class LoginMfaChallengeDto {
  @ApiProperty({ example: true })
  requiresTwoFactor: true;

  @ApiProperty({ description: 'Short-lived MFA token to continue login' })
  mfaToken: string;

  @ApiProperty({ example: '请输入两步验证码以完成登录' })
  message: string;
}
