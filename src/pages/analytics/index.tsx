import { HeartOutlined, RiseOutlined, SmileOutlined } from '@ant-design/icons';
import { Progress, Select, Spin, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { createChartTooltip } from '@/components/ChartTooltip';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import pageCls from '@/styles/page.module.css';
import { analyticsApi } from '@/services/analytics';
import { getErrorMessage } from '@/utils/errors';
import { axisTick, chartGrid } from '@/utils/chartTheme';
import { useIsMobile } from '@/utils/useResponsive';
import styles from './index.module.css';

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
  const [rangeKey, setRangeKey] = useState<'7d' | '30d' | '90d'>('30d');
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
        const dayCount = rangeKey === '7d' ? 7 : rangeKey === '90d' ? 90 : 30;
        const from = new Date(Date.now() - dayCount * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
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
  }, [messageApi, rangeKey]);

  const analyticsStats = useMemo(
    () => [
      { title: '目标达成率', value: stats.goalAchievement, hint: '基于营收目标达成率', tone: 'mint' as const, icon: 'target' as const },
      { title: '会员留存率', value: stats.retentionRate, hint: '续费会员 / 到期会员', tone: 'violet' as const, icon: 'retention' as const },
      { title: '平均上座率', value: stats.avgOccupancy, hint: '确认预约占比', tone: 'orange' as const, icon: 'seat' as const },
      { title: '整体满意度', value: stats.satisfaction, hint: '课程反馈', tone: 'pink' as const, icon: 'smile' as const },
    ],
    [stats]
  );

  const analyticsScopeText = `分析范围：近 ${rangeKey === '7d' ? '7' : rangeKey === '90d' ? '90' : '30'} 天交易与预约分布，外加近 6 个月会员留存趋势。`;
  const rangeLabel = rangeKey === '7d' ? '近 7 天' : rangeKey === '90d' ? '近 90 天' : '近 30 天';

  const TrendTooltipRenderer = createChartTooltip({
    labelMap: {
      totalMembers: '会员总量',
      activeMembers: '活跃会员',
      newMembers: '新增会员',
    },
  });

  const DistributionTooltipRenderer = createChartTooltip({
    labelMap: { value: '预约热度' },
  });

  const PopularityTooltipRenderer = createChartTooltip({
    labelMap: { value: '交易次数' },
  });

  if (loading) {
    return (
      <div className={`${pageCls.page} ${styles.analyticsPage}`}>
        <PageHeader title="数据分析" />
        <div className={`${pageCls.centeredState} ${pageCls.centeredStateShort}`}>
          <Spin size="large" />
          <div className={pageCls.centeredStateText}>正在加载分析数据…</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${pageCls.page} ${styles.analyticsPage}`}>
      {contextHolder}
      <PageHeader
        title="数据分析"
        subtitle={analyticsScopeText}
        extra={
          <Select
            value={rangeKey}
            className={`${pageCls.settingsInput} ${pageCls.toolbarSelect}`}
            options={[
              { label: '近 7 天', value: '7d' },
              { label: '近 30 天', value: '30d' },
              { label: '近 90 天', value: '90d' },
            ]}
            onChange={(value: '7d' | '30d' | '90d') => setRangeKey(value)}
          />
        }
      />

      <div className={pageCls.heroGrid}>
        {analyticsStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <SectionCard title="分析总览">
        <div className={styles.analyticsSummaryCard}>
          <div className={styles.analyticsSummaryRow}>
            <div className={styles.analyticsSummaryText}>聚焦当前时间窗口内的交易热度、预约分布与会员留存。</div>
            <span className={styles.analyticsScopePill}>可切换时间窗口</span>
          </div>
          <div className={styles.analyticsProgressCard}>
            <div className={styles.analyticsProgressItem}>
              <div className={styles.analyticsProgressLabel}>目标达成</div>
              <div className={styles.analyticsProgressValue}>{stats.goalAchievement}</div>
              <Progress percent={Number.parseFloat(stats.goalAchievement) || 0} showInfo={false} strokeColor="linear-gradient(90deg, var(--mint) 0%, var(--control-primary-end) 100%)" />
              <div className={styles.analyticsProgressHint}>营收目标完成率。</div>
            </div>
            <div className={styles.analyticsProgressItem}>
              <div className={styles.analyticsProgressLabel}>会员留存</div>
              <div className={styles.analyticsProgressValue}>{stats.retentionRate}</div>
              <Progress percent={Number.parseFloat(stats.retentionRate) || 0} showInfo={false} strokeColor="linear-gradient(90deg, var(--violet) 0%, color-mix(in srgb, var(--violet) 62%, var(--mint)) 100%)" />
              <div className={styles.analyticsProgressHint}>会员留存概览。</div>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className={pageCls.twoCol}>
        <SectionCard title="交易类型热度" subtitle={`按交易类型统计 ${rangeLabel} 发生次数`}>
          <div className={styles.analyticsChartCard}>
            <div className={styles.analyticsLegend}>
              <span className={styles.analyticsLegendItem}><span className={styles.analyticsLegendDot} style={{ background: 'var(--mint)' }} />交易次数</span>
            </div>
            <div className={pageCls.chartPanel}>
            <ResponsiveContainer>
              <BarChart data={coursePopularity}>
                <CartesianGrid vertical={false} stroke={chartGrid} strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip content={<PopularityTooltipRenderer />} />
                <Bar dataKey="value" fill="var(--mint)" radius={[10, 10, 0, 0]} barSize={isMobile ? 18 : 28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          </div>
        </SectionCard>

        <SectionCard title="预约时段分布" subtitle={`按真实预约时段聚合 ${rangeLabel} 热度`}>
          <div className={styles.analyticsChartCard}>
            <div className={styles.analyticsLegend}>
              <span className={styles.analyticsLegendItem}><span className={styles.analyticsLegendDot} style={{ background: 'var(--orange)' }} />预约热度</span>
            </div>
            <div className={pageCls.chartPanel}>
            <ResponsiveContainer>
              <LineChart data={bookingDistribution}>
                <CartesianGrid vertical={false} stroke={chartGrid} strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip content={<DistributionTooltipRenderer />} />
                <Line type="monotone" dataKey="value" stroke="var(--orange)" strokeWidth={3.2} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="会员留存趋势" subtitle="近 6 个月会员总量、活跃量与新增趋势">
        <div className={styles.analyticsChartCard}>
          <div className={styles.analyticsLegend}>
            <span className={styles.analyticsLegendItem}><span className={styles.analyticsLegendDot} style={{ background: 'var(--mint)' }} />会员总量</span>
            <span className={styles.analyticsLegendItem}><span className={styles.analyticsLegendDot} style={{ background: 'var(--violet)' }} />活跃会员</span>
            <span className={styles.analyticsLegendItem}><span className={styles.analyticsLegendDot} style={{ background: 'var(--pink)' }} />新增会员</span>
          </div>
          <div className={pageCls.chartPanel}>
          <ResponsiveContainer>
            <LineChart data={memberRetentionTrend}>
              <CartesianGrid vertical={false} stroke={chartGrid} strokeDasharray="3 5" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisTick} />
              <YAxis axisLine={false} tickLine={false} tick={axisTick} />
              <Tooltip content={<TrendTooltipRenderer />} />
              <Line type="monotone" dataKey="totalMembers" stroke="var(--mint)" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="activeMembers" stroke="var(--violet)" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="newMembers" stroke="var(--pink)" strokeWidth={2.5} strokeDasharray="6 6" dot={{ r: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        </div>
      </SectionCard>
    </div>
  );
}
