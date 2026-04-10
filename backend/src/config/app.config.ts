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
});
