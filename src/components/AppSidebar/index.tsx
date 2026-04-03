import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import { DownOutlined, LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import cls from './index.module.css';
import { isOwnerOnlyPath, menuItems } from '@/utils/menu';
import { clearTokens } from '@/services/auth';
import { authApi } from '@/services/auth';

type Props = {
  pathname: string;
  onNavigate: (path: string) => void;
};

const AppSidebar: FC<Props> = ({ pathname, onNavigate }) => {
  const { message } = App.useApp();
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState<{ displayName: string; email: string; role: { code: string } } | null>(null);
  const [loginTime] = useState(() => new Date().toISOString());
  const accountWrapRef = useRef<HTMLDivElement | null>(null);
  const accountButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsActionRef = useRef<HTMLButtonElement | null>(null);
  const logoutActionRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const me = await authApi.getMe();
        setUser(me);
      } catch {
        // ignore
      }
    };
    fetchUser();
  }, []);

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

  const visibleMenuItems = menuItems.filter((item) => {
    if (!user) {
      return !isOwnerOnlyPath(item.key);
    }

    if (isOwnerOnlyPath(item.key)) {
      return user.role.code === 'OWNER';
    }

    return true;
  });

  const handleUserAction = (key: 'settings' | 'logout') => {
    if (key === 'settings') {
      setAccountOpen(false);
      onNavigate('/settings');
      return;
    }

    clearTokens();
    setAccountOpen(false);
    message.success('已退出登录');
    onNavigate('/login');
  };

  const formatLoginTime = (loginAt: string) => {
    try {
      return new Intl.DateTimeFormat('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(loginAt));
    } catch {
      return loginAt;
    }
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
          const active = pathname === item.key || (item.key === '/dashboard' && pathname.startsWith('/dashboard/'));
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
          <div className={cls.avatar}>{(user?.displayName ?? '管理员').slice(0, 1)}</div>
          <div className={cls.userContent}>
            <div className={cls.userNameRow}>
              <div className={cls.userName}>{user?.displayName ?? '管理员'}</div>
              <span className={cls.userRole}>{user?.role.code === 'OWNER' ? '最高权限' : '受限权限'}</span>
            </div>
            <div className={cls.userMetaRowCompact}>
              <div className={cls.userMeta}>{user?.email ?? 'admin@pilates.com'}</div>
              <div className={cls.userLoginMeta}>登录 {formatLoginTime(loginTime)}</div>
            </div>
          </div>
          <span className={cls.chevron}><DownOutlined /></span>
        </button>
        <div id="sidebar-account-panel" className={cls.accountPanel} aria-hidden={!accountOpen}>
          <div className={cls.accountPanelInner}>
            <button ref={settingsActionRef} type="button" className={cls.accountAction} onClick={() => handleUserAction('settings')}>
              <SettingOutlined />
              <span>前往系统设置</span>
            </button>
            <button
              ref={logoutActionRef}
              type="button"
              className={cls.accountAction}
              onClick={() => handleUserAction('logout')}
              onKeyDown={(event) => {
                if (event.key === 'Tab' && !event.shiftKey) {
                  event.preventDefault();
                  accountButtonRef.current?.focus();
                }
              }}
            >
              <LogoutOutlined />
              <span>退出当前账号</span>
            </button>
            <div className={cls.accountMetaRow}>
              <UserOutlined />
              <span>当前身份：{user?.displayName ?? '管理员'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSidebar;
