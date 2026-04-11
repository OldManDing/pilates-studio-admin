import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationDeliveryService, NotificationsScheduler],
  exports: [NotificationsService, NotificationDeliveryService],
})
export class NotificationsModule {}
