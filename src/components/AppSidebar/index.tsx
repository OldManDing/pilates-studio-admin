import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import { DownOutlined, LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import cls from './index.module.css';
import { hasRequiredPermissions, menuItems } from '@/utils/menu';
import { authApi, clearTokens, type AuthResponse } from '@/services/auth';

type Props = {
  pathname: string;
  onNavigate: (path: string) => void;
  user: AuthResponse['user'];
};

const groupLabelMap = {
  operations: '高频工作',
  insights: '分析与复盘',
  admin: '系统配置',
} as const;

const AppSidebar: FC<Props> = ({ pathname, onNavigate, user }) => {
  const { message } = App.useApp();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountWrapRef = useRef<HTMLDivElement | null>(null);
  const accountButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsActionRef = useRef<HTMLButtonElement | null>(null);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!accountOpen) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [accountOpen]);

  useEffect(() => {
    if (accountOpen) {
      settingsActionRef.current?.focus();
    }
  }, [accountOpen]);

  const visibleMenuItems = menuItems.filter((item) => user.role.code === 'OWNER' || hasRequiredPermissions(user.role.permissions || [], item.requiredPermissions));

  const groupedMenuItems = visibleMenuItems.reduce<Record<string, typeof visibleMenuItems>>((groups, item) => {
    groups[item.group] = groups[item.group] || [];
    groups[item.group].push(item);
    return groups;
  }, {});

  const handleUserAction = async (key: 'settings' | 'logout') => {
    if (key === 'settings') {
      setAccountOpen(false);
      onNavigate('/settings');
      return;
    }

    try {
      await authApi.logout();
    } catch {
      // 忽略登出接口失败，仍执行本地会话清理
    }
    clearTokens();
    setAccountOpen(false);
    message.success('已退出登录');
    onNavigate('/login');
  };

  return (
    <div className={cls.wrapper}>
      <div className={cls.brand}>
        <div className={cls.logo}>愈</div>
        <div>
          <div className={cls.brandTitle}>愈己CareMe工作室</div>
          <div className={cls.brandMeta}>高端门店管理系统</div>
        </div>
      </div>

      <div className={cls.menu}>
        {(Object.keys(groupLabelMap) as Array<keyof typeof groupLabelMap>).map((groupKey) => {
          const items = groupedMenuItems[groupKey] || [];
          if (!items.length) return null;

          return (
            <div key={groupKey} className={cls.menuGroup}>
              <div className={cls.menuGroupLabel}>{groupLabelMap[groupKey]}</div>
              {items.map((item) => {
                const active = pathname === item.key || (item.key === '/dashboard' && pathname.startsWith('/dashboard/'));
                return (
                  <Link
                    key={item.key}
                    to={item.key}
                    aria-current={active ? 'page' : undefined}
                    className={`${cls.item} ${active ? cls.active : ''}`}
                    onClick={(event) => {
                      event.preventDefault();
                      onNavigate(item.key);
                    }}
                  >
                    <div className={cls.icon}>{item.icon}</div>
                    <div>
                      <div className={cls.label}>{item.label}</div>
                      <div className={cls.desc}>{item.description}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      <div ref={accountWrapRef} className={`${cls.accountWrap} ${accountOpen ? cls.accountOpen : ''}`}>
        <button
          ref={accountButtonRef}
          type="button"
          className={cls.userCard}
          aria-expanded={accountOpen}
          aria-controls="sidebar-account-panel"
          onClick={() => setAccountOpen((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && !accountOpen) {
              event.preventDefault();
              setAccountOpen(true);
            }
          }}
        >
          <div className={cls.avatar}>{user.displayName.slice(0, 1)}</div>
          <div className={cls.userContent}>
            <div className={cls.userNameRow}>
              <div className={cls.userName}>{user.displayName}</div>
              <span className={cls.userRole}>{user.role.code === 'OWNER' ? '最高权限' : '受限权限'}</span>
            </div>
            <div className={cls.userMetaRowCompact}>
              <div className={cls.userMeta}>{user.email}</div>
              <div className={cls.userLoginMeta}>当前会话</div>
            </div>
          </div>
          <span className={cls.chevron}><DownOutlined /></span>
        </button>
        <div id="sidebar-account-panel" className={cls.accountPanel} aria-hidden={!accountOpen}>
          <div className={cls.accountPanelInner}>
            <button
              ref={settingsActionRef}
              type="button"
              className={cls.accountAction}
              tabIndex={accountOpen ? 0 : -1}
               onClick={() => { void handleUserAction('settings'); }}
            >
              <SettingOutlined />
              <span>前往系统设置</span>
            </button>
            <button
              type="button"
              className={cls.accountAction}
              tabIndex={accountOpen ? 0 : -1}
               onClick={() => { void handleUserAction('logout'); }}
            >
              <LogoutOutlined />
              <span>退出当前账号</span>
            </button>
            <div className={cls.accountMetaRow}>
              <UserOutlined />
              <span>当前身份：{user.displayName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSidebar;
