import { useEffect, useMemo, useState } from 'react';
import { Spin, message } from 'antd';
import { CalendarOutlined, RiseOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import pageCls from '@/styles/page.module.css';
import { bookingsApi, type Booking } from '@/services/bookings';
import { coursesApi, type Course } from '@/services/courses';
import { coachesApi, type Coach } from '@/services/coaches';
import { reportsApi } from '@/services/reports';
import { transactionsApi } from '@/services/transactions';
import { getErrorMessage } from '@/utils/errors';
import {
  MembershipOverviewCard,
  QuickActionPanel,
  TodayCoursePanel,
  TrainingSummaryCard,
  UpcomingBookingsPanel,
  type QuickActionItem,
} from './components';
import styles from './index.module.css';

type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  monthlyRevenue: number;
};

type MembershipOverviewViewModel = {
  tierLabel: string;
  planName: string;
  expiryDateText: string;
  benefitText: string;
  remainingDaysText: string;
  progressPercent?: number;
};

type TodayCourseViewModel = {
  id: string;
  title: string;
  timeText: string;
  durationText: string;
  coachName: string;
  locationText: string;
  statusText?: string;
};

type TrainingSummaryViewModel = {
  sessionCountText: string;
  hoursText: string;
  streakDaysText: string;
  goalPercent?: number;
  goalLabel?: string;
};

type UpcomingBookingViewModel = {
  id: string;
  dayText: string;
  weekdayText: string;
  title: string;
  metaText: string;
  tagText?: string;
};

const iconMap = {
  wallet: <WalletOutlined />,
  team: <TeamOutlined />,
  calendar: <CalendarOutlined />,
  rise: <RiseOutlined />,
};

const bookingStatusToLabel = (status: string) => {
  if (status === 'PENDING') return '待确认';
  if (status === 'CONFIRMED') return '已确认';
  if (status === 'COMPLETED') return '已完成';
  if (status === 'CANCELLED') return '已取消';
  if (status === 'NO_SHOW') return '未到场';
  return '待确认';
};

const formatTimeRange = (start?: string, end?: string) => {
  if (!start) return '待接入排课时间';

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return '待接入排课时间';

  const startText = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(startDate);

  if (!end) return startText;

  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return startText;

  const endText = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(endDate);

  return `${startText} - ${endText}`;
};

const formatDurationText = (minutes?: number) => {
  if (!minutes || minutes <= 0) return '时长待接入';
  return `${minutes} min`;
};

const deriveMembershipSummary = (
  stats: DashboardStats,
  monthlyRevenue: number,
  recentBookingCount: number,
): MembershipOverviewViewModel => {
  const activityRate = stats.totalMembers > 0 ? Math.round((stats.activeMembers / stats.totalMembers) * 100) : 0;
  const remainingDaysEstimate = Math.max(7, 30 - Math.min(stats.newMembersThisMonth * 2, 22));

  return {
    tierLabel: stats.activeMembers > 120 ? '高活跃' : '运营中',
    planName: `活跃会员 ${stats.activeMembers} / 总会员 ${stats.totalMembers || 0}`,
    expiryDateText: stats.newMembersThisMonth > 0 ? `本月新增 ${stats.newMembersThisMonth} 位` : '本月暂无新增会籍',
    benefitText: recentBookingCount > 0 ? `近期预约 ${recentBookingCount} 单` : `月度营收 ¥${monthlyRevenue.toLocaleString('zh-CN')}`,
    remainingDaysText: `活跃率 ${activityRate}%`,
    progressPercent: activityRate,
  };
};

const mapTodayCourses = (courses: Course[]): TodayCourseViewModel[] =>
  courses.slice(0, 4).map((course) => ({
    id: course.id,
    title: course.name,
    timeText: '今日待排班',
    durationText: `${formatDurationText(course.durationMinutes)} · ${course.type}`,
    coachName: course.coach?.name || '待分配教练',
    locationText: course.level ? `${course.level}课程` : '待接入门店',
    statusText: course.isActive ? '已确认' : '已取消',
  }));

const deriveTrainingSummary = (
  courses: Course[],
  coaches: Coach[],
  totalMembers: number,
): TrainingSummaryViewModel => {
  const totalSessions = courses.reduce((sum, item) => sum + (item._count?.sessions || 0), 0);
  const estimatedHours = courses.reduce((sum, item) => sum + ((item._count?.sessions || 0) * item.durationMinutes), 0) / 60;
  const streakDays = Math.min(7, Math.max(1, coaches.filter((coach) => coach.status === 'ACTIVE').length || 1));
  const goalPercent = totalMembers > 0 ? Math.min(100, Math.round((totalSessions / totalMembers) * 100)) : 0;

  return {
    sessionCountText: `${totalSessions || 0} 次`,
    hoursText: `${estimatedHours > 0 ? estimatedHours.toFixed(1) : '0.0'} h`,
    streakDaysText: `${streakDays} d`,
    goalPercent,
    goalLabel: totalSessions > 0 ? `月度课节完成 ${goalPercent}%` : '月度目标进度待接入真实报表',
  };
};

