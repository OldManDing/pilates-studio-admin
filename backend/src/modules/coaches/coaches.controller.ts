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
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CoachesService } from './coaches.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { QueryCoachesDto } from './dto/query-coaches.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';

@ApiTags('Coaches')
@ApiBearerAuth()
@Controller('coaches')
export class CoachesController {
  constructor(private readonly coachesService: CoachesService) {}

  @Post()
  @RequirePermissions('WRITE:COACHES')
  @ApiOperation({ summary: 'Create new coach' })
  async create(@Body() dto: CreateCoachDto) {
    return this.coachesService.create(dto);
  }

  @Get()
  @RequirePermissions('READ:COACHES')
  @ApiOperation({ summary: 'Get all coaches' })
  async findAll(@Query() query: QueryCoachesDto) {
    return this.coachesService.findAll(query);
  }

  @Get('active')
  @RequirePermissions('READ:COACHES')
  @ApiOperation({ summary: 'Get active coaches only' })
  async findActive() {
    return this.coachesService.findActive();
  }

  @Get(':id/schedule')
  @RequirePermissions('READ:COACHES')
  @ApiOperation({ summary: 'Get coach schedule' })
  @ApiParam({ name: 'id', description: 'Coach ID' })
  async getSchedule(
    @Param('id') id: string,
    @Query() query: { from?: string; to?: string },
  ) {
    return this.coachesService.getSchedule(id, query);
  }

  @Get(':id')
  @RequirePermissions('READ:COACHES')
  @ApiOperation({ summary: 'Get coach by ID' })
  @ApiParam({ name: 'id', description: 'Coach ID' })
  async findOne(@Param('id') id: string) {
    return this.coachesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('WRITE:COACHES')
  @ApiOperation({ summary: 'Update coach' })
  @ApiParam({ name: 'id', description: 'Coach ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateCoachDto) {
    return this.coachesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('MANAGE:COACHES')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete coach' })
  @ApiParam({ name: 'id', description: 'Coach ID' })
  async remove(@Param('id') id: string) {
    return this.coachesService.remove(id);
  }

  @Get(':id/stats')
  @RequirePermissions('READ:ANALYTICS')
  @ApiOperation({ summary: 'Get coach statistics' })
  @ApiParam({ name: 'id', description: 'Coach ID' })
  async getStats(@Param('id') id: string) {
    return this.coachesService.getStats(id);
  }
}
