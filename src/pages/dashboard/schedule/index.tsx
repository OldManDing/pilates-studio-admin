import { useEffect, useMemo, useState } from 'react';
import { Button, Spin, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import { coachesApi, type Coach } from '@/services/coaches';
import { getErrorMessage } from '@/utils/errors';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import type { AccentTone } from '@/types';

type ScheduleCard = {
  id: string;
  name: string;
  status: Coach['status'];
  statusText: string;
  specialtyText: string;
  coverageText: string;
  tone: AccentTone;
};

const tones: AccentTone[] = ['mint', 'violet', 'orange', 'pink'];

const coachStatusLabelMap: Record<Coach['status'], string> = {
  ACTIVE: '在职',
  ON_LEAVE: '休假中',
  INACTIVE: '停用',
};

export default function DashboardSchedulePage() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  const [loading, setLoading] = useState(true);
  const [scheduleCards, setScheduleCards] = useState<ScheduleCard[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const coaches = await coachesApi.getAll();
        const cards = (coaches || []).slice(0, 6).map((coach: Coach, idx: number) => ({
          id: coach.id,
          name: coach.name,
          status: coach.status,
          statusText: coachStatusLabelMap[coach.status] || '状态未知',
          specialtyText: coach.specialties?.length
            ? coach.specialties.slice(0, 2).map((item) => item.value).join(' · ')
            : '专长信息未填写',
          coverageText: coach.status === 'ACTIVE' ? '可在教练管理中继续安排时段' : '当前不参与排班',
          tone: tones[idx % tones.length],
        }));
        setScheduleCards(cards);
      } catch (err) {
        messageApi.error(getErrorMessage(err, '加载教练排班数据失败，请稍后重试'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [messageApi]);

  const activeCoachCount = useMemo(
    () => scheduleCards.filter((coach) => coach.status === 'ACTIVE').length,
    [scheduleCards],
  );
  const unavailableCoachCount = useMemo(
    () => scheduleCards.filter((coach) => coach.status !== 'ACTIVE').length,
    [scheduleCards],
  );

  if (loading) {
    return <div className={`${pageCls.page} ${pageCls.dashboardSubpageLoadingState}`}><Spin /></div>;
  }

  return (
    <div className={`${pageCls.page} ${pageCls.workPage}`}>
      {contextHolder}
      <PageHeader
        title="教练排班快捷入口"
        subtitle="仪表盘二级入口：用于快速确认在岗状态，具体排班与调整请进入教练管理执行。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <div className={pageCls.balancedTwoCol}>
        <SectionCard title="排班总览（快捷）" subtitle="仅展示已接入摘要数据，避免被理解为完整排班模块。">
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>这页只用于判断是否要进入教练管理继续排班，不承担完整排班视图。</div>
              <span className={pageCls.sectionMetaPill}>{scheduleCards.length} 位教练</span>
            </div>
            <div className={widgetCls.detailOverviewGrid}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.detailOverviewSummary}>
                <div className={widgetCls.detailInsightLabel}>排班概览</div>
                <div className={widgetCls.detailOverviewLead}>当前已覆盖 {scheduleCards.length} 位教练，其中在职 {activeCoachCount} 位。</div>
                <div className={widgetCls.detailOverviewText}>真实排班与时段维护统一在教练管理中完成。</div>
              </div>
            </div>
            <div className={widgetCls.detailOverviewAside}>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.metricLabel}>教练总数</div>
                  <div className={widgetCls.detailOverviewStatValue}>{scheduleCards.length}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.metricLabel}>在职可排班</div>
                  <div className={widgetCls.detailOverviewStatValue}>{activeCoachCount}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.metricLabel}>当前不可排班</div>
                  <div className={widgetCls.detailOverviewStatValue}>{unavailableCoachCount}</div>
                </div>
              </div>
              <div className={widgetCls.detailInsightCard}>
                <div className={widgetCls.detailInsightLabel}>数据边界</div>
                <div className={widgetCls.detailOverviewLead}>当前仅展示在岗状态</div>
                <div className={widgetCls.detailOverviewText}>课程时段与课节负载将在排班数据源同步后提供。</div>
              </div>
            </div>
          </div>
          </div>
        </SectionCard>

        <SectionCard title="动作建议（辅助）" subtitle="在快捷页判断优先级，具体执行统一进入教练管理。">
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>先判断教练供给是否稳定，再决定是否进入教练管理处理具体排班。</div>
              <span className={pageCls.sectionMetaPill}>保守建议</span>
            </div>
          <div className={widgetCls.infoStack}>
            <div>• 优先保证高峰时段教练供给稳定。</div>
            <div>• 识别低负载时段，优化课程结构。</div>
            <div>• 详细排班管理请进入教练模块。</div>
          </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="教练排班准备清单（摘要）"
        subtitle="仅保留可用摘要，完整排班流程在教练管理中处理"
        extra={<Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/coaches')}>进入教练管理</Button>}
      >
        <div className={pageCls.sectionContentStack}>
          <div className={pageCls.sectionSummaryRow}>
            <div className={pageCls.sectionSummaryText}>该列表只保留身份与在岗状态，避免把快捷入口误理解为完整排班模块。</div>
            <span className={pageCls.sectionMetaPill}>教练维度摘要</span>
          </div>
        <div className={widgetCls.courseGrid}>
          {scheduleCards.map((coach) => (
            <div key={coach.id} className={widgetCls.detailCard}>
              <div className={widgetCls.detailHeader}>
                <div className={widgetCls.recordMeta}>
                  <MemberAvatar name={coach.name} tone={coach.tone} />
                  <div>
                    <div className={`${widgetCls.recordTitle} ${widgetCls.dashboardCoachName}`}>{coach.name}</div>
                    <div className={widgetCls.recordSub}>{coach.specialtyText}</div>
                  </div>
                </div>
              </div>

              <div className={widgetCls.infoStack}>
                <div>
                  当前状态：<strong>{coach.statusText}</strong>
                </div>
                <div>{coach.coverageText}</div>
              </div>
              <div className={widgetCls.detailFooterRow}>
                <StatusTag status={coach.statusText} />
                <Button size="large" className={pageCls.cardActionSecondary} onClick={() => go('/coaches')}>
                  在教练管理维护排班
                </Button>
              </div>
            </div>
          ))}
        </div>
        </div>
      </SectionCard>
    </div>
  );
}
