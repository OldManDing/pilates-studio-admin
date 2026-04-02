import { useEffect, useMemo, useState, type CSSProperties, type WheelEvent } from 'react';
import { Button, Col, Progress, Row } from 'antd';
import {
  CalendarOutlined,
  RiseOutlined,
  TeamOutlined,
  WalletOutlined
} from '@ant-design/icons';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { createChartTooltip } from '@/components/ChartTooltip';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { getToneColor } from '@/utils/format';
import { dashboardStats, memberTrend, scheduleCards, todayBookings, todayCourses } from '@/mock';

const iconMap = {
  wallet: <WalletOutlined />,
  team: <TeamOutlined />,
  calendar: <CalendarOutlined />,
  rise: <RiseOutlined />
};

const memberTrendLabels = {
  total: '总会员',
  active: '活跃会员'
} as const;

const totalTrendTone = getToneColor('mint');
const activeTrendTone = getToneColor('orange');
const visibleCourseCount = 4;

const memberTrendLegendStyles: Record<keyof typeof memberTrendLabels, CSSProperties> = {
  total: { ['--legend-color' as string]: totalTrendTone.solid },
  active: { ['--legend-color' as string]: activeTrendTone.solid }
};

const MemberTrendTooltip = createChartTooltip({
  labelMap: memberTrendLabels,
  valueFormatter: (value) => (typeof value === 'number' ? `${value} 人` : value)
});

