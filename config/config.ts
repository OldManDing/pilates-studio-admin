import { defineConfig } from 'umi';

export default defineConfig({
  npmClient: 'npm',
  favicons: ['/favicon.svg'],
  routes: [
    { path: '/login', component: '@/pages/login', layout: false },
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', component: '@/pages/dashboard' },
    { path: '/members', component: '@/pages/members' },
    { path: '/courses', component: '@/pages/courses' },
    { path: '/bookings', component: '@/pages/bookings' },
    { path: '/coaches', component: '@/pages/coaches' },
    { path: '/finance', component: '@/pages/finance' },
    { path: '/analytics', component: '@/pages/analytics' },
    { path: '/roles', component: '@/pages/roles' },
    { path: '/settings', component: '@/pages/settings' }
  ]
});
