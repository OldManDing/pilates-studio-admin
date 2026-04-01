const SESSION_KEY = 'pilates-admin-demo-session';
const SAFE_REDIRECTS = new Set([
  '/dashboard',
  '/members',
  '/courses',
  '/bookings',
  '/coaches',
  '/finance',
  '/analytics',
  '/roles',
  '/settings'
]);

export type DemoSession = {
  name: string;
  account: string;
  loginAt: string;
};

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const getDemoSession = (): DemoSession | null => {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DemoSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const isDemoAuthed = () => Boolean(getDemoSession());

export const saveDemoSession = (account: string, password: string) => {
  if (!canUseStorage()) {
    return false;
  }

  if (!account.trim() || !password.trim()) {
    return false;
  }

  const session: DemoSession = {
    name: '管理员',
    account: account.trim(),
    loginAt: new Date().toISOString()
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return true;
};

export const clearDemoSession = () => {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(SESSION_KEY);
};

export const getSafeRedirectPath = (target?: string) => {
  if (!target) {
    return '/dashboard';
  }

  if (!target.startsWith('/')) {
    return '/dashboard';
  }

  const url = new URL(target, 'http://localhost');
  if (!SAFE_REDIRECTS.has(url.pathname)) {
    return '/dashboard';
  }

  return `${url.pathname}${url.search}${url.hash}`;
};
