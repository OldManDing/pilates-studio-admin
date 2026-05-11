import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequireAnyPermissions } from '../../common/decorators/require-any-permissions.decorator';
import { UploadsService, ImageUploadPurpose, UploadedImageFile } from './uploads.service';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('images')
  @RequireAnyPermissions('MANAGE:SETTINGS', 'WRITE:COURSES', 'WRITE:COACHES')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: Number(process.env.IMAGE_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024),
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload, optimize, and store an image' })
  @ApiQuery({ name: 'purpose', required: false, enum: ['miniPageHero', 'studio', 'courseCover', 'coachAvatar', 'generic'] })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  async uploadImage(
    @UploadedFile() file: UploadedImageFile | undefined,
    @Query('purpose') purpose: ImageUploadPurpose = 'generic',
  ) {
    if (!file) {
      throw new BadRequestException('未上传图片文件');
    }

    return this.uploadsService.uploadImage(file, purpose);
  }
}
