import type { FC, PropsWithChildren } from 'react';
import { useState } from 'react';
import { Button, Drawer, Layout } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import cls from '@/styles/layout.module.css';

const AppLayout: FC<PropsWithChildren> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
        width={308}
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
