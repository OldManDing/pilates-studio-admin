import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CourseSessionsService } from './course-sessions.service';

@ApiTags('Course Sessions')
@ApiBearerAuth()
@Controller('course-sessions')
export class CourseSessionsController {
  constructor(private readonly sessionsService: CourseSessionsService) {}

  @Get('upcoming')
  @RequirePermissions('READ:COURSES')
  @ApiOperation({ summary: 'Get upcoming course sessions' })
  async findUpcoming(@Query() pagination: PaginationDto) {
    return this.sessionsService.findUpcoming(pagination);
  }

  @Get(':id')
  @RequirePermissions('READ:COURSES')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async findOne(@Param('id') id: string) {
    return this.sessionsService.findOne(id);
  }

  @Get(':id/available-seats')
  @RequirePermissions('READ:COURSES')
  @ApiOperation({ summary: 'Get available seats for session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async getAvailableSeats(@Param('id') id: string) {
    return this.sessionsService.getAvailableSeats(id);
  }
}
