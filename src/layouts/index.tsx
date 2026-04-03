import type { FC, PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { Button, Drawer, Layout, Spin } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import cls from '@/styles/layout.module.css';
import { authApi, clearTokens } from '@/services/auth';
import { getSafeRedirectPath } from '@/utils/mockAuth';

const AppLayout: FC<PropsWithChildren> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ role: { code: string } } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('pilates_access_token');
      if (!token) {
        const nextPath = `${location.pathname}${location.search}${location.hash}`;
        navigate('/login', { replace: true, state: { from: nextPath } });
        setLoading(false);
        return;
      }

      try {
        const me = await authApi.getMe();
        setUser(me);
      } catch {
        clearTokens();
        navigate('/login', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [location.pathname, location.search, location.hash, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const canAccessRoute = (pathname: string) => {
    if (pathname === '/roles') {
      return user.role.code === 'OWNER';
    }
    return true;
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
        <AppSidebar pathname={location.pathname} onNavigate={handleNavigate} />
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
        <div className={cls.mobileTitleWrap}>
          <div className={cls.mobileTitle}>Pilates Studio</div>
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
        width={300}
        className={cls.mobileDrawer}
        rootClassName={cls.mobileDrawerRoot}
        closable={false}
      >
        <AppSidebar pathname={location.pathname} onNavigate={handleNavigate} />
      </Drawer>
    </Layout>
  );
};

export default AppLayout;
