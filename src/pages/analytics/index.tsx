import { HeartOutlined, RiseOutlined, SmileOutlined } from '@ant-design/icons';
import { Progress, Spin, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { reportsApi } from '@/services/reports';
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const to = new Date().toISOString().split('T')[0];

        const [membersReport, bookingsReport, transactionsReport] = await Promise.all([
          reportsApi.getMembers(),
          reportsApi.getBookings(from, to),
          reportsApi.getTransactions(from, to),
        ]);

        const totalMembers = membersReport.totalMembers || 0;
        const activeMembers = membersReport.activeMembers || 0;
        const retentionRate = totalMembers > 0 ? ((activeMembers / totalMembers) * 100).toFixed(1) : '0';

        const totalBookings = bookingsReport.totalBookings || 0;
        const confirmedBookings = bookingsReport.confirmedBookings || 0;
        const occupancyRate = totalBookings > 0 ? ((confirmedBookings / totalBookings) * 100).toFixed(1) : '0';

        const goalAchievement = totalMembers > 0 ? Math.min(150, Math.round((activeMembers / Math.max(1, totalMembers * 0.8)) * 100)) : 0;

        setStats({
          goalAchievement: `${goalAchievement}%`,
          retentionRate: `${retentionRate}%`,
          avgOccupancy: `${occupancyRate}%`,
          satisfaction: '-', // 后端暂无此接口
        });

        const popularity = (transactionsReport.transactionsByKind || []).map((item) => ({
          label: item.kind,
          value: item._count?.id || 0,
        }));
        setCoursePopularity(popularity.length ? popularity : [{ label: '暂无', value: 0 }]);
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
      { title: '目标达成率', value: stats.goalAchievement, hint: '基于活跃会员占比', tone: 'mint' as const, icon: 'target' as const },
      { title: '会员留存率', value: stats.retentionRate, hint: '活跃/总会员', tone: 'violet' as const, icon: 'retention' as const },
      { title: '平均上座率', value: stats.avgOccupancy, hint: '确认预约占比', tone: 'orange' as const, icon: 'seat' as const },
      { title: '整体满意度', value: stats.satisfaction, hint: '待接入问卷或评价数据', tone: 'pink' as const, icon: 'smile' as const },
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

        <SectionCard title="预约时段分布" subtitle="待接入真实时段聚合接口后展示">
          <div className={pageCls.chartPanelEmpty}>
            <div className={widgetCls.detailOverviewLead}>暂无真实预约时段分布数据</div>
            <div className={widgetCls.detailOverviewText}>当前版本不再展示按比例估算的上午 / 中午 / 下午 / 晚间分布，避免误导运营判断。</div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="会员留存趋势" subtitle="待接入真实历史留存、流失与新增指标后展示">
        <div className={pageCls.chartPanelEmpty}>
          <div className={widgetCls.detailOverviewLead}>暂无真实会员留存趋势数据</div>
          <div className={widgetCls.detailOverviewText}>原先基于当前活跃会员和本月新增会员按比例推导的趋势已移除，避免把估算值展示成真实经营指标。</div>
        </div>
      </SectionCard>
    </div>
  );
}
