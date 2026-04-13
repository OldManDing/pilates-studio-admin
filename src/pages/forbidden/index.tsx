import { HomeOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import pageCls from '@/styles/page.module.css';
import cls from './index.module.css';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | undefined)?.from;

  return (
    <div className={pageCls.errorShell}>
      <div className={pageCls.errorPanel}>
        <EmptyState
          title="403 · 无权访问"
          description={from ? '当前账号没有访问该页面的权限。' : '当前账号没有访问此页面的权限。'}
          image={<div className={cls.iconWrap}><SafetyCertificateOutlined /></div>}
          surface={false}
          actionText="切换账号"
          onAction={() => navigate('/login', { replace: true })}
        />
        <div className={cls.actions}>
          <ActionButton icon={<HomeOutlined />} onClick={() => navigate('/dashboard', { replace: true })}>返回仪表盘</ActionButton>
        </div>
        <div className={cls.helper}>角色权限仅对具备相应权限的账号开放。</div>
      </div>
    </div>
  );
}
