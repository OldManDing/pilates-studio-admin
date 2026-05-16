import { Controller, Get, Put, Body, Post, Res, UploadedFile, UseInterceptors, HttpCode, HttpStatus, Query, ForbiddenException, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AllowMiniUser } from '../../common/decorators/allow-mini-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { SkipAuth } from '../../common/decorators/skip-auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { UpdateMiniPageImageDto } from './dto/update-mini-page-image.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('studio')
  @SkipAuth()
  @AllowMiniUser()
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

  @Get('studio/location')
  @SkipAuth()
  @AllowMiniUser()
  @ApiOperation({ summary: 'Resolve studio location from address' })
  async geocodeStudioLocation(@Query('address') address: string) {
    return this.settingsService.geocodeStudioLocation(address);
  }

  @Get('mini-page-images')
  @SkipAuth()
  @ApiOperation({ summary: 'Get mini-program page image settings' })
  async getMiniPageImages(
    @Query('compact') compact?: string,
    @Query('pageKey') pageKey?: string,
  ) {
    return this.settingsService.getMiniPageImages({
      compact: compact === 'true' || compact === '1',
      pageKey: pageKey?.trim() || undefined,
    });
  }

  @Put('mini-page-images/:pageKey')
  @RequirePermissions('MANAGE:SETTINGS')
  @ApiOperation({ summary: 'Update mini-program page image setting' })
  async updateMiniPageImage(
    @Param('pageKey') pageKey: string,
    @Body() dto: UpdateMiniPageImageDto,
  ) {
    return this.settingsService.updateMiniPageImage(pageKey, dto);
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
  async exportData(
    @Query('range') range: string | undefined,
    @CurrentUser('role') role: { code?: string } | undefined,
    @Res() res: Response,
  ) {
    if ((!range || range === '全部') && role?.code !== 'OWNER') {
      throw new ForbiddenException('Only owner can export full backups');
    }

    const data = await this.settingsService.exportAllData(range);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `store-backup-${timestamp}.json`;
    const encodedFileName = encodeURIComponent(`门店备份-${range || '全部'}-${timestamp}.json`);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`);
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
  async restoreData(
    @CurrentUser('role') role: { code?: string } | undefined,
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ) {
    if (role?.code !== 'OWNER') {
      throw new ForbiddenException('Only owner can restore backups');
    }

    if (!file) {
      return { success: false, message: '未上传备份文件' };
    }
    try {
      const backupData = JSON.parse(file.buffer.toString('utf-8'));
      const result = await this.settingsService.restoreFromBackup(backupData);
      return result;
    } catch {
      return { success: false, message: '备份文件格式无效' };
    }
  }
}