const mapUpcomingBookings = (items: Booking[]): UpcomingBookingViewModel[] =>
  items.slice(0, 4).map((item) => {
    const startsAt = item.session?.startsAt;
    const startDate = startsAt ? new Date(startsAt) : null;
    const hasValidDate = startDate !== null && !Number.isNaN(startDate.getTime());

    return {
      id: item.id,
      dayText: hasValidDate ? new Intl.DateTimeFormat('zh-CN', { day: '2-digit' }).format(startDate) : '--',
      weekdayText: hasValidDate
        ? new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(startDate).replace('周', 'W')
        : 'TBD',
      title: item.session?.course?.name || '课程待确认',
      metaText: `${item.session?.coach?.name || '待分配教练'} · ${formatTimeRange(item.session?.startsAt, item.session?.endsAt)}`,
      tagText: bookingStatusToLabel(item.status),
    };
  });

export default function DashboardPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    newMembersThisMonth: 0,
    monthlyRevenue: 0,
  });
  const [courseList, setCourseList] = useState<Course[]>([]);
  const [coachList, setCoachList] = useState<Coach[]>([]);
  const [bookingList, setBookingList] = useState<Booking[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [memberReport, coursesData, coachesData, bookingsRes, txSummary] = await Promise.all([
          reportsApi.getMembers(),
          coursesApi.getAll(),
          coachesApi.getAll(),
          bookingsApi.getAll({ page: 1, pageSize: 12 }),
          transactionsApi
            .getSummary()
            .catch(() => ({ totalRevenueCents: 0, pendingAmountCents: 0, refundedAmountCents: 0, todayRevenueCents: 0 })),
        ]);

        setStats({
          totalMembers: memberReport.totalMembers,
          activeMembers: memberReport.activeMembers,
          newMembersThisMonth: memberReport.newMembersThisMonth,
          monthlyRevenue: Math.round((txSummary.totalRevenueCents || 0) / 100),
        });
        setCourseList(coursesData || []);
        setCoachList(coachesData || []);
        setBookingList(bookingsRes.data || []);
      } catch (err) {
        messageApi.error(getErrorMessage(err, '加载仪表盘数据失败，请稍后重试'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [messageApi]);

  const dashboardStats = useMemo(
    () => [
      { title: '总会员', value: String(stats.totalMembers), hint: `本月新增 ${stats.newMembersThisMonth}`, tone: 'mint' as const, icon: 'team' as const },
      {
        title: '活跃会员',
        value: String(stats.activeMembers),
        hint: `活跃率 ${stats.totalMembers ? ((stats.activeMembers / stats.totalMembers) * 100).toFixed(1) : 0}%`,
        tone: 'violet' as const,
        icon: 'calendar' as const,
      },
      {
        title: '待处理预约',
        value: String(bookingList.filter((item) => item.status === 'PENDING').length),
        hint: `今日预约 ${bookingList.length} 单`,
        tone: 'orange' as const,
        icon: 'rise' as const,
      },
      {
        title: '本月营收',
        value: `¥${stats.monthlyRevenue.toLocaleString('zh-CN')}`,
        hint: '来源：交易汇总',
        tone: 'pink' as const,
        icon: 'wallet' as const,
      },
    ],
    [stats, bookingList],
  );

  const membershipSummary = useMemo(
    () => deriveMembershipSummary(stats, stats.monthlyRevenue, bookingList.length),
    [stats, bookingList.length],
  );

  const todayCourses = useMemo(() => mapTodayCourses(courseList), [courseList]);

  const quickActions = useMemo<QuickActionItem[]>(
    () => [
      { key: 'members', label: '会员管理', subLabel: 'MEMBERS', path: '/members' },
      { key: 'courses', label: '课程管理', subLabel: 'COURSES', path: '/courses' },
      { key: 'bookings', label: '预约管理', subLabel: 'BOOKINGS', path: '/bookings' },
      { key: 'settings', label: '系统设置', subLabel: 'SETTINGS', path: '/settings' },
    ],
    [],
  );

  const trainingSummary = useMemo(
    () => deriveTrainingSummary(courseList, coachList, stats.totalMembers),
    [courseList, coachList, stats.totalMembers],
  );

  const upcomingBookings = useMemo(() => mapUpcomingBookings(bookingList), [bookingList]);

  if (loading) {
    return (
      <div className={`${pageCls.page} ${pageCls.showcasePage} ${pageCls.centeredState} ${pageCls.centeredStateMedium}`}>
        {contextHolder}
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={`${pageCls.page} ${pageCls.showcasePage}`}>
      {contextHolder}
      <PageHeader
        title="仪表盘"
        subtitle={`欢迎回来，当前有 ${todayCourses.length} 个课程概览、${bookingList.length} 条预约记录，${stats.activeMembers} 位活跃会员。`}
      />

      <div className={pageCls.dashboardHeroGrid}>
        {dashboardStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={styles.dashboardStack}>
        <div className={styles.topGrid}>
          <MembershipOverviewCard
            {...membershipSummary}
            onViewDetail={() => go('/members')}
            onPrimaryAction={() => go('/bookings')}
          />
          <QuickActionPanel items={quickActions} onNavigate={go} />
        </div>

        <div className={pageCls.dashboardSectionGrid}>
          <TodayCoursePanel
            items={todayCourses}
            onViewAll={() => go('/courses')}
            onViewDetail={() => go('/courses')}
          />
          <TrainingSummaryCard {...trainingSummary} />
        </div>

        <div className={styles.bottomGrid}>
          <UpcomingBookingsPanel
            items={upcomingBookings}
            onViewAll={() => go('/bookings')}
            onViewDetail={() => go('/bookings')}
          />
        </div>
      </div>
    </div>
  );
}
