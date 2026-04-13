const SAFE_REDIRECTS = new Set([
  '/dashboard',
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
