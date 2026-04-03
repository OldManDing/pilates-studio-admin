import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { MembershipPlansService } from './membership-plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@ApiTags('Membership Plans')
@ApiBearerAuth()
@Controller('membership-plans')
export class MembershipPlansController {
  constructor(private readonly plansService: MembershipPlansService) {}

  @Post()
  @RequirePermissions('MANAGE:PLANS')
  @ApiOperation({ summary: 'Create new membership plan' })
  async create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Get()
  @RequirePermissions('READ:PLANS')
  @ApiOperation({ summary: 'Get all membership plans' })
  async findAll() {
    return this.plansService.findAll();
  }

  @Get('active')
  @RequirePermissions('READ:PLANS')
  @ApiOperation({ summary: 'Get active plans only' })
  async findActive() {
    return this.plansService.findActive();
  }

  @Get(':id')
  @RequirePermissions('READ:PLANS')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('MANAGE:PLANS')
  @ApiOperation({ summary: 'Update membership plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('MANAGE:PLANS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete membership plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}
