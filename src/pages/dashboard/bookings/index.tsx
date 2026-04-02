import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import { todayBookings, todayCourses } from '@/mock';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';

export default function DashboardBookingsPage() {
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  const pendingBookings = todayBookings.filter((item) => item.status === '待确认');
  const confirmedBookings = todayBookings.filter((item) => item.status === '已确认');
  const cancelledBookings = todayBookings.filter((item) => item.status === '已取消');
  const fullCourses = todayCourses.filter((course) => course.status === '已满');
  const priorityBooking = pendingBookings[0] ?? todayBookings[0];
  const priorityCourse = fullCourses[0] ?? todayCourses[0];

  return (
    <div className={`${pageCls.page} ${pageCls.showcasePage}`}>
      <PageHeader
        title="今日预约明细"
        subtitle="聚焦仪表盘内的预约跟进事项，快速确认、联系与处理异常。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <div className={widgetCls.dashboardSubpageTag}>仪表盘子页 · 预约摘要</div>
      <div className={widgetCls.dashboardSubpageHint}>这里保留的是仪表盘延展视角，重点帮助你快速识别待确认、容量冲突和优先处理对象；如需完整处理预约，请进入正式预约模块。</div>

      <div className={pageCls.balancedTwoCol}>
        <SectionCard title="预约总览" subtitle="保持与首页相同的运营视角，先看整体节奏再逐条处理。">
          <div className={widgetCls.detailOverviewGrid}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.detailOverviewSummary}>
                <div className={widgetCls.detailInsightLabel}>运营概览</div>
                <div className={widgetCls.detailOverviewLead}>今日共 {todayBookings.length} 条预约，先处理 {pendingBookings.length} 条待确认，再同步 {fullCourses.length} 节满班课程的候补节奏。</div>
                <div className={widgetCls.detailOverviewText}>确认动作优先贴近开课时间推进，把状态变化与课程容量放在同一层级里看，会比单纯堆数字更容易判断当下处理顺序。</div>
              </div>
              <div className={widgetCls.chipRow}>
                <span className={widgetCls.chipPrimary}>今日预约 {todayBookings.length} 单</span>
                <span className={widgetCls.chip}>满班课程 {fullCourses.length} 节</span>
                <span className={widgetCls.chip}>需即时回访 {pendingBookings.length + cancelledBookings.length} 位</span>
              </div>
            </div>
            <div className={widgetCls.detailOverviewAside}>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.metricLabel}>已确认</div>
                  <div className={widgetCls.detailOverviewStatValue}>{confirmedBookings.length}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.metricLabel}>待确认</div>
                  <div className={widgetCls.detailOverviewStatValue}>{pendingBookings.length}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.metricLabel}>已取消</div>
                  <div className={widgetCls.detailOverviewStatValue}>{cancelledBookings.length}</div>
                </div>
              </div>
              <div className={`${widgetCls.detailInsightCard} ${widgetCls.detailInsightCardMint}`}>
                <div className={widgetCls.detailInsightLabel}>今日总控</div>
                <div className={widgetCls.detailOverviewLead}>待确认 → 满班候补 → 取消回访</div>
                <div className={widgetCls.detailOverviewText}>优先联系 {priorityBooking.name} 所在课程，并把临近开课且容量紧张的排程放到第一处理层级，整体节奏会更干净。</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="今日跟进焦点" subtitle="把最需要处理的预约与容量变化放在同一视线里。">
          <div className={widgetCls.detailAsideStack}>
            <div className={`${widgetCls.detailInsightCard} ${widgetCls.detailInsightCardMint}`}>
              <div className={widgetCls.detailInsightLabel}>优先确认</div>
              <div className={`${widgetCls.detailInsightValue} ${widgetCls.detailPersonName}`}>{priorityBooking.name}</div>
              <div className={widgetCls.detailInsightText}>{priorityBooking.course} · {priorityBooking.phone}</div>
            </div>
            <div className={`${widgetCls.detailInsightCard} ${widgetCls.detailInsightCardOrange}`}>
              <div className={widgetCls.detailInsightLabel}>容量提醒</div>
              <div className={widgetCls.detailInsightValue}>{priorityCourse.title}</div>
              <div className={widgetCls.detailInsightText}>{priorityCourse.time} · {priorityCourse.booking} · {priorityCourse.status}</div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className={pageCls.balancedTwoCol}>
        <SectionCard
          title="待处理预约"
          subtitle="按当前状态快速推进确认、联系与详情查看。"
          extra={<Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/bookings')}>进入完整预约模块</Button>}
        >
          <div className={widgetCls.recordList}>
            {todayBookings.map((item) => (
              <div key={item.name} className={`${widgetCls.recordItem} ${widgetCls.showcaseRecordItem}`}>
                <div className={`${widgetCls.recordMeta} ${widgetCls.dashboardBookingMeta}`}>
                  <MemberAvatar name={item.name} tone={item.tone} />
                  <div className={`${widgetCls.dashboardBookingBody} ${widgetCls.detailCourseMeta}`}>
                    <div className={`${widgetCls.recordTitle} ${widgetCls.dashboardBookingNameRow}`}>
                      {item.name}
                      <StatusTag status={item.status} />
                    </div>
                    <div className={widgetCls.recordSub}>
                      <span className={widgetCls.dashboardBookingPill}>{item.course}</span>
                    </div>
                    <div className={widgetCls.recordSub}>{item.phone}</div>
                  </div>
                </div>
                <div className={widgetCls.detailActionGroup}>
                  <Button type="primary" size="large" className={pageCls.cardActionHalf}>{item.status === '待确认' ? '立即确认' : '联系会员'}</Button>
                  <Button size="large" className={pageCls.cardActionHalf}>查看详情</Button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className={widgetCls.detailAsideStack}>
          <SectionCard title="预约关联课程" subtitle="今日课程容量与预约状态保持同页联动。">
            <div className={widgetCls.recordListDense}>
              {todayCourses.map((course) => (
                <div key={`${course.time}-${course.title}`} className={`${widgetCls.recordItem} ${widgetCls.showcaseRecordItem}`}>
                  <div className={widgetCls.detailCourseMeta}>
                    <div className={widgetCls.recordTitle}>{course.title}</div>
                    <div className={widgetCls.recordSub}>{course.time} · {course.type} · 教练 {course.coach}</div>
                  </div>
                  <div className={widgetCls.dashboardCourseAside}>
                    <div className={widgetCls.dashboardNumberText}>{course.booking}</div>
                    <StatusTag status={course.status} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="处理建议" subtitle="保持节奏克制，优先减少临近开课的空位损耗。">
            <div className={widgetCls.infoStack}>
              <div>• 优先确认「待确认」预约，避免临近开课空位浪费。</div>
              <div>• 对「已取消」会员发起候补邀约，提高当日上座率。</div>
              <div>• 在开课前 30 分钟完成签到提醒，提高准时到课率。</div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
