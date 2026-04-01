import type { FC, PropsWithChildren } from 'react';
import { Layout } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import cls from '@/styles/layout.module.css';

const AppLayout: FC<PropsWithChildren> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Layout className={cls.app}>
      <aside className={cls.sidebar}>
        <AppSidebar pathname={location.pathname} onNavigate={navigate} />
      </aside>
      <Layout className={cls.main}>
        <Layout.Content className={cls.content}>{children ?? <Outlet />}</Layout.Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
