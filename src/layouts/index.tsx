import type { FC, PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { Button, Drawer, Layout, Spin, message } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import cls from '@/styles/layout.module.css';
import { MOBILE_SIDEBAR_DRAWER_WIDTH } from '@/styles/dimensions';
import { authApi, clearTokens, type AuthResponse } from '@/services/auth';
import { settingsApi, type StudioSetting } from '@/services/settings';
import {
  ADMIN_ACCESS_TOKEN_KEY,
  ADMIN_LAST_ACTIVITY_KEY,
  ADMIN_SESSION_TIMEOUT_MS,
  clearAdminSession,
  getAdminLastActivityAt,
  hasAdminSessionTimedOut,
  touchAdminSession,
} from '@/utils/session';
import { hasRequiredPermissions, isOwnerOnlyPath, routePermissionMap } from '@/utils/menu';

const SESSION_ACTIVITY_EVENTS = ['click', 'keydown', 'pointerdown', 'scroll', 'touchstart'] as const;

const AppLayout: FC<PropsWithChildren> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [studioBrand, setStudioBrand] = useState<Pick<StudioSetting, 'studioName' | 'imageUrl'> | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY);
      if (!token) {
        const nextPath = `${location.pathname}${location.search}${location.hash}`;
        navigate('/login', { replace: true, state: { from: nextPath } });
        setLoading(false);
        return;
      }

      try {
        const [me, studio] = await Promise.all([
          authApi.getMe(),
          settingsApi.getStudio().catch(() => null),
        ]);
        setUser(me);
        setStudioBrand(studio ? {
          studioName: studio.studioName,
          imageUrl: studio.imageUrl,
        } : null);
      } catch {
        clearTokens();
        navigate('/login', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [location.pathname, location.search, location.hash, navigate]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    if (!getAdminLastActivityAt()) {
      touchAdminSession();
    }

    let timeoutId: number | undefined;
    let hasRedirected = false;

    const redirectForTimeout = () => {
      if (hasRedirected) return;
      hasRedirected = true;
      clearAdminSession();
      message.warning('会话已超时，请重新登录');
      const nextPath = `${location.pathname}${location.search}${location.hash}`;
      navigate('/login', { replace: true, state: { from: nextPath } });
    };

    const scheduleTimeoutCheck = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      const lastActivityAt = getAdminLastActivityAt() ?? Date.now();
      const remaining = Math.max(0, ADMIN_SESSION_TIMEOUT_MS - (Date.now() - lastActivityAt));
      timeoutId = window.setTimeout(() => {
        if (hasAdminSessionTimedOut()) {
          redirectForTimeout();
        } else {
          scheduleTimeoutCheck();
        }
      }, remaining || 1);
    };

    const handleActivity = () => {
      if (hasAdminSessionTimedOut()) {
        redirectForTimeout();
        return;
      }

      touchAdminSession();
      scheduleTimeoutCheck();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === ADMIN_ACCESS_TOKEN_KEY && !event.newValue) {
        redirectForTimeout();
      }

      if (event.key === ADMIN_LAST_ACTIVITY_KEY) {
        scheduleTimeoutCheck();
      }
    };

    SESSION_ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    window.addEventListener('storage', handleStorage);
    scheduleTimeoutCheck();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      SESSION_ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.removeEventListener('storage', handleStorage);
    };
  }, [location.hash, location.pathname, location.search, navigate, user]);

  if (loading) {
    return (
      <div className={cls.loadingWrap}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const canAccessRoute = (pathname: string) => {
    if (user?.role.code === 'OWNER') {
      return true;
    }

    if (isOwnerOnlyPath(pathname)) {
      return false;
    }

    return hasRequiredPermissions(user?.role.permissions || [], routePermissionMap[pathname]);
  };

  if (!canAccessRoute(location.pathname)) {
    navigate('/403', { replace: true, state: { from: location.pathname } });
    return null;
  }

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileSidebarOpen(false);
  };

  return (
    <Layout className={cls.app}>
      <aside className={cls.sidebar}>
        <AppSidebar pathname={location.pathname} onNavigate={handleNavigate} user={user} brandName={studioBrand?.studioName} brandImageUrl={studioBrand?.imageUrl} />
      </aside>
      <div className={cls.mobileHeader}>
        <Button
          className={cls.mobileMenuButton}
          type="default"
          icon={<MenuOutlined />}
          onClick={() => setMobileSidebarOpen(true)}
        >
          菜单
        </Button>
        <div className={cls.mobileLogo}>
          {studioBrand?.imageUrl ? <img src={studioBrand.imageUrl} alt={`${studioBrand.studioName || '工作室'}标识`} /> : '愈'}
        </div>
        <div className={cls.mobileTitleWrap}>
          <div className={cls.mobileTitle}>{studioBrand?.studioName || '愈己CareMe工作室'}</div>
          <div className={cls.mobileSubtitle}>高端门店管理系统</div>
        </div>
      </div>
      <Layout className={cls.main}>
        <Layout.Content className={cls.content}>{children ?? <Outlet />}</Layout.Content>
      </Layout>
      <Drawer
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        placement="left"
        width={MOBILE_SIDEBAR_DRAWER_WIDTH}
        className={cls.mobileDrawer}
        rootClassName={cls.mobileDrawerRoot}
        closable={false}
      >
        <AppSidebar pathname={location.pathname} onNavigate={handleNavigate} user={user} brandName={studioBrand?.studioName} brandImageUrl={studioBrand?.imageUrl} />
      </Drawer>
    </Layout>
  );
};

export default AppLayout;
