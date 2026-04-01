import type { FC } from 'react';
import cls from './index.module.css';
import { menuItems } from '@/utils/menu';
import { clearDemoSession, getDemoSession } from '@/utils/mockAuth';

type Props = {
  pathname: string;
  onNavigate: (path: string) => void;
};

const AppSidebar: FC<Props> = ({ pathname, onNavigate }) => {
  const session = getDemoSession();

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
        {menuItems.map((item) => {
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

      <div className={cls.userCard}>
        <div className={cls.avatar}>{(session?.name ?? '管理员').slice(0, 1)}</div>
        <div>
          <div className={cls.userName}>{session?.name ?? '管理员'}</div>
          <div className={cls.userMeta}>{session?.account ?? 'admin@pilates.com'}</div>
        </div>
        <button
          type="button"
          className={cls.logout}
          onClick={() => {
            clearDemoSession();
            onNavigate('/login');
          }}
        >
          退出
        </button>
      </div>
    </div>
  );
};

export default AppSidebar;
