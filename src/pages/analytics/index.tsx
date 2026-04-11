import { HeartOutlined, RiseOutlined, SmileOutlined } from '@ant-design/icons';
import { Progress, Spin, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { analyticsApi } from '@/services/analytics';
import { getErrorMessage } from '@/utils/errors';
import { axisTick, chartGrid } from '@/utils/chartTheme';
import { useIsMobile } from '@/utils/useResponsive';

const iconMap = {
  target: <RiseOutlined />,
  retention: <HeartOutlined />,
  seat: <RiseOutlined />,
  smile: <SmileOutlined />,
};

type ChartPoint = { label: string; value: number };

export default function AnalyticsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    goalAchievement: '0%',
    retentionRate: '0%',
    avgOccupancy: '0%',
    satisfaction: '-',
  });
  const [coursePopularity, setCoursePopularity] = useState<ChartPoint[]>([]);
  const [bookingDistribution, setBookingDistribution] = useState<ChartPoint[]>([]);
  const [memberRetentionTrend, setMemberRetentionTrend] = useState<Array<{ month: string; totalMembers: number; activeMembers: number; newMembers: number }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const to = new Date().toISOString().split('T')[0];

        const [overview, bookingDistributionData, retentionTrend] = await Promise.all([
          analyticsApi.getDashboardOverview(from, to),
          analyticsApi.getBookingDistribution(from, to),
          analyticsApi.getMemberRetentionTrend(),
        ]);

        setStats({
          goalAchievement: `${overview.stats.goalAchievement}%`,
          retentionRate: `${overview.stats.retentionRate}%`,
          avgOccupancy: `${overview.stats.avgOccupancy}%`,
          satisfaction: overview.stats.satisfaction === null ? '-' : `${overview.stats.satisfaction}%`,
        });

        const popularity = overview.transactionPopularity || [];
        setCoursePopularity(popularity.length ? popularity : [{ label: '暂无', value: 0 }]);
        setBookingDistribution(bookingDistributionData.length ? bookingDistributionData : [{ label: '暂无', value: 0 }]);
        setMemberRetentionTrend(retentionTrend);
      } catch (err) {
        messageApi.error(getErrorMessage(err, '加载数据失败，请稍后重试'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const analyticsStats = useMemo(
    () => [
      { title: '目标达成率', value: stats.goalAchievement, hint: '基于营收目标达成率', tone: 'mint' as const, icon: 'target' as const },
      { title: '会员留存率', value: stats.retentionRate, hint: '续费会员 / 到期会员', tone: 'violet' as const, icon: 'retention' as const },
      { title: '平均上座率', value: stats.avgOccupancy, hint: '确认预约占比', tone: 'orange' as const, icon: 'seat' as const },
      { title: '整体满意度', value: stats.satisfaction, hint: '待接入课程评价数据', tone: 'pink' as const, icon: 'smile' as const },
    ],
    [stats]
  );

  if (loading) {
    return (
      <div className={pageCls.page}>
        <PageHeader title="数据分析" subtitle="深度洞察业务数据和运营指标。" />
        <div className={`${pageCls.centeredState} ${pageCls.centeredStateShort}`}><Spin size="large" /></div>
      </div>
    );
  }

  return (
    <div className={pageCls.page}>
      {contextHolder}
      <PageHeader title="数据分析" subtitle="深度洞察业务数据和运营指标。" />

      <div className={pageCls.heroGrid}>
        {analyticsStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={pageCls.twoCol}>
        <SectionCard title="交易类型热度" subtitle="按交易类型统计近 30 天发生次数">
          <div className={pageCls.chartPanel}>
            <ResponsiveContainer>
              <BarChart data={coursePopularity}>
                <CartesianGrid vertical={false} stroke={chartGrid} strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip />
                <Bar dataKey="value" fill="#43c7ab" radius={[10, 10, 0, 0]} barSize={isMobile ? 18 : 28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="预约时段分布" subtitle="按真实预约时段聚合最近 30 天热度">
          <div className={pageCls.chartPanel}>
            <ResponsiveContainer>
              <LineChart data={bookingDistribution}>
                <CartesianGrid vertical={false} stroke={chartGrid} strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#ffb760" strokeWidth={3.2} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="会员留存趋势" subtitle="近 6 个月会员总量、活跃量与新增趋势">
        <div className={pageCls.chartPanel}>
          <ResponsiveContainer>
            <LineChart data={memberRetentionTrend}>
              <CartesianGrid vertical={false} stroke={chartGrid} strokeDasharray="3 5" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisTick} />
              <YAxis axisLine={false} tickLine={false} tick={axisTick} />
              <Tooltip />
              <Line type="monotone" dataKey="totalMembers" stroke="#43c7ab" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="activeMembers" stroke="#8b7cff" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="newMembers" stroke="#ff8da8" strokeWidth={2.5} strokeDasharray="6 6" dot={{ r: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
