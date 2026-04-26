import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowMiniUser } from '../../common/decorators/allow-mini-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { SupportService } from './support.service';

@ApiTags('Support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('feedback')
  @AllowMiniUser()
  @RequirePermissions('WRITE:NOTIFICATIONS')
  @ApiOperation({ summary: 'Submit mini-program feedback' })
  async submitFeedback(
    @Body() dto: SubmitFeedbackDto,
    @CurrentUser('sub') miniUserId: string,
  ) {
    return this.supportService.submitFeedback(dto, miniUserId);
  }
}
