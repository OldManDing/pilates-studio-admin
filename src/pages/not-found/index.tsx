import { CompassOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import cls from './index.module.css';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const authed = typeof window !== 'undefined' && Boolean(localStorage.getItem('pilates_access_token'));

  return (
    <div className={cls.shell}>
      <div className={cls.panel}>
        <EmptyState
          title="404 · 页面不存在"
          description="你访问的页面可能已被移动、删除，或当前演示路由中并不存在。"
          image={<div className={cls.iconWrap}><CompassOutlined /></div>}
          actionText={authed ? '返回仪表盘' : '前往登录页'}
          onAction={() => navigate(authed ? '/dashboard' : '/login', { replace: true })}
        />
        <div className={cls.actions}>
          <ActionButton ghost onClick={() => navigate('/login', { replace: true })}>前往登录页</ActionButton>
          <ActionButton icon={<HomeOutlined />} onClick={() => navigate('/dashboard', { replace: true })}>返回仪表盘</ActionButton>
        </div>
      </div>
    </div>
  );
}
