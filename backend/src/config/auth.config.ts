export default () => ({
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'access-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10)
  }
});
