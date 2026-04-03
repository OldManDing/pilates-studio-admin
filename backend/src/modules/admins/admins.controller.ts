import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';

@ApiTags('Admins')
@ApiBearerAuth()
@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  @RequirePermissions('MANAGE:ADMINS')
  @ApiOperation({ summary: 'Get all admins' })
  async findAll() {
    return this.adminsService.findAll();
  }

  @Post()
  @RequirePermissions('MANAGE:ADMINS')
  @ApiOperation({ summary: 'Create new admin' })
  async create(@Body() dto: CreateAdminDto) {
    return this.adminsService.create(dto);
  }

  @Get(':id')
  @RequirePermissions('READ:ADMINS')
  @ApiOperation({ summary: 'Get admin by ID' })
  @ApiParam({ name: 'id', description: 'Admin ID' })
  async findOne(@Param('id') id: string) {
    return this.adminsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('MANAGE:ADMINS')
  @ApiOperation({ summary: 'Update admin' })
  @ApiParam({ name: 'id', description: 'Admin ID' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateAdminDto>,
  ) {
    return this.adminsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('MANAGE:ADMINS')
  @ApiOperation({ summary: 'Delete admin' })
  @ApiParam({ name: 'id', description: 'Admin ID' })
  async remove(@Param('id') id: string) {
    return this.adminsService.remove(id);
  }

  @Patch(':id/reset-password')
  @RequirePermissions('MANAGE:ADMINS')
  @ApiOperation({ summary: 'Reset admin password' })
  @ApiParam({ name: 'id', description: 'Admin ID' })
  async resetPassword(
    @Param('id') id: string,
    @Body('password') password: string,
  ) {
    return this.adminsService.resetPassword(id, password);
  }
}
