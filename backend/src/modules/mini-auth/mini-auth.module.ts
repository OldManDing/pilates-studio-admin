import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MiniAuthController } from './mini-auth.controller';
import { MiniAuthService } from './mini-auth.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MiniAuthController],
  providers: [MiniAuthService],
})
export class MiniAuthModule {}
