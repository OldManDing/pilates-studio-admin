export const ADMIN_ACCESS_TOKEN_KEY = 'pilates_access_token';
export const ADMIN_REFRESH_TOKEN_KEY = 'pilates_refresh_token';
export const ADMIN_LAST_ACTIVITY_KEY = 'pilates_last_activity_at';

export const ADMIN_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const touchAdminSession = (timestamp = Date.now()) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(timestamp));
};

export const getAdminLastActivityAt = () => {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(ADMIN_LAST_ACTIVITY_KEY);
  const timestamp = raw ? Number(raw) : NaN;
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
};

export const hasAdminSessionTimedOut = (timestamp = Date.now()) => {
  const lastActivityAt = getAdminLastActivityAt();
  if (!lastActivityAt) return false;
  return timestamp - lastActivityAt >= ADMIN_SESSION_TIMEOUT_MS;
};

export const clearAdminSession = () => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
};
