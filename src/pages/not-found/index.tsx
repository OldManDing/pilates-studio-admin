import { CompassOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import pageCls from '@/styles/page.module.css';
import cls from './index.module.css';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const authed = typeof window !== 'undefined' && Boolean(localStorage.getItem('pilates_access_token'));

  return (
    <div className={pageCls.errorShell}>
      <div className={pageCls.errorPanel}>
        <EmptyState
          title="404 · 页面不存在"
          description="你访问的页面不存在或已被移动。"
          image={<div className={cls.iconWrap}><CompassOutlined /></div>}
          surface={false}
          actionText={authed ? '返回仪表盘' : '前往登录页'}
          onAction={() => navigate(authed ? '/dashboard' : '/login', { replace: true })}
        />
        <div className={cls.actions}>
          {authed ? <ActionButton icon={<HomeOutlined />} onClick={() => navigate('/dashboard', { replace: true })}>返回仪表盘</ActionButton> : null}
        </div>
      </div>
    </div>
  );
}
