import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsString, Matches } from 'class-validator';

export class VerifyLoginTwoFactorDto {
  @ApiProperty({ description: 'Short-lived MFA token issued after password verification' })
  @IsJWT()
  mfaToken: string;

  @ApiProperty({ example: '123456', description: '6-digit TOTP verification code' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must be a 6-digit number' })
  code: string;
}
