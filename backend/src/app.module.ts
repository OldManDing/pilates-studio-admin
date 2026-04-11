import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AdminsModule } from './modules/admins/admins.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { CoachesModule } from './modules/coaches/coaches.module';
import { CourseSessionsModule } from './modules/course-sessions/course-sessions.module';
import { CoursesModule } from './modules/courses/courses.module';
import { HealthModule } from './modules/health/health.module';
import { MembershipPlansModule } from './modules/membership-plans/membership-plans.module';
import { MembersModule } from './modules/members/members.module';
import { MiniUsersModule } from './modules/mini-users/mini-users.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RolesModule } from './modules/roles/roles.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TransactionsModule } from './modules/transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig]
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      useFactory: () => [{
        ttl: 60 * 1000,
        limit: 120,
      }],
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    AdminsModule,
    RolesModule,
    MembersModule,
    MembershipPlansModule,
    MiniUsersModule,
    NotificationsModule,
    CoachesModule,
    CoursesModule,
    CourseSessionsModule,
    BookingsModule,
    AttendanceModule,
    TransactionsModule,
    ReportsModule,
    SettingsModule,
    AnalyticsModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
