import { Controller, Get, Put, Body, Post, Res, UploadedFile, UseInterceptors, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Get('export')
  @RequirePermissions('MANAGE:SETTINGS')
  @ApiOperation({ summary: 'Export data as JSON' })
  async exportData(@Res() res: Response) {
    const data = await this.settingsService.exportAllData();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `门店备份-${timestamp}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(JSON.stringify(data, null, 2));
  }

  @Post('restore')
  @RequirePermissions('MANAGE:SETTINGS')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Restore data from backup file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async restoreData(@UploadedFile() file: { buffer: Buffer } | undefined) {
    if (!file) {
      return { success: false, message: '未上传备份文件' };
    }
    try {
      const backupData = JSON.parse(file.buffer.toString('utf-8'));
      const result = await this.settingsService.restoreFromBackup(backupData);
      return result;
    } catch (error) {
      return { success: false, message: '备份文件格式无效' };
    }
  }
}
