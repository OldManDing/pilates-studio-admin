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
          description={from ? '当前账号没有访问该页面的权限，请使用具备权限的账号重新登录，或先返回仪表盘继续查看其他内容。' : '当前账号没有访问此页面的权限，请使用具备权限的账号重新登录，或先返回仪表盘继续查看其他内容。'}
          image={<div className={cls.iconWrap}><SafetyCertificateOutlined /></div>}
          actionText="返回仪表盘"
          onAction={() => navigate('/dashboard', { replace: true })}
        />
        <div className={cls.actions}>
          <ActionButton ghost onClick={() => navigate('/login', { replace: true })}>使用其他账号登录</ActionButton>
          <ActionButton icon={<HomeOutlined />} onClick={() => navigate('/dashboard', { replace: true })}>返回首页</ActionButton>
        </div>
        <div className={cls.helper}>提示：角色权限页仅对“店长”预览账号开放，其他页面会根据预览身份展示不同入口。</div>
      </div>
    </div>
  );
}
