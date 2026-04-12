const SAFE_REDIRECTS = new Set([
  '/dashboard',
  '/dashboard/bookings',
  '/dashboard/courses',
  '/dashboard/schedule',
  '/dashboard/growth',
  '/dashboard/finance-trend',
  '/members',
  '/courses',
  '/bookings',
  '/coaches',
  '/finance',
  '/analytics',
  '/roles',
  '/settings',
  '/notifications',
]);

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
