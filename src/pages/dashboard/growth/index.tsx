import { Progress } from 'antd';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import { memberTrend } from '@/mock';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { useNavigate } from 'react-router-dom';

export default function DashboardGrowthPage() {
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  const latest = memberTrend[memberTrend.length - 1];

  return (
    <div className={pageCls.page}>
      <PageHeader
        title="会员增长趋势明细"
        subtitle="用于仪表盘快速钻取，查看近 7 个月会员规模与活跃变化。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <SectionCard title="增长曲线" subtitle="总会员与活跃会员对比" extra={<ActionButton ghost onClick={() => go('/members')}>进入会员模块</ActionButton>}>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <AreaChart data={memberTrend}>
              <defs>
                <linearGradient id="growthTotalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#43c7ab" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#43c7ab" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="growthActiveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b7cff" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#8b7cff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#43c7ab" fill="url(#growthTotalGradient)" strokeWidth={3} />
              <Area type="monotone" dataKey="active" stroke="#8b7cff" fill="url(#growthActiveGradient)" strokeWidth={3} />
              <Line type="monotone" dataKey="active" stroke="#8b7cff" strokeWidth={3} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className={pageCls.summaryGrid}>
        <div className={widgetCls.metricCard}>
          <div className={widgetCls.metricLabel}>当前总会员</div>
          <div className={widgetCls.metricValue}>{latest.total}</div>
        </div>
        <div className={widgetCls.metricCard}>
          <div className={widgetCls.metricLabel}>当前活跃会员</div>
          <div className={widgetCls.metricValue}>{latest.active}</div>
        </div>
        <div className={widgetCls.metricCard}>
          <div className={widgetCls.metricLabel}>活跃率</div>
          <div className={widgetCls.metricValue}>{((latest.active / latest.total) * 100).toFixed(1)}%</div>
          <Progress percent={Number(((latest.active / latest.total) * 100).toFixed(1))} showInfo={false} strokeColor="#43c7ab" />
        </div>
      </div>
    </div>
  );
}
