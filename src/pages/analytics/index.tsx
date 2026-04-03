import { HeartOutlined, RiseOutlined, SmileOutlined } from '@ant-design/icons';
import { Progress, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { createChartTooltip } from '@/components/ChartTooltip';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { popularityData, radarData, bookingDistribution, retentionData, peakPeriodData } from '@/mock';
import { reportsApi } from '@/services/reports';
import { bookingsApi } from '@/services/bookings';
import { useIsMobile } from '@/utils/useResponsive';

const chartGrid = 'rgba(148, 163, 184, 0.14)';
const axisTick = { fill: '#6f8198', fontSize: 12, fontWeight: 600 };
const PopularityTooltip = createChartTooltip({
  labelMap: {
    value: '热度指数'
  },
  valueFormatter: (value) => (typeof value === 'number' ? `${value} 分` : value)
});

const RadarTooltip = createChartTooltip({
  labelMap: {
    score: '综合评分'
  },
  titleFormatter: (_, payload) => {
    const subject = payload[0]?.payload?.subject;
    return typeof subject === 'string' ? subject : '综合评分';
  },
  valueFormatter: (value) => (typeof value === 'number' ? `${value} 分` : value)
});

const BookingDistributionTooltip = createChartTooltip({
  labelMap: {
    value: '预约人次'
  },
  valueFormatter: (value) => (typeof value === 'number' ? `${value} 人次` : value)
});

const RetentionTooltip = createChartTooltip({
  labelMap: {
    retained: '留存会员',
    newUsers: '新增会员',
    churn: '流失会员'
  },
  valueFormatter: (value) => (typeof value === 'number' ? `${value} 人` : value)
});

const iconMap = {
  target: <RiseOutlined />,
  retention: <HeartOutlined />,
  seat: <RiseOutlined />,
  smile: <SmileOutlined />
};

export default function AnalyticsPage() {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    goalAchievement: '112%',
    retentionRate: '94.2%',
    avgOccupancy: '87.3%',
    satisfaction: '4.8 / 5',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const to = new Date().toISOString().split('T')[0];

        const [membersReport, bookingsReport] = await Promise.all([
          reportsApi.getMembers().catch(() => null),
          reportsApi.getBookings(from, to).catch(() => null),
        ]);

        // Calculate derived metrics
        const totalMembers = membersReport?.totalMembers || 0;
        const activeMembers = membersReport?.activeMembers || 0;
        const retentionRate = totalMembers > 0 ? ((activeMembers / totalMembers) * 100).toFixed(1) : '0';

        const totalBookings = bookingsReport?.totalBookings || 0;
        const confirmedBookings = bookingsReport?.confirmedBookings || 0;
        const occupancyRate = totalBookings > 0 ? ((confirmedBookings / totalBookings) * 100).toFixed(1) : '0';

        setStats({
          goalAchievement: '112%',
          retentionRate: `${retentionRate}%`,
          avgOccupancy: `${occupancyRate}%`,
          satisfaction: '4.8 / 5',
        });
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const analyticsStats = [
    { title: '目标达成率', value: stats.goalAchievement, hint: '超额完成月度目标', tone: 'mint' as const, icon: 'target' as const },
    { title: '会员留存率', value: stats.retentionRate, hint: '↑ 1.8% 环比', tone: 'violet' as const, icon: 'retention' as const },
    { title: '平均上座率', value: stats.avgOccupancy, hint: '高峰时段表现突出', tone: 'orange' as const, icon: 'seat' as const },
    { title: '整体满意度', value: stats.satisfaction, hint: '基于会员问卷', tone: 'pink' as const, icon: 'smile' as const },
  ];

  if (loading) {
    return (
      <div className={pageCls.page}>
        <PageHeader title="数据分析" subtitle="深度洞察业务数据和运营指标。" />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className={pageCls.page}>
      <PageHeader title="数据分析" subtitle="深度洞察业务数据和运营指标。" />

      <div className={pageCls.heroGrid}>
        {analyticsStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={pageCls.analyticsPrimaryTwoCol}>
        <SectionCard title="课程受欢迎程度" subtitle="不同课程欢迎度排名">
          <div className={pageCls.chartPanel}>
            <ResponsiveContainer>
              <BarChart data={popularityData}>
                <defs>
                  <linearGradient id="analyticsBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#43c7ab" stopOpacity={0.96} />
                    <stop offset="100%" stopColor="#6be0c8" stopOpacity={0.76} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={chartGrid} strokeDasharray="3 5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} angle={isMobile ? 0 : -15} textAnchor={isMobile ? 'middle' : 'end'} height={isMobile ? 38 : 64} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip cursor={{ fill: 'rgba(67, 199, 171, 0.09)' }} content={<PopularityTooltip />} />
                <Bar dataKey="value" fill="url(#analyticsBar)" radius={[10, 10, 0, 0]} barSize={isMobile ? 18 : 28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="综合评分" subtitle="课程、服务与环境综合得分">
          <div className={pageCls.chartPanel}>
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(148, 163, 184, 0.28)" />
                <PolarAngleAxis dataKey="subject" tick={{ ...axisTick, fontSize: isMobile ? 10 : 12 }} />
                <Radar name="评分" dataKey="score" stroke="#8b7cff" strokeWidth={2.5} fill="#8b7cff" fillOpacity={0.32} />
                <Tooltip content={<RadarTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className={pageCls.twoCol}>
        <SectionCard title="预约时段分布" subtitle="观察高峰与低峰时段变化">
          <div className={pageCls.chartPanel}>
            <ResponsiveContainer>
              <LineChart data={bookingDistribution}>
                <CartesianGrid vertical={false} stroke={chartGrid} strokeDasharray="3 5" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip cursor={{ stroke: '#ffb760', strokeDasharray: '4 4' }} content={<BookingDistributionTooltip />} />
                <Line type="monotone" dataKey="value" stroke="#ffb760" strokeWidth={3.4} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="会员留存分析" subtitle="新增、留存与流失趋势">
          <div className={pageCls.chartPanel}>
            <ResponsiveContainer>
              <LineChart data={retentionData}>
                <CartesianGrid vertical={false} stroke={chartGrid} strokeDasharray="3 5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip content={<RetentionTooltip />} />
                <Line type="monotone" dataKey="retained" stroke="#8b7cff" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="newUsers" stroke="#43c7ab" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="churn" stroke="#ff8da8" strokeWidth={2.5} strokeDasharray="6 6" dot={{ r: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="高峰时段分析" subtitle="拆解预约结构，辅助课程排班优化">
        <div className={pageCls.fourCol}>
          {peakPeriodData.map((item) => (
            <div key={item.label} className={widgetCls.metricCard}>
              <div className={widgetCls.metricLabel}>{item.label}</div>
              <div className={widgetCls.smallText}>{item.time}</div>
              <div className={widgetCls.metricValue}>{item.percent}%</div>
              <div className={widgetCls.smallText}>{item.total} 次预约</div>
              <Progress percent={item.percent} showInfo={false} strokeColor={item.color} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
