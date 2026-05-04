const MIN_SECRET_LENGTH = 32;

function resolveSecret(envName: string, devFallback: string) {
  const rawValue = process.env[envName];
  const value = rawValue && rawValue.trim() ? rawValue.trim() : devFallback;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && (!rawValue || value.length < MIN_SECRET_LENGTH)) {
    throw new Error(`${envName} must be set to at least ${MIN_SECRET_LENGTH} characters in production`);
  }

  return value;
}

export default () => {
  const accessSecret = resolveSecret(
    'JWT_ACCESS_SECRET',
    'local-development-access-secret-change-before-production',
  );
  const refreshSecret = resolveSecret(
    'JWT_REFRESH_SECRET',
    'local-development-refresh-secret-change-before-production',
  );

  if (process.env.NODE_ENV === 'production' && accessSecret === refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production');
  }

  return {
    auth: {
      accessSecret,
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      refreshSecret,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
      bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
    },
  };
};
