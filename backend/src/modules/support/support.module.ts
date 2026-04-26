import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [NotificationsModule, PrismaModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
