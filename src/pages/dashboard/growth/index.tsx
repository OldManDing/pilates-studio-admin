import { Progress } from 'antd';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import { memberTrend } from '@/mock';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';

export default function DashboardGrowthPage() {
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  const latest = memberTrend[memberTrend.length - 1];
  const previous = memberTrend[memberTrend.length - 2];
  const delta = latest.total - previous.total;

  return (
    <div className={pageCls.page}>
      <PageHeader
        title="会员增长趋势"
        subtitle="从仪表盘快速放大会员趋势，聚焦增量、活跃率和近期变化节奏。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <div className={widgetCls.dashboardSubpageTag}>仪表盘子页 · 增长摘要</div>
      <div className={widgetCls.dashboardSubpageHint}>这里聚焦趋势判断和增长信号，不替代完整会员工作台；如果要处理会员详情、跟进或会籍状态，请进入会员模块。</div>

      <div className={pageCls.balancedTwoCol}>
        <SectionCard title="趋势摘要" subtitle="这是一层分析型子页，用来帮助你决定是否进入完整会员模块。">
          <div className={widgetCls.detailOverviewGrid}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.detailOverviewSummary}>
                <div className={widgetCls.detailInsightLabel}>本期结论</div>
                <div className={widgetCls.detailOverviewLead}>最近一个月新增 {delta} 位会员，当前总会员 {latest.total} 人，活跃会员 {latest.active} 人。</div>
                <div className={widgetCls.detailOverviewText}>这里更像 Dashboard 的分析延展页：帮助你快速判断增长节奏是否健康，而不是直接替代会员管理页做具体操作。</div>
              </div>
              <div className={widgetCls.chipRow}>
                <span className={widgetCls.chipPrimary}>总会员 {latest.total}</span>
                <span className={widgetCls.chip}>活跃会员 {latest.active}</span>
                <span className={widgetCls.chip}>净增长 {delta}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="建议动作" subtitle="以趋势判断为主，具体续费、跟进动作在会员模块完成。">
          <div className={widgetCls.infoStack}>
            <div>• 若活跃率连续下滑，应优先排查高频会员的到店与续费情况。</div>
            <div>• 若总量增长但活跃不足，说明新增会员转化质量仍有提升空间。</div>
            <div>• 需要查看会员详情、会籍状态或跟进记录时，进入完整会员模块处理。</div>
          </div>
        </SectionCard>
      </div>

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
