import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipAuth } from '../../common/decorators/skip-auth.decorator';
import { MiniLoginDto } from './dto/mini-login.dto';
import { MiniAuthService } from './mini-auth.service';

@ApiTags('Mini Auth')
@Controller('mini-auth')
export class MiniAuthController {
  constructor(private readonly miniAuthService: MiniAuthService) {}

  @Post('login')
  @SkipAuth()
  @ApiOperation({ summary: 'Login mini-program user and issue mini JWT' })
  async login(@Body() dto: MiniLoginDto) {
    return this.miniAuthService.login(dto);
  }
}
