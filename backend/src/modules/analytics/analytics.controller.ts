import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { QueryAnalyticsRangeDto } from './dto/query-analytics-range.dto';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions('READ:ANALYTICS')
  @ApiOperation({ summary: 'Get analytics dashboard overview' })
  async getDashboardOverview(@Query() query: QueryAnalyticsRangeDto) {
    return this.analyticsService.getDashboardOverview(query.from, query.to);
  }

  @Get('booking-distribution')
  @RequirePermissions('READ:ANALYTICS')
  @ApiOperation({ summary: 'Get booking distribution by time of day' })
  async getBookingDistribution(@Query() query: QueryAnalyticsRangeDto) {
    return this.analyticsService.getBookingDistribution(query.from, query.to);
  }

  @Get('member-retention-trend')
  @RequirePermissions('READ:ANALYTICS')
  @ApiOperation({ summary: 'Get member retention trend' })
  async getMemberRetentionTrend() {
    return this.analyticsService.getMemberRetentionTrend();
  }
}
