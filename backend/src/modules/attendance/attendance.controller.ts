import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @RequirePermissions('WRITE:ATTENDANCE')
  @ApiOperation({ summary: 'Check in member for a session' })
  async checkIn(@Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(dto);
  }

  @Post(':id/complete')
  @RequirePermissions('WRITE:ATTENDANCE')
  @ApiOperation({ summary: 'Mark session as completed' })
  @ApiParam({ name: 'id', description: 'Attendance ID' })
  async completeSession(
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return this.attendanceService.completeSession(id, notes);
  }

  @Get()
  @RequirePermissions('READ:ATTENDANCE')
  @ApiOperation({ summary: 'Get attendance records' })
  async findAll(@Query() query: PaginationDto & { sessionId?: string; memberId?: string }) {
    return this.attendanceService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('READ:ATTENDANCE')
  @ApiOperation({ summary: 'Get attendance record by ID' })
  @ApiParam({ name: 'id', description: 'Attendance ID' })
  async findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('WRITE:ATTENDANCE')
  @ApiOperation({ summary: 'Update attendance record' })
  @ApiParam({ name: 'id', description: 'Attendance ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateAttendanceDto) {
    return this.attendanceService.update(id, dto);
  }
}
