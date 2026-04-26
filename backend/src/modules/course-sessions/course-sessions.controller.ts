import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AllowMiniUser } from '../../common/decorators/allow-mini-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CourseSessionsService } from './course-sessions.service';
import { CreateCourseSessionDto } from './dto/create-course-session.dto';
import { UpdateCourseSessionDto } from './dto/update-course-session.dto';

@ApiTags('Course Sessions')
@ApiBearerAuth()
@Controller('course-sessions')
export class CourseSessionsController {
  constructor(private readonly sessionsService: CourseSessionsService) {}

  @Post()
  @RequirePermissions('WRITE:COURSES')
  @ApiOperation({ summary: 'Create new course session' })
  async create(@Body() dto: CreateCourseSessionDto) {
    return this.sessionsService.create(dto);
  }

  @Get()
  @AllowMiniUser()
  @RequirePermissions('READ:COURSES')
  @ApiOperation({ summary: 'Get upcoming course sessions' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.sessionsService.findUpcoming(pagination);
  }

  @Get('upcoming')
  @AllowMiniUser()
  @RequirePermissions('READ:COURSES')
  @ApiOperation({ summary: 'Get upcoming course sessions' })
  async findUpcoming(@Query() pagination: PaginationDto) {
    return this.sessionsService.findUpcoming(pagination);
  }

  @Get(':id')
  @AllowMiniUser()
  @RequirePermissions('READ:COURSES')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async findOne(@Param('id') id: string) {
    return this.sessionsService.findOne(id);
  }

  @Get(':id/available-seats')
  @AllowMiniUser()
  @RequirePermissions('READ:COURSES')
  @ApiOperation({ summary: 'Get available seats for session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async getAvailableSeats(@Param('id') id: string) {
    return this.sessionsService.getAvailableSeats(id);
  }

  @Patch(':id')
  @RequirePermissions('WRITE:COURSES')
  @ApiOperation({ summary: 'Update session by ID' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateCourseSessionDto) {
    return this.sessionsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('MANAGE:COURSES')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete session by ID' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async remove(@Param('id') id: string) {
    return this.sessionsService.remove(id);
  }
}
