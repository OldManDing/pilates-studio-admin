import { useEffect, useMemo, useState } from 'react';
import { Button, Spin, message } from 'antd';
import { CalendarOutlined, RiseOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import pageCls from '@/styles/page.module.css';
import { bookingsApi, type Booking } from '@/services/bookings';
import { coursesApi, type Course } from '@/services/courses';
import { coachesApi, type Coach } from '@/services/coaches';
import { reportsApi } from '@/services/reports';
import { transactionsApi } from '@/services/transactions';
import { getErrorMessage } from '@/utils/errors';
import {
  TodayCoursePanel,
  UpcomingBookingsPanel,
} from './components';
import styles from './index.module.css';

type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  monthlyRevenue: number;
};

type TodayCourseViewModel = {
  id: string;
  title: string;
  timeText: string;
  durationText: string;
  coachName: string;
  locationText: string;
  statusText?: string;
  queueHintText?: string;
  actionText?: string;
};

type UpcomingBookingViewModel = {
  id: string;
  dayText: string;
  weekdayText: string;
  title: string;
  metaText: string;
  tagText?: string;
  scheduleHintText?: string;
};

type DashboardStatViewModel = {
  title: string;
  value: string;
  hint: string;
  tone: 'mint' | 'violet' | 'orange' | 'pink';
  icon: keyof typeof iconMap;
  compact?: boolean;
  emphasis?: 'default' | 'high';
  subtle?: boolean;
};

type AnomalyCardViewModel = {
  key: 'noShow' | 'cancelled' | 'pending';
  label: string;
  detail: string;
  count: number;
  tone: 'critical' | 'warn';
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

const bookingPriorityRank: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  COMPLETED: 2,
  NO_SHOW: 3,
  CANCELLED: 4,
};

const toValidDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const isSameCalendarDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

const deriveExecutionHintText = (status: string) => {
  if (status === 'PENDING') return '开课前完成确认与到场提醒';
  if (status === 'CONFIRMED') return '跟进签到与到课执行';
  if (status === 'NO_SHOW') return '优先安排未到场回访';
  if (status === 'COMPLETED') return '已完成，可回看复购线索';
  if (status === 'CANCELLED') return '确认取消原因并检查补位';
  return '进入预约管理核对当前状态';
};

const deriveExecutionActionText = (status: string) => {
  if (status === 'PENDING') return '立即确认';
  if (status === 'CONFIRMED') return '准备签到';
  if (status === 'NO_SHOW') return '发起回访';
  if (status === 'COMPLETED') return '查看复盘';
  if (status === 'CANCELLED') return '检查补位';
  return '进入预约管理';
};

const deriveScheduleHintText = (status: string) => {
  if (status === 'PENDING') return '待确认，建议提前完成通知';
  if (status === 'CONFIRMED') return '已确认，提前准备场地与签到';
  if (status === 'NO_SHOW') return '未到场，建议排入回访';
  if (status === 'COMPLETED') return '已完成，可关注后续复购';
  if (status === 'CANCELLED') return '已取消，留意候补需求';
  return '建议继续在预约管理中确认';
};

const formatTimeRange = (start?: string, end?: string) => {
  if (!start) return '时段信息未同步';

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return '时段信息未同步';

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
  if (!minutes || minutes <= 0) return '时长信息未同步';
  return `${minutes} min`;
};

