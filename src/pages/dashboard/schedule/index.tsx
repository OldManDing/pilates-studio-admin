import { useEffect, useMemo, useState } from 'react';
import { Button, Spin, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import { coachesApi, type Coach } from '@/services/coaches';
import { getErrorMessage } from '@/utils/errors';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import type { AccentTone } from '@/types';

type ScheduleCard = {
  name: string;
  sessions: string;
  slots: Array<{ day: string; time: string; count: string }>;
  tone: AccentTone;
};

const tones: AccentTone[] = ['mint', 'violet', 'orange', 'pink'];

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
          name: coach.name,
          sessions: '待接入',
          slots: [
            { day: '排班状态', time: '待接入真实排班接口', count: '-' },
          ],
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
  }, []);

  const totalSessions = useMemo(() => scheduleCards.filter((coach) => /^\d+$/.test(coach.sessions)).reduce((sum, coach) => sum + Number.parseInt(coach.sessions, 10), 0), [scheduleCards]);
  const totalScheduleDays = useMemo(() => scheduleCards.reduce((sum, coach) => sum + coach.slots.length, 0), [scheduleCards]);
  const busiestCoach = useMemo(() => scheduleCards.reduce((current, coach) => {
    if (!current) return coach;
    return Number.parseInt(coach.sessions, 10) > Number.parseInt(current.sessions, 10) ? coach : current;
  }, scheduleCards[0] as ScheduleCard | undefined), [scheduleCards]);

  if (loading) {
    return <div className={pageCls.page} style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><Spin /></div>;
  }

  return (
    <div className={`${pageCls.page} ${pageCls.showcasePage}`}>
      {contextHolder}
      <PageHeader
        title="教练排班明细"
        subtitle="查看本周关键教练时段分布，快速识别高峰与空档。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <div className={pageCls.balancedTwoCol}>
        <SectionCard title="排班总览" subtitle="真实教练数据驱动">
          <div className={widgetCls.detailOverviewGrid}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.detailOverviewSummary}>
                <div className={widgetCls.detailInsightLabel}>排班概览</div>
                <div className={widgetCls.detailOverviewLead}>当前已覆盖 {scheduleCards.length} 位教练，排班总课节与时段分布待真实接口接入后展示。</div>
                <div className={widgetCls.detailOverviewText}>目前不再展示静态周一/周三/周五示例排班，避免误导门店做实际排班决策。</div>
              </div>
            </div>
            <div className={widgetCls.detailOverviewAside}>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.metricLabel}>本周总课节</div>
                  <div className={widgetCls.detailOverviewStatValue}>{totalSessions > 0 ? totalSessions : '待接入'}</div>
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
              {busiestCoach && /^\d+$/.test(busiestCoach.sessions) ? (
                <div className={widgetCls.detailInsightCard}>
                  <div className={widgetCls.detailInsightLabel}>高负载教练</div>
                  <div className={widgetCls.detailOverviewLead}>{busiestCoach.name}</div>
                  <div className={widgetCls.detailOverviewText}>本周已安排 {busiestCoach.sessions} 节课程</div>
                </div>
              ) : null}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="动作建议" subtitle="基于当前已接入数据的保守建议">
          <div className={widgetCls.infoStack}>
            <div>• 优先保证高峰时段教练供给稳定。</div>
            <div>• 识别低负载时段，优化课程结构。</div>
            <div>• 详细排班管理请进入教练模块。</div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="本周排班卡片"
        subtitle="按教练维度查看班表强度与时段分布"
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
                    <div className={widgetCls.recordSub}>本周总课节数 {coach.sessions}</div>
                  </div>
                </div>
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
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
