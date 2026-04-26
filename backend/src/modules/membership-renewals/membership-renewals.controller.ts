import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowMiniUser } from '../../common/decorators/allow-mini-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CreateMembershipRenewalDto } from './dto/create-membership-renewal.dto';
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
}
