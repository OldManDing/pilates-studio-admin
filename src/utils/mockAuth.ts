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

const ROLE_LABELS = {
  owner: '店长',
  frontdesk: '前台',
  coach: '教练',
  finance: '财务'
} as const;

export type DemoRole = keyof typeof ROLE_LABELS;

export type DemoSession = {
  name: string;
  account: string;
  loginAt: string;
  role: DemoRole;
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

const inferRoleFromAccount = (account: string): DemoRole => {
  const normalized = account.toLowerCase();

  if (normalized.includes('front') || normalized.includes('desk')) {
    return 'frontdesk';
  }

  if (normalized.includes('coach')) {
    return 'coach';
  }

  if (normalized.includes('finance')) {
    return 'finance';
  }

  return 'owner';
};

export const saveDemoSession = (account: string, password: string) => {
  if (!canUseStorage()) {
    return false;
  }

  if (!account.trim() || !password.trim()) {
    return false;
  }

  const role = inferRoleFromAccount(account);
  const session: DemoSession = {
    name: ROLE_LABELS[role],
    account: account.trim(),
    loginAt: new Date().toISOString(),
    role
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

export const canAccessDemoRoute = (pathname: string, session: DemoSession | null) => {
  if (!session) {
    return false;
  }

  if (pathname === '/roles') {
    return session.role === 'owner';
  }

  return true;
};

export const formatLoginTime = (loginAt: string) => {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(loginAt));
  } catch {
    return loginAt;
  }
};