export default function DashboardPage() {
  const navigate = useNavigate();
  const [courseCarouselIndex, setCourseCarouselIndex] = useState(0);
  const [courseCarouselAnimating, setCourseCarouselAnimating] = useState(true);
  const [courseCarouselPaused, setCourseCarouselPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const go = (path: string) => navigate(path);

  const courseCarouselEnabled = todayCourses.length > visibleCourseCount && !reduceMotion;

  const courseCarouselItems = useMemo(
    () => (courseCarouselEnabled ? [...todayCourses, ...todayCourses.slice(0, visibleCourseCount)] : todayCourses),
    [courseCarouselEnabled]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setReduceMotion(mediaQuery.matches);
    syncMotionPreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncMotionPreference);
      return () => mediaQuery.removeEventListener('change', syncMotionPreference);
    }

    mediaQuery.addListener(syncMotionPreference);
    return () => mediaQuery.removeListener(syncMotionPreference);
  }, []);

  useEffect(() => {
    if (!courseCarouselEnabled || courseCarouselPaused) {
      setCourseCarouselIndex(0);
      setCourseCarouselAnimating(true);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCourseCarouselAnimating(true);
      setCourseCarouselIndex((current) => current + 1);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [courseCarouselEnabled, courseCarouselPaused]);

  const handleCourseCarouselTransitionEnd = () => {
    if (courseCarouselIndex !== todayCourses.length) {
      return;
    }

    setCourseCarouselAnimating(false);
    setCourseCarouselIndex(0);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setCourseCarouselAnimating(true));
    });
  };

  const handleCourseCarouselWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!courseCarouselEnabled) {
      return;
    }

    event.preventDefault();
    setCourseCarouselPaused(true);
    setCourseCarouselAnimating(true);
    setCourseCarouselIndex((current) => {
      if (event.deltaY > 0) {
        return Math.min(current + 1, todayCourses.length);
      }

      if (event.deltaY < 0) {
        return Math.max(current - 1, 0);
      }

      return current;
    });
  };

  const renderCourseItem = (course: (typeof todayCourses)[number], index: number) => (
    <div
      key={`${course.time}-${course.title}-${index}`}
      className={`${widgetCls.recordItem} ${widgetCls.dashboardCourseItem} ${courseCarouselEnabled ? widgetCls.dashboardCourseCarouselItem : ''}`}
      aria-hidden={courseCarouselEnabled && index >= todayCourses.length}
    >
      <div className={widgetCls.recordMeta}>
        <div className={widgetCls.dashboardTimeBadge}>{course.time}</div>
        <div className={widgetCls.dashboardCourseInfo}>
          <div className={widgetCls.recordTitle}>{course.title}</div>
          <div className={widgetCls.recordSub}>
            {course.type} · 教练 {course.coach}
          </div>
        </div>
      </div>
      <div className={widgetCls.dashboardCourseAside}>
        <div className={widgetCls.dashboardNumberText}>{course.booking}</div>
        <StatusTag status={course.status} />
      </div>
    </div>
  );

  return (
    <div className={pageCls.page}>
      <PageHeader
        title="仪表盘"
        subtitle="欢迎回来，今天门店运营状态健康，课程、预约与会员增长都在稳定上升。"
      />

      <div className={pageCls.dashboardHeroGrid}>
        {dashboardStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={pageCls.dashboardSectionGrid}>
        <SectionCard
          title="今日课程"
          subtitle="2026 年 4 月 1 日 · 共 18 节课程"
          extra={<Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/dashboard/courses')}>查看全部</Button>}
        >
          {courseCarouselEnabled ? (
            <div className={widgetCls.dashboardCourseCarousel}>
              <div
                className={widgetCls.dashboardCourseCarouselViewport}
                onMouseEnter={() => setCourseCarouselPaused(true)}
                onMouseLeave={() => setCourseCarouselPaused(false)}
                onWheel={handleCourseCarouselWheel}
              >
                <div
                  className={`${widgetCls.dashboardCourseCarouselTrack} ${!courseCarouselAnimating ? widgetCls.dashboardCourseCarouselTrackStatic : ''}`}
                  style={{
                    transform: `translateY(calc(-${courseCarouselIndex} * (var(--dashboard-course-item-height) + var(--dashboard-course-carousel-gap))))`
                  }}
                  onTransitionEnd={handleCourseCarouselTransitionEnd}
                >
                  {courseCarouselItems.map(renderCourseItem)}
                </div>
              </div>
            </div>
          ) : (
            <div className={widgetCls.recordListDense}>{todayCourses.map(renderCourseItem)}</div>
          )}
        </SectionCard>

        <SectionCard
          title="今日预约"
          subtitle="实时同步最新预约状态"
          extra={<Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/dashboard/bookings')}>查看全部</Button>}
        >
          <div className={widgetCls.recordList}>
            {todayBookings.map((item) => (
              <div key={item.name} className={widgetCls.recordItem}>
                <div className={`${widgetCls.recordMeta} ${widgetCls.dashboardBookingMeta}`}>
                  <MemberAvatar name={item.name} tone={item.tone} />
                  <div className={widgetCls.dashboardBookingBody}>
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
                <Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/dashboard/bookings')}>详情</Button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className={pageCls.dashboardSectionGrid}>
        <SectionCard
          title="教练排班"
          subtitle="本周排班概览"
          extra={<Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/dashboard/schedule')}>编辑排班</Button>}
        >
          <div className={widgetCls.recordListDense}>
            {scheduleCards.map((coach) => (
              <div key={coach.name} className={`${widgetCls.detailCard} ${widgetCls.dashboardMagneticCard}`}>
                <div className={widgetCls.detailHeader}>
                  <div className={widgetCls.recordMeta}>
                    <MemberAvatar name={coach.name} tone={coach.tone} />
                    <div>
                      <div className={`${widgetCls.recordTitle} ${widgetCls.dashboardCoachName}`}>{coach.name}</div>
                      <div className={widgetCls.recordSub}>
                        本周总课节数 <span className={widgetCls.dashboardInlineNumber}>{coach.sessions}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Row gutter={[12, 12]}>
                  {coach.slots.map((slot) => (
                    <Col span={12} key={`${coach.name}-${slot.day}`}>
                      <div className={widgetCls.metricCard}>
                        <div className={widgetCls.metricLabel}>{slot.day}</div>
                        <div className={`${widgetCls.metricValue} ${widgetCls.dashboardScheduleTime}`}>{slot.time}</div>
                        <div className={widgetCls.dashboardCountTag}>{slot.count}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="会员增长趋势"
          subtitle="过去 7 个月数据分析"
          extra={(
            <div className={widgetCls.dashboardTrendLegend} aria-label="总会员与活跃会员图例">
              {(Object.keys(memberTrendLabels) as Array<keyof typeof memberTrendLabels>).map((key) => (
                <div key={key} className={widgetCls.dashboardTrendLegendItem} style={memberTrendLegendStyles[key]}>
                  <span className={widgetCls.dashboardTrendLegendLine} aria-hidden="true" />
                  <span>{memberTrendLabels[key]}</span>
                </div>
              ))}
            </div>
          )}
        >
          <div className={pageCls.chartPanel}>
            <ResponsiveContainer>
              <AreaChart data={memberTrend}>
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={totalTrendTone.solid} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={totalTrendTone.solid} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeTrendTone.solid} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={activeTrendTone.solid} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip content={<MemberTrendTooltip />} />
                <Area type="monotone" dataKey="total" name={memberTrendLabels.total} stroke={totalTrendTone.solid} fill="url(#totalGradient)" strokeWidth={3} />
                <Area type="monotone" dataKey="active" name={memberTrendLabels.active} stroke={activeTrendTone.solid} fill="url(#activeGradient)" strokeWidth={3} />
                <Line type="monotone" dataKey="active" name={memberTrendLabels.active} stroke={activeTrendTone.solid} strokeWidth={3} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={widgetCls.detailFooterRow}>
            <div className={widgetCls.smallText}>继续查看增长趋势的月度变化与活跃率细分，再决定是否进入完整会员模块执行跟进。</div>
            <Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/dashboard/growth')}>进入趋势子页</Button>
          </div>

          <div className={pageCls.summaryGrid}>
            <div className={`${widgetCls.metricCard} ${widgetCls.dashboardSummaryCard} ${widgetCls.dashboardSummaryCardMint}`}>
              <div className={widgetCls.metricLabel}>当前总会员</div>
              <div className={widgetCls.metricValue}>521</div>
            </div>
            <div className={`${widgetCls.metricCard} ${widgetCls.dashboardSummaryCard} ${widgetCls.dashboardSummaryCardOrange}`}>
              <div className={widgetCls.metricLabel}>活跃会员</div>
              <div className={widgetCls.metricValue}>445</div>
            </div>
            <div className={`${widgetCls.metricCard} ${widgetCls.dashboardSummaryCard} ${widgetCls.dashboardSummaryCardViolet}`}>
              <div className={widgetCls.metricLabel}>活跃率</div>
              <div className={widgetCls.metricValue}>85.4%</div>
              <Progress percent={85.4} showInfo={false} strokeColor={totalTrendTone.solid} />
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
