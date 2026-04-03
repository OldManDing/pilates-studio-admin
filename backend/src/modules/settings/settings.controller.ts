import { Controller, Get, Put, Body, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { SettingsService } from './settings.service';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('studio')
  @RequirePermissions('READ:SETTINGS')
  @ApiOperation({ summary: 'Get studio settings' })
  async getStudioSettings() {
    return this.settingsService.getStudioSettings();
  }

  @Put('studio')
  @RequirePermissions('MANAGE:SETTINGS')
  @ApiOperation({ summary: 'Update studio settings' })
  async updateStudioSettings(@Body() dto: UpdateStudioDto) {
    return this.settingsService.updateStudioSettings(dto);
  }

  @Get('notifications')
  @RequirePermissions('READ:SETTINGS')
  @ApiOperation({ summary: 'Get notification settings' })
  async getNotificationSettings() {
    return this.settingsService.getNotificationSettings();
  }

  @Put('notifications')
  @RequirePermissions('MANAGE:SETTINGS')
  @ApiOperation({ summary: 'Update notification setting' })
  async updateNotificationSetting(@Body() dto: UpdateNotificationDto) {
    return this.settingsService.updateNotificationSetting(dto);
  }

  @Post('init')
  @RequirePermissions('MANAGE:SETTINGS')
  @ApiOperation({ summary: 'Initialize default settings' })
  async initializeSettings() {
    await this.settingsService.initializeDefaultSettings();
    return { success: true };
  }
}
