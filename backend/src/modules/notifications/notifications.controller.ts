import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AllowMiniUser } from '../../common/decorators/allow-mini-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @RequirePermissions('WRITE:NOTIFICATIONS')
  @ApiOperation({ summary: 'Create a notification record' })
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Get()
  @RequirePermissions('READ:NOTIFICATIONS')
  @ApiOperation({ summary: 'Get notifications with pagination and filters' })
  async findAll(@Query() query: QueryNotificationDto) {
    return this.notificationsService.findAll(query);
  }

  @Get('my')
  @AllowMiniUser()
  @RequirePermissions('READ:NOTIFICATIONS')
  @ApiOperation({ summary: 'Get current mini-program user notifications' })
  async findMy(
    @CurrentUser('sub') miniUserId: string,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationsService.findMine(miniUserId, query);
  }

  @Patch('my/:id/read')
  @AllowMiniUser()
  @RequirePermissions('WRITE:NOTIFICATIONS')
  @ApiOperation({ summary: 'Mark current mini-program user notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async markMineAsRead(
    @CurrentUser('sub') miniUserId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markMineAsRead(miniUserId, id);
  }

  @Get(':id')
  @RequirePermissions('READ:NOTIFICATIONS')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id/read')
  @RequirePermissions('WRITE:NOTIFICATIONS')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}
