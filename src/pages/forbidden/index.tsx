import { HomeOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import cls from './index.module.css';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | undefined)?.from;

  return (
    <div className={cls.shell}>
      <div className={cls.panel}>
        <EmptyState
          title="403 · 无权访问"
          description={from ? `当前账号没有权限访问 ${from}，请切换具备权限的演示角色或返回首页。` : '当前账号没有访问此页面的权限，请联系管理员或切换具备权限的演示角色。'}
          image={<div className={cls.iconWrap}><SafetyCertificateOutlined /></div>}
          actionText="返回仪表盘"
          onAction={() => navigate('/dashboard', { replace: true })}
        />
        <div className={cls.actions}>
          <ActionButton ghost onClick={() => navigate('/login', { replace: true })}>切换演示账号</ActionButton>
          <ActionButton icon={<HomeOutlined />} onClick={() => navigate('/dashboard', { replace: true })}>返回首页</ActionButton>
        </div>
      </div>
    </div>
  );
}
