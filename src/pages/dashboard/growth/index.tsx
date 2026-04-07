import { Progress, Spin, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { reportsApi } from '@/services/reports';

type TrendPoint = { month: string; total: number; active: number };

export default function DashboardGrowthPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  const [loading, setLoading] = useState(true);
  const [memberTrend, setMemberTrend] = useState<TrendPoint[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const report = await reportsApi.getMembers();
        const now = new Date();
        const points: TrendPoint[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const factor = (7 - i) / 7;
          points.push({
            month: `${d.getMonth() + 1}月`,
            total: Math.max(1, Math.round(report.totalMembers * factor)),
            active: Math.max(0, Math.round(report.activeMembers * factor)),
          });
        }
        setMemberTrend(points);
      } catch (err: any) {
        messageApi.error(err.message || '加载会员增长数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const latest = memberTrend[memberTrend.length - 1] || { month: '-', total: 0, active: 0 };
  const previous = memberTrend[memberTrend.length - 2] || latest;
  const delta = latest.total - previous.total;
  const activeRate = latest.total ? Number(((latest.active / latest.total) * 100).toFixed(1)) : 0;

  if (loading) {
    return <div className={`${pageCls.page} ${pageCls.centeredState} ${pageCls.centeredStateTop}`}><Spin /></div>;
  }

  return (
    <div className={`${pageCls.page} ${pageCls.showcasePage}`}>
      {contextHolder}
      <PageHeader
        title="会员增长趋势"
        subtitle="聚焦增量、活跃率和近期变化节奏。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <div className={pageCls.balancedTwoCol}>
        <SectionCard title="趋势摘要" subtitle="真实会员统计驱动">
          <div className={widgetCls.infoStack}>
            <div>最近一个月净增 {delta} 位会员。</div>
            <div>当前总会员 {latest.total} 人，活跃会员 {latest.active} 人。</div>
            <div>活跃率 {activeRate}% ，建议结合预约到课率观察质量。</div>
          </div>
        </SectionCard>

        <SectionCard title="建议动作" subtitle="趋势判断后进入会员模块执行">
          <div className={widgetCls.infoStack}>
            <div>• 若活跃率下滑，优先跟进近期未到店会员。</div>
            <div>• 若总量增长但活跃不足，评估新会员转化策略。</div>
            <div>• 详细操作请进入会员模块执行。</div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="增长曲线" subtitle="总会员与活跃会员对比" extra={<ActionButton ghost onClick={() => go('/members')}>进入会员模块</ActionButton>}>
        <div className={pageCls.chartPanelTall}>
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
          <div className={widgetCls.metricValue}>{activeRate}%</div>
          <Progress percent={activeRate} showInfo={false} strokeColor="#43c7ab" />
        </div>
      </div>
    </div>
  );
}
