import { useEffect, useMemo, useState } from 'react';
import { Button, Spin, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import { bookingsApi, type Booking } from '@/services/bookings';
import { coursesApi, type Course } from '@/services/courses';
import { getErrorMessage } from '@/utils/errors';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import type { AccentTone } from '@/types';

const tones: AccentTone[] = ['mint', 'violet', 'orange', 'pink'];

export default function DashboardBookingsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [bookingRes, courseRes] = await Promise.all([
          bookingsApi.getAll({ page: 1, pageSize: 30 }),
          coursesApi.getAll(),
        ]);
        setBookings(bookingRes.data || []);
        setCourses(courseRes || []);
      } catch (err) {
        messageApi.error(getErrorMessage(err, '加载预约数据失败，请稍后重试'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [messageApi]);

  const pendingBookings = useMemo(() => bookings.filter((item) => item.status === 'PENDING'), [bookings]);
  const confirmedBookings = useMemo(() => bookings.filter((item) => item.status === 'CONFIRMED'), [bookings]);
  const cancelledBookings = useMemo(() => bookings.filter((item) => item.status === 'CANCELLED'), [bookings]);
  const fullCourses = useMemo(() => courses.filter((course) => (course._count?.sessions || 0) >= course.capacity), [courses]);

  const priorityBooking = pendingBookings[0] ?? bookings[0];
  const priorityCourse = fullCourses[0] ?? courses[0];

  if (loading) {
    return <div className={`${pageCls.page} ${pageCls.dashboardSubpageLoadingState}`}><Spin /></div>;
  }

  return (
    <div className={`${pageCls.page} ${pageCls.workPage}`}>
      {contextHolder}
      <PageHeader
        title="今日预约明细"
        subtitle="聚焦预约跟进事项，快速确认、联系与处理异常。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <div className={pageCls.balancedTwoCol}>
        <SectionCard title="预约总览" subtitle="真实预约数据驱动">
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>优先关注待确认预约、临近开课记录和课程容量风险，让首页钻取页更像真正的运营处理台，而不是只读摘要。</div>
              <span className={pageCls.sectionMetaPill}>近 30 条预约</span>
            </div>

          <div className={widgetCls.detailOverviewGrid}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.detailOverviewSummary}>
                <div className={widgetCls.detailInsightLabel}>运营概览</div>
                <div className={widgetCls.detailOverviewLead}>今日共 {bookings.length} 条预约，待确认 {pendingBookings.length} 条，已取消 {cancelledBookings.length} 条。</div>
                <div className={widgetCls.detailOverviewText}>优先处理临近开课且待确认的预约，可显著提升到课率与上座率。</div>
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
              {priorityBooking ? (
                <div className={`${widgetCls.detailInsightCard} ${widgetCls.detailInsightCardMint}`}>
                  <div className={widgetCls.detailInsightLabel}>优先跟进</div>
                  <div className={widgetCls.detailOverviewLead}>{priorityBooking.member?.name || '-'}</div>
                  <div className={widgetCls.detailOverviewText}>{priorityBooking.session?.course?.name || '-'} · {priorityBooking.member?.phone || '-'}</div>
                </div>
              ) : null}
            </div>
          </div>
          </div>
        </SectionCard>

        <SectionCard title="容量提醒" subtitle="与课程容量同步查看">
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>把容量风险和待确认预约放在同一层看，能更快判断哪些课程需要优先补位或直接联系会员。</div>
              <span className={pageCls.sectionMetaPill}>{fullCourses.length ? '存在满班风险' : '容量稳定'}</span>
            </div>
            <div className={widgetCls.infoStack}>
            <div>• 满班课程：{fullCourses.length} 节</div>
            <div>• 建议优先联系待确认会员，减少空位损耗。</div>
            {priorityCourse ? <div>• 当前关注：{priorityCourse.name}</div> : null}
          </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="待处理预约"
        subtitle="按当前状态快速推进确认、联系与详情查看"
        extra={<Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/bookings')}>进入完整预约模块</Button>}
      >
          <div className={pageCls.sectionContentStack}>
          <div className={pageCls.sectionSummaryRow}>
            <div className={pageCls.sectionSummaryText}>下方保留最需要人工推进的预约记录，适合从仪表盘快速跳入，再进入完整预约模块做批量处理。</div>
            <span className={pageCls.sectionMetaPill}>优先处理前 12 条</span>
          </div>

          <div className={widgetCls.recordList}>
           {bookings.slice(0, 12).map((item, idx) => (
             <div key={item.id} className={`${widgetCls.recordItem} ${widgetCls.showcaseRecordItem}`}>
              <div className={`${widgetCls.recordMeta} ${widgetCls.dashboardBookingMeta}`}>
                <MemberAvatar name={item.member?.name || '-'} tone={tones[idx % tones.length]} />
                <div className={`${widgetCls.dashboardBookingBody} ${widgetCls.detailCourseMeta}`}>
                  <div className={`${widgetCls.recordTitle} ${widgetCls.dashboardBookingNameRow}`}>
                    {item.member?.name || '-'}
                    <StatusTag status={item.status} />
                  </div>
                  <div className={widgetCls.recordSub}><span className={widgetCls.dashboardBookingPill}>{item.session?.course?.name || '-'}</span></div>
                  <div className={widgetCls.recordSub}>{item.member?.phone || '-'}</div>
                </div>
              </div>
              <div className={widgetCls.detailActionGroup}>
                <Button type="primary" size="large" className={pageCls.cardActionHalf}>{item.status === 'PENDING' ? '立即确认' : '联系会员'}</Button>
                <Button size="large" className={pageCls.cardActionHalf}>查看详情</Button>
              </div>
             </div>
           ))}
          </div>
          </div>
        </SectionCard>
      </div>
  );
}
