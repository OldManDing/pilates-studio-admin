import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipRenewalsController } from './membership-renewals.controller';
import { MembershipRenewalsService } from './membership-renewals.service';

@Module({
  imports: [NotificationsModule, PrismaModule],
  controllers: [MembershipRenewalsController],
  providers: [MembershipRenewalsService],
})
export class MembershipRenewalsModule {}
