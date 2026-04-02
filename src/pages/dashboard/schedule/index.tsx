import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import { scheduleCards } from '@/mock';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';

export default function DashboardSchedulePage() {
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  const totalSessions = scheduleCards.reduce((sum, coach) => sum + Number.parseInt(coach.sessions, 10), 0);
  const totalScheduleDays = scheduleCards.reduce((sum, coach) => sum + coach.slots.length, 0);
  const busiestCoach = scheduleCards.reduce((current, coach) => (
    Number.parseInt(coach.sessions, 10) > Number.parseInt(current.sessions, 10) ? coach : current
  ));

  return (
    <div className={pageCls.page}>
      <PageHeader
        title="教练排班明细"
        subtitle="查看本周关键教练时段分布，快速识别高峰与空档。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <div className={widgetCls.dashboardSubpageTag}>仪表盘子页 · 排班摘要</div>
      <div className={widgetCls.dashboardSubpageHint}>这里保留的是排班视角的摘要分析，重点帮助你快速识别高负载教练与空档时段；如需查看完整教练资料和排班管理，请进入教练模块。</div>

      <div className={pageCls.balancedTwoCol}>
        <SectionCard title="排班总览" subtitle="用首页一致的指标块先建立本周工作量与覆盖范围感知。">
          <div className={widgetCls.detailOverviewGrid}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.detailOverviewSummary}>
                <div className={widgetCls.detailInsightLabel}>排班概览</div>
                <div className={widgetCls.detailOverviewLead}>本周共安排 {totalSessions} 节课程，覆盖 {scheduleCards.length} 位教练与 {totalScheduleDays} 个排班日，先稳住主力时段再做错峰补位会更合理。</div>
                <div className={widgetCls.detailOverviewText}>先用总量和覆盖范围建立排班全貌，再看高负载教练与交界时段，能让后续调整更像结构优化，而不是被零散时间点牵着走。</div>
              </div>
              <div className={widgetCls.chipRow}>
                <span className={widgetCls.chipPrimary}>最高负载 {busiestCoach.name}</span>
                <span className={widgetCls.chip}>本周安排 {busiestCoach.sessions}</span>
                <span className={widgetCls.chip}>排班结构保持平稳</span>
              </div>
            </div>
            <div className={widgetCls.detailOverviewAside}>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.metricLabel}>本周总课节</div>
                  <div className={widgetCls.detailOverviewStatValue}>{totalSessions}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.metricLabel}>覆盖教练</div>
                  <div className={widgetCls.detailOverviewStatValue}>{scheduleCards.length}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.metricLabel}>排班日数</div>
                  <div className={widgetCls.detailOverviewStatValue}>{totalScheduleDays}</div>
                </div>
              </div>
              <div className={widgetCls.detailInsightCard}>
                <div className={widgetCls.detailInsightLabel}>本周总控</div>
                <div className={widgetCls.detailOverviewLead}>先稳住 {busiestCoach.name} 的黄金时段，再补齐上午与晚间的交界空档。</div>
                <div className={widgetCls.detailOverviewText}>当前共覆盖 {scheduleCards.length} 位教练、{totalScheduleDays} 个排班日。保持高负载教练的连续性，再做错峰补位，整体排班会更清楚也更易执行。</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="本周关注" subtitle="让排班调整更贴近首页的运营叙事，而不是单纯列出时间。">
          <div className={widgetCls.detailAsideStack}>
            <div className={`${widgetCls.detailInsightCard} ${widgetCls.detailInsightCardMint}`}>
              <div className={widgetCls.detailInsightLabel}>高负载教练</div>
              <div className={`${widgetCls.detailInsightValue} ${widgetCls.detailPersonName}`}>{busiestCoach.name}</div>
              <div className={widgetCls.detailInsightText}>当前已承担 {busiestCoach.sessions}，建议优先保留其黄金时段连续性。</div>
            </div>
            <div className={widgetCls.detailInsightCard}>
              <div className={widgetCls.detailInsightLabel}>排班建议</div>
              <div className={widgetCls.detailInsightValue}>错峰补位</div>
              <div className={widgetCls.detailInsightText}>优先补齐上午与晚间交界时段，能让课程结构更接近首页展示的稳定节奏。</div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="本周排班卡片"
        subtitle="按教练维度查看班表强度与时段分布。"
        extra={<Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/coaches')}>进入教练模块</Button>}
      >
        <div className={widgetCls.courseGrid}>
          {scheduleCards.map((coach) => (
            <div key={coach.name} className={widgetCls.detailCard}>
              <div className={widgetCls.detailHeader}>
                <div className={widgetCls.recordMeta}>
                  <MemberAvatar name={coach.name} tone={coach.tone} />
                  <div>
                    <div className={`${widgetCls.recordTitle} ${widgetCls.dashboardCoachName}`}>{coach.name}</div>
                    <div className={widgetCls.recordSub}>本周总课节数 <span className={widgetCls.dashboardInlineNumber}>{coach.sessions}</span></div>
                  </div>
                </div>
              </div>

              <div className={widgetCls.chipRow}>
                <span className={widgetCls.chipPrimary}>{coach.slots.length} 个排班日</span>
                <span className={widgetCls.chip}>平均每日 {Math.max(1, Math.round(Number.parseInt(coach.sessions, 10) / coach.slots.length))} 节</span>
              </div>

              <div className={widgetCls.slotGrid}>
                {coach.slots.map((slot) => (
                  <div key={`${coach.name}-${slot.day}`} className={widgetCls.slotCard}>
                    <div className={widgetCls.slotDay}>{slot.day}</div>
                    <div className={widgetCls.slotTime}>{slot.time}</div>
                    <div className={widgetCls.slotCount}>{slot.count}</div>
                  </div>
                ))}
              </div>

              <div className={widgetCls.detailFooterRow}>
                <div className={widgetCls.smallText}>建议保持当前主力时段稳定，减少临时调班带来的预约波动。</div>
                <Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/coaches')}>查看教练档案</Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
