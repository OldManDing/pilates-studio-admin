import { Module } from '@nestjs/common';
import { CourseSessionsController } from './course-sessions.controller';
import { CourseSessionsService } from './course-sessions.service';

@Module({
  controllers: [CourseSessionsController],
  providers: [CourseSessionsService],
  exports: [CourseSessionsService],
})
export class CourseSessionsModule {}
