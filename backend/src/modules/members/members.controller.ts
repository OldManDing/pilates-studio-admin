import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { QueryMembersDto } from './dto/query-members.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@ApiTags('Members')
@ApiBearerAuth()
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @RequirePermissions('WRITE:MEMBERS')
  @ApiOperation({ summary: 'Create new member' })
  async create(@Body() dto: CreateMemberDto) {
    return this.membersService.create(dto);
  }

  @Get()
  @RequirePermissions('READ:MEMBERS')
  @ApiOperation({ summary: 'Get all members with pagination' })
  async findAll(@Query() query: QueryMembersDto) {
    return this.membersService.findAll(query);
  }

  // Mini-program endpoints (member-facing) - must be before :id routes
  @Get('profile')
  @RequirePermissions('READ:MEMBERS')
  @ApiOperation({ summary: 'Get current member profile (mini-program)' })
  async getMyProfile(@CurrentUser('sub') userId: string) {
    return this.membersService.findByMiniUserId(userId);
  }

  @Get('my-memberships')
  @RequirePermissions('READ:MEMBERS')
  @ApiOperation({ summary: 'Get current member memberships (mini-program)' })
  async getMyMemberships(@CurrentUser('sub') userId: string) {
    return this.membersService.getMembershipsByMiniUserId(userId);
  }

  @Get(':id')
  @RequirePermissions('READ:MEMBERS')
  @ApiOperation({ summary: 'Get member by ID' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  async findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('WRITE:MEMBERS')
  @ApiOperation({ summary: 'Update member' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('MANAGE:MEMBERS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete member' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  async remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }

  @Get(':id/bookings')
  @RequirePermissions('READ:MEMBERS')
  @ApiOperation({ summary: 'Get member booking history' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  async getMemberBookings(@Param('id') id: string) {
    return this.membersService.getMemberBookings(id);
  }

  @Get(':id/transactions')
  @RequirePermissions('READ:MEMBERS')
  @ApiOperation({ summary: 'Get member transaction history' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  async getMemberTransactions(@Param('id') id: string) {
    return this.membersService.getMemberTransactions(id);
  }

  @Post(':id/credits')
  @RequirePermissions('WRITE:MEMBERS')
  @ApiOperation({ summary: 'Adjust member credits' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  async adjustCredits(
    @Param('id') id: string,
    @Body('amount', ParseIntPipe) amount: number,
  ) {
    return this.membersService.adjustCredits(id, amount);
  }
}
