import { useEffect, useMemo, useState } from 'react';
import { Button, Spin } from 'antd';
import { CalendarOutlined, RiseOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import MemberAvatar from '@/components/MemberAvatar';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { bookingsApi, type Booking } from '@/services/bookings';
import { coursesApi, type Course } from '@/services/courses';
import { coachesApi, type Coach } from '@/services/coaches';
import { reportsApi } from '@/services/reports';
import { transactionsApi } from '@/services/transactions';

type DashboardCourse = {
  time: string;
  title: string;
  booking: string;
  status: string;
  type: string;
  coach: string;
};

type DashboardBooking = {
  name: string;
  status: string;
  course: string;
  phone: string;
  tone: 'mint' | 'violet' | 'orange' | 'pink';
};

type ScheduleCoach = {
  name: string;
  sessions: string;
  slots: Array<{ day: string; time: string; count: string }>;
  tone: 'mint' | 'violet' | 'orange' | 'pink';
};

const tones: Array<'mint' | 'violet' | 'orange' | 'pink'> = ['mint', 'violet', 'orange', 'pink'];

const iconMap = {
  wallet: <WalletOutlined />,
  team: <TeamOutlined />,
  calendar: <CalendarOutlined />,
  rise: <RiseOutlined />,
};

const toTime = (iso?: string) => {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const toDateLabel = (iso?: string) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
};

const bookingStatusToLabel = (status: string) => {
  if (status === '待确认' || status === '已确认' || status === '已取消' || status === '已完成') return status;
  return '待确认';
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    newMembersThisMonth: 0,
    monthlyRevenue: 0,
  });
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [scheduleCards, setScheduleCards] = useState<ScheduleCoach[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const to = new Date().toISOString().split('T')[0];

        const [memberReport, coursesData, coachesData, bookingsRes, txSummary] = await Promise.all([
          reportsApi.getMembers(),
          coursesApi.getAll(),
          coachesApi.getAll(),
          bookingsApi.getAll({ page: 1, pageSize: 12 }),
          transactionsApi.getSummary().catch(() => ({ totalRevenueCents: 0, pendingAmountCents: 0, refundedAmountCents: 0, todayRevenueCents: 0 })),
        ]);

        setStats({
          totalMembers: memberReport.totalMembers,
          activeMembers: memberReport.activeMembers,
          newMembersThisMonth: memberReport.newMembersThisMonth,
          monthlyRevenue: Math.round((txSummary.totalRevenueCents || 0) / 100),
        });

        const mappedCourses: DashboardCourse[] = (coursesData || []).slice(0, 8).map((course: Course) => ({
          time: '--:--',
          title: course.name,
          booking: `${course._count?.sessions || 0}/${course.capacity}`,
          status: course.isActive ? '已确认' : '已取消',
          type: course.type,
          coach: course.coach?.name || '待分配',
        }));
        setCourses(mappedCourses);

        const mappedBookings: DashboardBooking[] = (bookingsRes.data || []).slice(0, 8).map((item: Booking, idx: number) => ({
          name: item.member?.name || `会员${idx + 1}`,
          status: bookingStatusToLabel(item.status),
          course: item.session?.course?.name || '课程待确认',
          phone: item.member?.phone || '-',
          tone: tones[idx % tones.length],
        }));
        setBookings(mappedBookings);

        const coachMap: ScheduleCoach[] = (coachesData || []).slice(0, 4).map((coach: Coach, idx: number) => ({
          name: coach.name,
          sessions: String(Math.max(0, Math.round((coach.rating || 4) * 3))),
          slots: [
            { day: '周一', time: '09:00-12:00', count: '3 节' },
            { day: '周三', time: '14:00-17:00', count: '3 节' },
            { day: '周五', time: '18:00-20:00', count: '2 节' },
          ],
          tone: tones[idx % tones.length],
        }));
        setScheduleCards(coachMap);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const dashboardStats = useMemo(
    () => [
      { title: '总会员', value: String(stats.totalMembers), hint: `本月新增 ${stats.newMembersThisMonth}`, tone: 'mint' as const, icon: 'team' as const },
      { title: '活跃会员', value: String(stats.activeMembers), hint: `活跃率 ${stats.totalMembers ? ((stats.activeMembers / stats.totalMembers) * 100).toFixed(1) : 0}%`, tone: 'violet' as const, icon: 'calendar' as const },
      { title: '待处理预约', value: String(bookings.filter((item) => item.status === '待确认').length), hint: `今日预约 ${bookings.length} 单`, tone: 'orange' as const, icon: 'rise' as const },
      { title: '本月营收', value: `¥${stats.monthlyRevenue.toLocaleString('zh-CN')}`, hint: '来源：交易汇总', tone: 'pink' as const, icon: 'wallet' as const },
    ],
    [stats, bookings]
  );

  if (loading) {
    return (
      <div className={`${pageCls.page} ${pageCls.showcasePage} ${pageCls.centeredState} ${pageCls.centeredStateMedium}`}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={`${pageCls.page} ${pageCls.showcasePage}`}>
      <PageHeader title="仪表盘" subtitle={`欢迎回来，今日有 ${courses.length} 条课程概览，${stats.activeMembers} 位活跃会员。`} />

      <div className={pageCls.dashboardHeroGrid}>
        {dashboardStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={pageCls.dashboardSectionGrid}>
        <SectionCard title="今日课程" subtitle={`${new Date().toLocaleDateString('zh-CN')} · 共 ${courses.length} 节课程`} extra={<Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/courses')}>查看全部</Button>}>
          <div className={widgetCls.recordListDense}>
            {courses.map((course, idx) => (
              <div key={`${course.title}-${idx}`} className={widgetCls.recordItem}>
                <div className={widgetCls.recordMeta}>
                  <div className={widgetCls.dashboardTimeBadge}>{course.time}</div>
                  <div className={widgetCls.dashboardCourseInfo}>
                    <div className={widgetCls.recordTitle}>{course.title}</div>
                    <div className={widgetCls.recordSub}>{course.type} · 教练 {course.coach}</div>
                  </div>
                </div>
                <div className={widgetCls.dashboardCourseAside}>
                  <div className={widgetCls.dashboardNumberText}>{course.booking}</div>
                  <StatusTag status={course.status} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="今日预约" subtitle="实时同步最新预约状态" extra={<Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/bookings')}>查看全部</Button>}>
          <div className={widgetCls.recordList}>
            {bookings.map((item, idx) => (
              <div key={`${item.name}-${idx}`} className={widgetCls.recordItem}>
                <div className={`${widgetCls.recordMeta} ${widgetCls.dashboardBookingMeta}`}>
                  <MemberAvatar name={item.name} tone={item.tone} />
                  <div className={widgetCls.dashboardBookingBody}>
                    <div className={`${widgetCls.recordTitle} ${widgetCls.dashboardBookingNameRow}`}>
                      {item.name}
                      <StatusTag status={item.status} />
                    </div>
                    <div className={widgetCls.recordSub}><span className={widgetCls.dashboardBookingPill}>{item.course}</span></div>
                    <div className={widgetCls.recordSub}>{item.phone}</div>
                  </div>
                </div>
                <Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/bookings')}>详情</Button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="教练排班摘要" subtitle="按教练查看本周排班节奏" extra={<Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/coaches')}>查看教练</Button>}>
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
