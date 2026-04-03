import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('members')
  @RequirePermissions('READ:REPORTS')
  @ApiOperation({ summary: 'Get members report' })
  async getMembersReport() {
    return this.reportsService.getMembersReport();
  }

  @Get('bookings')
  @RequirePermissions('READ:REPORTS')
  @ApiOperation({ summary: 'Get bookings report' })
  @ApiQuery({ name: 'from', required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'to', required: true, example: '2025-12-31' })
  async getBookingsReport(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getBookingsReport(from, to);
  }

  @Get('transactions')
  @RequirePermissions('READ:REPORTS')
  @ApiOperation({ summary: 'Get transactions report' })
  @ApiQuery({ name: 'from', required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'to', required: true, example: '2025-12-31' })
  async getTransactionsReport(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getTransactionsReport(from, to);
  }

  @Get('attendance')
  @RequirePermissions('READ:REPORTS')
  @ApiOperation({ summary: 'Get attendance report' })
  @ApiQuery({ name: 'from', required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'to', required: true, example: '2025-12-31' })
  async getAttendanceReport(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getAttendanceReport(from, to);
  }
}
