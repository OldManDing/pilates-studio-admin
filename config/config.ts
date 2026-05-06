import { defineConfig } from 'umi';

export default defineConfig({
  npmClient: 'npm',
  favicons: ['/favicon.svg'],

  // Build settings
  base: process.env.PUBLIC_PATH || '/',
  publicPath: process.env.PUBLIC_PATH || '/',
  outputPath: process.env.OUTPUT_DIR || 'dist',
  hash: true,

  // Development proxy
  proxy: {
    '/api': {
      target: process.env.API_BASE_URL || 'http://localhost:3000',
      changeOrigin: true,
      pathRewrite: { '^/api': '/api' },
    },
  },

  // Define global constants
  define: {
    'process.env.API_BASE_URL': process.env.API_BASE_URL || '/api',
  },

  // Bundle analyze
  analyze: process.env.ANALYZE === 'true',

  // Code splitting
  codeSplitting: {
    jsStrategy: 'granularChunks',
  },

  // Performance
  fastRefresh: true,
  mfsu: false, // Disable in production if causing issues

  routes: [
    { path: '/login', component: '@/pages/login', layout: false },
    { path: '/forgot-password', component: '@/pages/forgot-password', layout: false },
    { path: '/403', component: '@/pages/forbidden', layout: false },
    { path: '/404', component: '@/pages/not-found', layout: false },
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', component: '@/pages/dashboard' },
    { path: '/members', component: '@/pages/members' },
    { path: '/membership-plans', component: '@/pages/membership-plans' },
    { path: '/mini-users', component: '@/pages/mini-users' },
    { path: '/courses', component: '@/pages/courses' },
    { path: '/schedule', component: '@/pages/schedule' },
    { path: '/bookings', component: '@/pages/bookings' },
    { path: '/attendance', component: '@/pages/attendance' },
    { path: '/coaches', component: '@/pages/coaches' },
    { path: '/finance', component: '@/pages/finance' },
    { path: '/analytics', component: '@/pages/analytics' },
    { path: '/notifications', component: '@/pages/notifications' },
    { path: '/knowledge', component: '@/pages/knowledge' },
    { path: '/admins', component: '@/pages/admins' },
    { path: '/roles', component: '@/pages/roles' },
    { path: '/settings', component: '@/pages/settings' },
    { path: '*', component: '@/pages/not-found', layout: false }
  ],
});
