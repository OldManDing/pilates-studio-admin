import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AllowMiniUser } from '../../common/decorators/allow-mini-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CoursesService } from './courses.service';
import { CourseSessionsService } from '../course-sessions/course-sessions.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@ApiTags('Courses')
@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly sessionsService: CourseSessionsService,
  ) {}

  @Post()
  @RequirePermissions('WRITE:COURSES')
  @ApiOperation({ summary: 'Create new course' })
  async create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  @Get()
  @AllowMiniUser()
  @RequirePermissions('READ:COURSES')
  @ApiOperation({ summary: 'Get all courses' })
  async findAll(@Query() query: QueryCoursesDto) {
    return this.coursesService.findAll(query);
  }

  @Get('active')
  @AllowMiniUser()
  @RequirePermissions('READ:COURSES')
  @ApiOperation({ summary: 'Get active courses only' })
  async findActive() {
    return this.coursesService.findActive();
  }

  @Get(':id')
  @AllowMiniUser()
  @RequirePermissions('READ:COURSES')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  async findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('WRITE:COURSES')
  @ApiOperation({ summary: 'Update course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('MANAGE:COURSES')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  async remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }

  @Get(':id/sessions')
  @AllowMiniUser()
  @RequirePermissions('READ:COURSES')
  @ApiOperation({ summary: 'Get course sessions' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  async getCourseSessions(
    @Param('id') id: string,
    @Query() query: { upcoming?: boolean; from?: string; to?: string },
  ) {
    return this.sessionsService.findByCourseId(id, query);
  }
}
