import { defineConfig } from 'umi';

export default defineConfig({
  npmClient: 'npm',
  favicons: ['/favicon.svg'],
  routes: [
    { path: '/login', component: '@/pages/login', layout: false },
    { path: '/forgot-password', component: '@/pages/forgot-password', layout: false },
    { path: '/403', component: '@/pages/forbidden', layout: false },
    { path: '/404', component: '@/pages/not-found', layout: false },
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', component: '@/pages/dashboard' },
    { path: '/dashboard/bookings', component: '@/pages/dashboard/bookings' },
    { path: '/dashboard/schedule', component: '@/pages/dashboard/schedule' },
    { path: '/dashboard/finance-trend', component: '@/pages/dashboard/finance-trend' },
    { path: '/members', component: '@/pages/members' },
    { path: '/courses', component: '@/pages/courses' },
    { path: '/bookings', component: '@/pages/bookings' },
    { path: '/coaches', component: '@/pages/coaches' },
    { path: '/finance', component: '@/pages/finance' },
    { path: '/analytics', component: '@/pages/analytics' },
    { path: '/roles', component: '@/pages/roles' },
    { path: '/settings', component: '@/pages/settings' },
    { path: '*', component: '@/pages/not-found', layout: false }
  ]
});
