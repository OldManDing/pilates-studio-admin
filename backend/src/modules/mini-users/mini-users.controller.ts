import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CreateMiniUserDto } from './dto/create-mini-user.dto';
import { QueryMiniUserDto } from './dto/query-mini-user.dto';
import { UpdateMiniUserDto } from './dto/update-mini-user.dto';
import { MiniUsersService } from './mini-users.service';

@ApiTags('Mini Users')
@ApiBearerAuth()
@Controller('mini-users')
export class MiniUsersController {
  constructor(private readonly miniUsersService: MiniUsersService) {}

  @Post()
  @RequirePermissions('WRITE:MINI_USERS')
  @ApiOperation({ summary: 'Create a mini-program user' })
  async create(@Body() dto: CreateMiniUserDto) {
    return this.miniUsersService.create(dto);
  }

  @Get()
  @RequirePermissions('READ:MINI_USERS')
  @ApiOperation({ summary: 'Get all mini-program users' })
  async findAll(@Query() query: QueryMiniUserDto) {
    return this.miniUsersService.findAll(query);
  }

  @Get('openid/:openId')
  @RequirePermissions('READ:MINI_USERS')
  @ApiOperation({ summary: 'Find mini-program user by OpenID' })
  async findByOpenId(@Param('openId') openId: string) {
    return this.miniUsersService.findByOpenId(openId);
  }

  @Get(':id')
  @RequirePermissions('READ:MINI_USERS')
  @ApiOperation({ summary: 'Get mini-program user by ID' })
  @ApiParam({ name: 'id', description: 'Mini user ID' })
  async findOne(@Param('id') id: string) {
    return this.miniUsersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('WRITE:MINI_USERS')
  @ApiOperation({ summary: 'Update mini-program user' })
  @ApiParam({ name: 'id', description: 'Mini user ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateMiniUserDto) {
    return this.miniUsersService.update(id, dto);
  }

  @Post(':id/enable')
  @RequirePermissions('WRITE:MINI_USERS')
  @ApiOperation({ summary: 'Enable mini-program user' })
  @ApiParam({ name: 'id', description: 'Mini user ID' })
  async enable(@Param('id') id: string) {
    return this.miniUsersService.enable(id);
  }

  @Post(':id/disable')
  @RequirePermissions('WRITE:MINI_USERS')
  @ApiOperation({ summary: 'Disable mini-program user' })
  @ApiParam({ name: 'id', description: 'Mini user ID' })
  async disable(@Param('id') id: string) {
    return this.miniUsersService.disable(id);
  }

  @Get(':id/member')
  @RequirePermissions('READ:MINI_USERS')
  @ApiOperation({ summary: 'Get linked member for mini-program user' })
  @ApiParam({ name: 'id', description: 'Mini user ID' })
  async getLinkedMember(@Param('id') id: string) {
    return this.miniUsersService.getLinkedMember(id);
  }

  @Post(':id/link-member')
  @RequirePermissions('WRITE:MINI_USERS')
  @ApiOperation({ summary: 'Link mini-program user to member' })
  @ApiParam({ name: 'id', description: 'Mini user ID' })
  async linkMember(@Param('id') id: string, @Body('memberId') memberId: string) {
    return this.miniUsersService.linkMember(id, memberId);
  }

  @Get(':id/status')
  @RequirePermissions('READ:MINI_USERS')
  @ApiOperation({ summary: 'Get mini-program user status summary' })
  @ApiParam({ name: 'id', description: 'Mini user ID' })
  async getStatus(@Param('id') id: string) {
    return this.miniUsersService.getStatus(id);
  }
}
