import { Progress, Spin, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { reportsApi } from '@/services/reports';
import { getErrorMessage } from '@/utils/errors';

export default function DashboardGrowthPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, active: 0, newMembersThisMonth: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const report = await reportsApi.getMembers();
        setSummary({
          total: report.totalMembers || 0,
          active: report.activeMembers || 0,
          newMembersThisMonth: report.newMembersThisMonth || 0,
        });
      } catch (err) {
        messageApi.error(getErrorMessage(err, '加载会员增长数据失败，请稍后重试'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeRate = summary.total ? Number(((summary.active / summary.total) * 100).toFixed(1)) : 0;

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
        <SectionCard title="趋势摘要" subtitle="基于当前真实会员汇总数据">
          <div className={widgetCls.infoStack}>
            <div>本月新增会员 {summary.newMembersThisMonth} 位。</div>
            <div>当前总会员 {summary.total} 人，活跃会员 {summary.active} 人。</div>
            <div>活跃率 {activeRate}% ，建议结合预约到课率观察会员质量。</div>
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

      <SectionCard title="增长曲线" subtitle="待接入真实历史月度会员数据后展示" extra={<ActionButton ghost onClick={() => go('/members')}>进入会员模块</ActionButton>}>
        <div className={pageCls.chartPanelEmpty}>
          <div className={widgetCls.detailOverviewLead}>暂无真实会员历史增长曲线</div>
          <div className={widgetCls.detailOverviewText}>原先基于当前会员总量按线性比例生成的趋势曲线已移除，避免把估算走势误认为真实历史数据。</div>
        </div>
      </SectionCard>

      <div className={pageCls.summaryGrid}>
        <div className={widgetCls.metricCard}>
          <div className={widgetCls.metricLabel}>当前总会员</div>
          <div className={widgetCls.metricValue}>{summary.total}</div>
        </div>
        <div className={widgetCls.metricCard}>
          <div className={widgetCls.metricLabel}>当前活跃会员</div>
          <div className={widgetCls.metricValue}>{summary.active}</div>
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
