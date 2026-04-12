import { Progress, Spin, message } from 'antd';
import { useEffect, useState } from 'react';
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
  }, [messageApi]);

  const activeRate = summary.total ? Number(((summary.active / summary.total) * 100).toFixed(1)) : 0;

  if (loading) {
    return <div className={`${pageCls.page} ${pageCls.centeredState} ${pageCls.centeredStateTop}`}><Spin /></div>;
  }

  return (
    <div className={`${pageCls.page} ${pageCls.workPage}`}>
      {contextHolder}
      <PageHeader
        title="会员增长快捷入口"
        subtitle="仪表盘二级入口：用于快速查看增量与活跃度摘要，深入分析与跟进请进入会员管理。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <div className={pageCls.balancedTwoCol}>
        <SectionCard title="趋势摘要（快捷）" subtitle="仅展示可信汇总，作为进入会员模块前的判断依据。">
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>这页暂时不再伪造历史增长曲线，而是先把当前增量、活跃度和后续动作建议讲清楚，避免把估算值误判成真实趋势。</div>
              <span className={pageCls.sectionMetaPill}>真实汇总数据</span>
            </div>
          <div className={widgetCls.infoStack}>
            <div>本月新增会员 {summary.newMembersThisMonth} 位。</div>
            <div>当前总会员 {summary.total} 人，活跃会员 {summary.active} 人。</div>
            <div>活跃率 {activeRate}% ，建议结合预约到课率观察会员质量。</div>
          </div>
          </div>
        </SectionCard>

        <SectionCard title="建议动作（辅助）" subtitle="快捷页仅做决策提示，具体执行统一进入会员管理。">
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>把增长看板定位为行动前摘要，而不是完整分析页；深入跟进统一进入会员模块处理。</div>
              <span className={pageCls.sectionMetaPill}>行动导向</span>
            </div>
          <div className={widgetCls.infoStack}>
            <div>• 若活跃率下滑，优先跟进近期未到店会员。</div>
            <div>• 若总量增长但活跃不足，评估新会员转化策略。</div>
            <div>• 详细操作请进入会员模块执行。</div>
          </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="历史趋势说明" subtitle="当前仅展示已接入汇总数据，不作为独立分析模块。" extra={<ActionButton ghost onClick={() => go('/members')}>进入会员管理</ActionButton>}>
        <div className={pageCls.sectionContentStack}>
        <div className={pageCls.sectionSummaryRow}>
          <div className={pageCls.sectionSummaryText}>历史月度曲线将在会员历史数据同步后展示。当前页面不生成估算曲线，避免将推测走势误读为真实历史。</div>
          <span className={pageCls.sectionMetaPill}>仅展示真实汇总</span>
        </div>
        <div className={pageCls.chartPanelEmpty}>
          <div className={widgetCls.detailOverviewLead}>历史增长曲线暂不可用</div>
          <div className={widgetCls.detailOverviewText}>为保证信息可信度，当前仅保留已接入指标；历史趋势将在数据源可用后开放。</div>
        </div>
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
          <Progress percent={activeRate} showInfo={false} strokeColor="linear-gradient(90deg, var(--mint) 0%, var(--control-primary-end) 100%)" />
        </div>
      </div>
    </div>
  );
}