const mapTodayCourses = (bookings: Booking[], courses: Course[]): TodayCourseViewModel[] => {
  const now = new Date();
  const sortedBookings = [...bookings].sort((left, right) => {
    const leftTime = toValidDate(left.session?.startsAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = toValidDate(right.session?.startsAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;

    if (leftTime !== rightTime) return leftTime - rightTime;
    return (bookingPriorityRank[left.status] ?? 99) - (bookingPriorityRank[right.status] ?? 99);
  });

  const todayQueue = sortedBookings.filter((item) => {
    const startsAt = toValidDate(item.session?.startsAt);
    if (!startsAt) return false;
    return isSameCalendarDay(startsAt, now);
  });

  const fallbackQueue = sortedBookings.filter((item) => item.status === 'PENDING' || item.status === 'CONFIRMED');
  const executionQueue = (todayQueue.length ? todayQueue : fallbackQueue).slice(0, 4);

  if (executionQueue.length > 0) {
    return executionQueue.map((item) => ({
      id: item.id,
      title: item.session?.course?.name || '课程待确认',
      timeText: formatTimeRange(item.session?.startsAt, item.session?.endsAt),
      durationText: `会员 ${item.member?.name || '待匹配'}`,
      coachName: item.session?.coach?.name || '待分配教练',
      locationText: item.source === 'MINI_PROGRAM' ? '小程序预约' : '后台预约',
      statusText: bookingStatusToLabel(item.status),
      queueHintText: deriveExecutionHintText(item.status),
      actionText: deriveExecutionActionText(item.status),
    }));
  }

  return courses.slice(0, 4).map((course) => ({
    id: course.id,
    title: course.name,
    timeText: '待补时段',
    durationText: `${formatDurationText(course.durationMinutes)} · ${course.type}`,
    coachName: course.coach?.name || '待分配教练',
    locationText: course.level ? `${course.level}课程` : '门店信息未同步',
    statusText: course.isActive ? '已确认' : '已取消',
    queueHintText: '当前暂无可用预约队列，建议先校对课程启停与教练排班。',
    actionText: '前往课程管理',
  }));
};

const mapUpcomingBookings = (items: Booking[]): UpcomingBookingViewModel[] => {
  const now = new Date();
  const normalized = items
    .map((item) => ({
      item,
      startsAt: toValidDate(item.session?.startsAt),
    }))
    .filter((entry): entry is { item: Booking; startsAt: Date } => entry.startsAt !== null)
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

  const nearTerm = normalized.filter((entry) => !isSameCalendarDay(entry.startsAt, now));
  const source = (nearTerm.length ? nearTerm : normalized).slice(0, 4);

  return source.map((entry) => ({
    id: entry.item.id,
    dayText: new Intl.DateTimeFormat('zh-CN', { day: '2-digit' }).format(entry.startsAt),
    weekdayText: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(entry.startsAt),
    title: entry.item.session?.course?.name || '课程待确认',
    metaText: `${formatTimeRange(entry.item.session?.startsAt, entry.item.session?.endsAt)} · ${entry.item.session?.coach?.name || '待分配教练'}`,
    tagText: bookingStatusToLabel(entry.item.status),
    scheduleHintText: deriveScheduleHintText(entry.item.status),
  }));
};

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
  const [partialFailures, setPartialFailures] = useState<string[]>([]);

  const metricAvailability = useMemo(
    () => ({
      memberStats: !partialFailures.includes('会员统计'),
      bookings: !partialFailures.includes('预约列表'),
      courses: !partialFailures.includes('课程列表'),
      coaches: !partialFailures.includes('教练列表'),
      revenue: !partialFailures.includes('交易汇总'),
    }),
    [partialFailures],
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [memberReportResult, coursesResult, coachesResult, bookingsResult, txSummaryResult] = await Promise.allSettled([
          reportsApi.getMembers(),
          coursesApi.getAll(),
          coachesApi.getAll(),
          bookingsApi.getAll({ page: 1, pageSize: 12 }),
          transactionsApi.getSummary(),
        ]);

        const failures: string[] = [];

        const memberReport = memberReportResult.status === 'fulfilled' ? memberReportResult.value : null;
        if (!memberReport) failures.push('会员统计');

        const coursesData = coursesResult.status === 'fulfilled' ? coursesResult.value : [];
        if (coursesResult.status !== 'fulfilled') failures.push('课程列表');

        const coachesData = coachesResult.status === 'fulfilled' ? coachesResult.value : [];
        if (coachesResult.status !== 'fulfilled') failures.push('教练列表');

        const bookingsRes = bookingsResult.status === 'fulfilled'
          ? bookingsResult.value
          : { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } };
        if (bookingsResult.status !== 'fulfilled') failures.push('预约列表');

        const txSummary = txSummaryResult.status === 'fulfilled'
          ? txSummaryResult.value
          : { totalRevenueCents: 0, pendingAmountCents: 0, refundedAmountCents: 0, todayRevenueCents: 0 };
        if (txSummaryResult.status !== 'fulfilled') failures.push('交易汇总');

        setPartialFailures(failures);

        setStats({
          totalMembers: memberReport?.totalMembers ?? 0,
          activeMembers: memberReport?.activeMembers ?? 0,
          newMembersThisMonth: memberReport?.newMembersThisMonth ?? 0,
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

  const pendingBookingCount = useMemo(
    () => bookingList.filter((item) => item.status === 'PENDING').length,
    [bookingList],
  );

  const noShowBookingCount = useMemo(
    () => bookingList.filter((item) => item.status === 'NO_SHOW').length,
    [bookingList],
  );

  const cancelledBookingCount = useMemo(
    () => bookingList.filter((item) => item.status === 'CANCELLED').length,
    [bookingList],
  );

  const unresolvedAnomalyCount = useMemo(
    () => noShowBookingCount + cancelledBookingCount,
    [noShowBookingCount, cancelledBookingCount],
  );

  const anomalyCards = useMemo(
    (): AnomalyCardViewModel[] => [
      {
        key: 'noShow',
        label: '未到场回访',
        detail: '优先回访并记录原因，避免连续流失。',
        count: noShowBookingCount,
        tone: 'critical',
      },
      {
        key: 'cancelled',
        label: '取消补位',
        detail: '确认取消原因并尽快安排补位。',
        count: cancelledBookingCount,
        tone: 'critical',
      },
      {
        key: 'pending',
        label: '待确认排队',
        detail: '按开课时段逐项确认，避免临时冲突。',
        count: pendingBookingCount,
        tone: 'warn',
      },
    ],
    [noShowBookingCount, cancelledBookingCount, pendingBookingCount],
  );

  const todayCourses = useMemo(
    () => mapTodayCourses(bookingList, courseList),
    [bookingList, courseList],
  );

  const dashboardStats = useMemo(
    (): DashboardStatViewModel[] => [
      {
        title: '待处理预约',
        value: metricAvailability.bookings ? String(bookingList.filter((item) => item.status === 'PENDING').length) : '--',
        hint: metricAvailability.bookings ? '优先处理待确认与异常回访' : '预约列表暂不可用',
        tone: 'orange' as const,
        icon: 'rise' as const,
        compact: true,
        emphasis: 'high',
        subtle: true,
      },
      {
        title: '今日执行',
        value: metricAvailability.bookings ? String(todayCourses.length) : '--',
        hint: metricAvailability.bookings ? '处理今日执行队列，保障签到到课' : '执行队列暂不可用',
        tone: 'mint' as const,
        icon: 'calendar' as const,
        compact: true,
        subtle: true,
      },
      {
        title: '活跃会员',
        value: metricAvailability.memberStats ? String(stats.activeMembers) : '--',
        hint: metricAvailability.memberStats
          ? `活跃率 ${stats.totalMembers ? ((stats.activeMembers / stats.totalMembers) * 100).toFixed(1) : 0}%`
          : '活跃率暂不可计算',
        tone: 'violet' as const,
        icon: 'team' as const,
        compact: true,
        subtle: true,
      },
      {
        title: '本月营收',
        value: metricAvailability.revenue ? `¥${stats.monthlyRevenue.toLocaleString('zh-CN')}` : '--',
        hint: metricAvailability.revenue ? '来源：交易汇总' : '交易汇总暂不可用',
        tone: 'pink' as const,
        icon: 'wallet' as const,
        compact: true,
        subtle: true,
      },
    ],
    [stats, bookingList, metricAvailability, todayCourses.length],
  );

  const upcomingBookings = useMemo(() => mapUpcomingBookings(bookingList), [bookingList]);

  const activeMemberRate = stats.totalMembers
    ? `${((stats.activeMembers / stats.totalMembers) * 100).toFixed(1)}%`
    : '0%';

  const activeCourseCount = courseList.filter((item) => item.isActive).length;
  const activeCoachCount = coachList.filter((item) => item.status === 'ACTIVE').length;

  const operationalMetrics = useMemo(
    () => [
      {
        label: '异常待跟进',
        value: metricAvailability.bookings ? `${unresolvedAnomalyCount} 项` : '--',
        hint: metricAvailability.bookings ? '先处理未到场与取消补位' : '预约列表暂不可用',
      },
      {
        label: '活跃率',
        value: metricAvailability.memberStats ? activeMemberRate : '--',
        hint: metricAvailability.memberStats ? `${stats.activeMembers}/${stats.totalMembers} 位会员活跃` : '会员统计暂不可用',
      },
      {
        label: '供给状态',
        value: metricAvailability.courses && metricAvailability.coaches ? `${activeCourseCount} 门` : '--',
        hint: metricAvailability.courses && metricAvailability.coaches ? `在岗教练 ${activeCoachCount} 位` : '课程或教练数据暂不可用',
      },
      {
        label: '本月新增',
        value: metricAvailability.memberStats ? `${stats.newMembersThisMonth} 位` : '--',
        hint: metricAvailability.memberStats ? '关注新会员首月留存与转化' : '会员统计暂不可用',
      },
    ],
    [stats, metricAvailability, unresolvedAnomalyCount, activeMemberRate, activeCourseCount, activeCoachCount],
  );

  if (loading) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage} ${pageCls.centeredState} ${pageCls.centeredStateMedium}`}>
        {contextHolder}
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={`${pageCls.page} ${pageCls.workPage}`}>
      {contextHolder}
      <PageHeader
        title="仪表盘"
        subtitle={partialFailures.length
          ? `部分模块暂不可用：${partialFailures.join('、')}`
          : '运营总览与今日动态。'}
      />

      {partialFailures.length ? (
        <SectionCard
          title="部分数据加载失败"
          subtitle={`未成功加载：${partialFailures.join('、')}`}
        >
          <div className={styles.partialFailureWrap}>
            <span className={styles.partialFailurePill}>稍后刷新</span>
          </div>
        </SectionCard>
      ) : null}

      <div className={styles.dashboardStack}>
        <div className={`${pageCls.dashboardHeroGrid} ${styles.kpiGrid}`}>
          {dashboardStats.map((item) => (
            <StatCard
              key={item.title}
              title={item.title}
              value={item.value}
              hint={item.hint}
              tone={item.tone}
              icon={iconMap[item.icon]}
              compact={item.compact}
              emphasis={item.emphasis}
              subtle={item.subtle}
            />
          ))}
        </div>

        <section className={styles.taskFocusSection}>
          <div className={styles.taskFocusHeader}>
            <div className={styles.taskFocusContent}>
              <div className={styles.taskFocusEyebrow}>运营焦点</div>
              <div className={styles.taskFocusTitle}>先清异常，再推进今日执行</div>
              <div className={styles.taskNorthStar}>
                今日执行 {todayCourses.length} 项，未来排程 {metricAvailability.bookings ? upcomingBookings.length : 0} 项。
              </div>
            </div>
            <Button
              type="default"
              size="large"
              className={styles.taskFocusAction}
              onClick={() => go('/bookings')}
            >
              去预约管理处理
            </Button>
          </div>

          <div
            className={`${styles.anomalyPriorityBlock} ${metricAvailability.bookings && unresolvedAnomalyCount > 0 ? styles.anomalyPriorityBlockCritical : ''}`}
          >
            <div className={styles.anomalyPriorityHead}>
              <div>
                <div className={styles.anomalyPriorityTitle}>异常优先处理</div>
              </div>
              <span className={styles.anomalyPrioritySummary}>
                {metricAvailability.bookings
                  ? unresolvedAnomalyCount > 0
                    ? `异常 ${unresolvedAnomalyCount} 单`
                    : '当前无异常'
                  : '预约数据暂不可用'}
              </span>
            </div>

            <div className={styles.anomalyPriorityGrid}>
              {anomalyCards.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`${styles.anomalyPriorityCard} ${item.tone === 'critical' ? styles.anomalyPriorityCardCritical : styles.anomalyPriorityCardWarn}`}
                  onClick={() => go('/bookings')}
                >
                  <div className={styles.anomalyPriorityCardHead}>
                    <span className={styles.anomalyPriorityCardLabel}>{item.label}</span>
                    <span className={styles.anomalyPriorityCardCount}>
                      {metricAvailability.bookings ? `${item.count} 单` : '--'}
                    </span>
                  </div>
                  <div className={styles.anomalyPriorityCardDetail}>{item.detail}</div>
                </button>
                ))}
            </div>
          </div>

          <div className={styles.taskPanelsGrid}>
            <TodayCoursePanel
              items={todayCourses}
              anomalyCount={metricAvailability.bookings ? noShowBookingCount + cancelledBookingCount : 0}
              onViewDetail={() => go('/bookings')}
            />
            <UpcomingBookingsPanel
              items={upcomingBookings}
              onViewDetail={() => go('/bookings')}
            />
          </div>
        </section>

        <SectionCard title="运营诊断" subtitle="只保留需要用于判断优先级的摘要信号。">
          <div className={styles.operationalMetricsGrid}>
            {operationalMetrics.map((item) => (
              <div key={item.label} className={styles.operationalMetricCard}>
                <div className={styles.operationalMetricLabel}>{item.label}</div>
                <div className={styles.operationalMetricValue}>{item.value}</div>
                <div className={styles.operationalMetricHint}>{item.hint}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
