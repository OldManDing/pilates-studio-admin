import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('READ:ROLES')
  @ApiOperation({ summary: 'Get all roles' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @RequirePermissions('MANAGE:ROLES')
  @ApiOperation({ summary: 'Create new role' })
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get('permissions')
  @RequirePermissions('READ:ROLES')
  @ApiOperation({ summary: 'Get all permissions' })
  async findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Get(':id')
  @RequirePermissions('READ:ROLES')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post(':id/permissions')
  @RequirePermissions('MANAGE:ROLES')
  @ApiOperation({ summary: 'Assign permissions to role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  async assignPermissions(
    @Param('id') id: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.rolesService.assignPermissions(id, permissionIds);
  }

  @Post('init')
  @RequirePermissions('MANAGE:ROLES')
  @ApiOperation({ summary: 'Initialize default roles and permissions' })
  async initializeRoles() {
    await this.rolesService.initializeDefaultRoles();
    return { success: true };
  }
}
