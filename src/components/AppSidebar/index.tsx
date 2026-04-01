import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { App, Space } from 'antd';
import { DownOutlined, LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import cls from './index.module.css';
import { isOwnerOnlyPath, menuItems } from '@/utils/menu';
import { clearDemoSession, formatLoginTime, getDemoSession } from '@/utils/mockAuth';

type Props = {
  pathname: string;
  onNavigate: (path: string) => void;
};

const AppSidebar: FC<Props> = ({ pathname, onNavigate }) => {
  const session = getDemoSession();
  const { message } = App.useApp();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!accountWrapRef.current) {
        return;
      }

      if (!accountWrapRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const visibleMenuItems = menuItems.filter((item) => {
    if (!session) {
      return !isOwnerOnlyPath(item.key);
    }

    if (isOwnerOnlyPath(item.key)) {
      return session.role === 'owner';
    }

    return true;
  });

  const handleUserAction = (key: 'settings' | 'logout') => {
    if (key === 'settings') {
      setAccountOpen(false);
      onNavigate('/settings');
      return;
    }

    clearDemoSession();
    setAccountOpen(false);
    message.success('已退出当前演示账号');
    onNavigate('/login');
  };

  return (
    <div className={cls.wrapper}>
      <div className={cls.brand}>
        <div className={cls.logo}>P</div>
        <div>
          <div className={cls.brandTitle}>Pilates Studio</div>
          <div className={cls.brandMeta}>高端门店管理系统</div>
        </div>
      </div>

      <div className={cls.menu}>
        {visibleMenuItems.map((item) => {
          const active = pathname === item.key;
          return (
            <div
              key={item.key}
              className={`${cls.item} ${active ? cls.active : ''}`}
              onClick={() => onNavigate(item.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onNavigate(item.key);
                }
              }}
            >
              <div className={cls.icon}>{item.icon}</div>
              <div>
                <div className={cls.label}>{item.label}</div>
                <div className={cls.desc}>{item.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div ref={accountWrapRef} className={`${cls.accountWrap} ${accountOpen ? cls.accountOpen : ''}`}>
        <button
          type="button"
          className={cls.userCard}
          aria-expanded={accountOpen}
          aria-controls="sidebar-account-panel"
          onClick={() => setAccountOpen((value) => !value)}
        >
          <div className={cls.avatar}>{(session?.name ?? '管理员').slice(0, 1)}</div>
          <div>
            <div className={cls.userNameRow}>
              <div className={cls.userName}>{session?.name ?? '管理员'}</div>
              <span className={cls.userRole}>{session?.role === 'owner' ? '最高权限' : '演示账号'}</span>
            </div>
            <div className={cls.userMeta}>{session?.account ?? 'admin@pilates.com'}</div>
            <div className={cls.userHint}>
              <Space size={6}>
                <span>登录于 {session ? formatLoginTime(session.loginAt) : '--'}</span>
                <span>·</span>
                <span>点击查看账户操作</span>
              </Space>
            </div>
          </div>
          <span className={cls.chevron}><DownOutlined /></span>
        </button>
        <div id="sidebar-account-panel" className={cls.accountPanel} aria-hidden={!accountOpen}>
          <div className={cls.accountPanelInner}>
            <button type="button" className={cls.accountAction} onClick={() => handleUserAction('settings')}>
              <SettingOutlined />
              <span>前往系统设置</span>
            </button>
            <button type="button" className={cls.accountAction} onClick={() => handleUserAction('logout')}>
              <LogoutOutlined />
              <span>退出当前演示账号</span>
            </button>
            <div className={cls.accountMetaRow}>
              <UserOutlined />
              <span>当前身份：{session?.name ?? '管理员'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSidebar;
