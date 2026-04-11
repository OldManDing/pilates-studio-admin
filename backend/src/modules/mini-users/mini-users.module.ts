import { Module } from '@nestjs/common';
import { MiniUsersController } from './mini-users.controller';
import { MiniUsersService } from './mini-users.service';

@Module({
  controllers: [MiniUsersController],
  providers: [MiniUsersService],
  exports: [MiniUsersService],
})
export class MiniUsersModule {}
