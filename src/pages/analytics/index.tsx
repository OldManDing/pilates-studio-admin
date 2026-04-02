import { HeartOutlined, RiseOutlined, SmileOutlined } from '@ant-design/icons';
import { Progress } from 'antd';
import { Bar, BarChart, CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { createChartTooltip } from '@/components/ChartTooltip';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { analyticsStats, bookingDistribution, peakPeriodData, popularityData, radarData, retentionData } from '@/mock';
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
