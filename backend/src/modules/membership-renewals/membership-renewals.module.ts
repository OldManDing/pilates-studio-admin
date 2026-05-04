import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { MembershipRenewalsController } from './membership-renewals.controller';
import { MembershipRenewalsService } from './membership-renewals.service';
import { WechatPayService } from './wechat-pay.service';

@Module({
  imports: [NotificationsModule, PrismaModule, TransactionsModule],
  controllers: [MembershipRenewalsController],
  providers: [MembershipRenewalsService, WechatPayService],
})
export class MembershipRenewalsModule {}
