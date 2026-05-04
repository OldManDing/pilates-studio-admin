import { Body, Controller, Headers, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowMiniUser } from '../../common/decorators/allow-mini-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { SkipAuth } from '../../common/decorators/skip-auth.decorator';
import { CreateMembershipRenewalDto } from './dto/create-membership-renewal.dto';
import { CreateMembershipRenewalPaymentDto } from './dto/create-membership-renewal-payment.dto';
import { MembershipRenewalsService } from './membership-renewals.service';

@ApiTags('Membership Renewals')
@ApiBearerAuth()
@Controller('membership-renewals')
export class MembershipRenewalsController {
  constructor(private readonly membershipRenewalsService: MembershipRenewalsService) {}

  @Post()
  @AllowMiniUser()
  @RequirePermissions('WRITE:TRANSACTIONS')
  @ApiOperation({ summary: 'Submit current mini-program member renewal request' })
  async create(
    @Body() dto: CreateMembershipRenewalDto,
    @CurrentUser('sub') miniUserId: string,
  ) {
    return this.membershipRenewalsService.create(dto, miniUserId);
  }

  @Post('pay')
  @AllowMiniUser()
  @RequirePermissions('WRITE:TRANSACTIONS')
  @ApiOperation({ summary: 'Create WeChat Pay order for current mini-program member renewal' })
  async createPayment(
    @Body() dto: CreateMembershipRenewalPaymentDto,
    @CurrentUser('sub') miniUserId: string,
  ) {
    return this.membershipRenewalsService.createPayment(dto, miniUserId);
  }

  @Post('wechat/notify')
  @SkipAuth()
  @ApiBody({ schema: { type: 'object' } })
  @ApiOperation({ summary: 'Receive WeChat Pay payment notification' })
  async handleWechatNotify(@Req() req: Request & { rawBody?: Buffer }, @Headers() headers: Record<string, string | string[] | undefined>) {
    const rawBody = req.rawBody?.toString('utf8') || '{}';
    return this.membershipRenewalsService.handleWechatNotificationRequest(rawBody, headers);
  }

  @Post(':transactionId/mock-complete')
  @AllowMiniUser()
  @RequirePermissions('WRITE:TRANSACTIONS')
  @ApiOperation({ summary: 'Complete renewal payment in mock mode for local verification' })
  async completeMockPayment(@Param('transactionId') transactionId: string) {
    return this.membershipRenewalsService.completeMockPayment(transactionId);
  }
}
