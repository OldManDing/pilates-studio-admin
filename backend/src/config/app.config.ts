export default () => ({
  app: {
    name: process.env.APP_NAME ?? 'pilates-studio-backend',
    port: Number(process.env.PORT ?? 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api',
  },
  cors: {
    origins: process.env.CORS_ORIGINS ?? '*',
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000), // 15 minutes
    maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100),
    authWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 300000), // 5 minutes
    authMaxRequests: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS ?? 10),
  },
  notifications: {
    expiryReminderDays: Number(process.env.NOTIFICATION_EXPIRY_REMINDER_DAYS ?? 3),
    bookingReminderMinutes: Number(process.env.NOTIFICATION_BOOKING_REMINDER_MINUTES ?? 60),
    processingBatchSize: Number(process.env.NOTIFICATION_PROCESSING_BATCH_SIZE ?? 50),
    templateIds: {
      bookingConfirmation: process.env.WECHAT_TEMPLATE_ID_BOOKING_CONFIRMATION ?? '',
      bookingCancelled: process.env.WECHAT_TEMPLATE_ID_BOOKING_CANCELLED ?? '',
      bookingReminder: process.env.WECHAT_TEMPLATE_ID_BOOKING_REMINDER ?? '',
      attendanceCheckedIn: process.env.WECHAT_TEMPLATE_ID_ATTENDANCE_CHECKED_IN ?? '',
      membershipExpiry: process.env.WECHAT_TEMPLATE_ID_MEMBERSHIP_EXPIRY ?? '',
    },
  },
  wechat: {
    appId: process.env.WECHAT_APPID ?? '',
    secret: process.env.WECHAT_SECRET ?? '',
  },
  email: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.SMTP_FROM ?? '',
  },
  analytics: {
    monthlyRevenueGoalCents: Number(process.env.ANALYTICS_MONTHLY_REVENUE_GOAL_CENTS ?? 5000000),
  },
});
