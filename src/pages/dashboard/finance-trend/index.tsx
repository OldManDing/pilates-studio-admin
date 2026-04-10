import { LineChartOutlined, PieChartOutlined, WalletOutlined } from '@ant-design/icons';
import { Button, Spin, message } from 'antd';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import { createChartTooltip } from '@/components/ChartTooltip';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { reportsApi } from '@/services/reports';
import { transactionsApi, type Transaction } from '@/services/transactions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { getErrorMessage } from '@/utils/errors';
import { formatCurrency, formatPercent } from '@/utils/format';
import { useIsMobile } from '@/utils/useResponsive';
import { chartGrid } from '@/utils/chartTheme';

const iconMap = {
  wallet: <WalletOutlined />,
  pay: <WalletOutlined />,
  line: <LineChartOutlined />,
  pie: <PieChartOutlined />,
};

const kindLabelMap: Record<string, string> = {
  MEMBERSHIP_PURCHASE: '会籍购买',
  MEMBERSHIP_RENEWAL: '会籍续费',
  CLASS_PACKAGE_PURCHASE: '课程套餐',
  PRIVATE_CLASS_PURCHASE: '私教课程',
  REFUND: '退款',
  ADJUSTMENT: '调整',
};

const DashboardFinanceTrendTooltip = createChartTooltip({
  labelMap: { revenue: '营收' },
  valueFormatter: (value) => (typeof value === 'number' ? formatCurrency(value) : value),
});

const DashboardFinanceStructureTooltip = createChartTooltip({
  labelMap: { value: '占比' },
  titleFormatter: (_, payload) => (typeof payload[0]?.name === 'string' ? payload[0].name : '营收构成'),
  valueFormatter: (value) => (typeof value === 'number' ? formatPercent(value) : value),
});

export default function DashboardFinanceTrendPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [financeStats, setFinanceStats] = useState<Array<{ title: string; value: string; hint: string; tone: 'mint' | 'violet' | 'orange' | 'pink'; icon: 'wallet' | 'pay' | 'line' | 'pie' }>>([]);
  const [financeBar, setFinanceBar] = useState<Array<{ month: string; revenue: number }>>([]);
  const [revenueStructure, setRevenueStructure] = useState<Array<{ name: string; value: number; fill: string }>>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const from = new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1).toISOString().split('T')[0];
        const to = new Date().toISOString().split('T')[0];

        const [summary, report, txList] = await Promise.all([
          transactionsApi.getSummary(),
          reportsApi.getTransactions(from, to),
          transactionsApi.getAll({ page: 1, pageSize: 20, from, to }),
        ]);

        const totalRevenue = Math.round((summary.totalRevenueCents || 0) / 100);
        const refunded = Math.round((summary.refundedAmountCents || 0) / 100);
        const pending = Math.round((summary.pendingAmountCents || 0) / 100);
        const net = totalRevenue - refunded;

        setFinanceStats([
          { title: '累计营收', value: formatCurrency(totalRevenue), hint: '来自交易汇总', tone: 'mint', icon: 'wallet' },
          { title: '待处理金额', value: formatCurrency(pending), hint: '待结算交易', tone: 'orange', icon: 'pay' },
          { title: '净营收', value: formatCurrency(net), hint: '营收 - 退款', tone: 'violet', icon: 'line' },
          { title: '退款占比', value: totalRevenue ? `${((refunded / totalRevenue) * 100).toFixed(1)}%` : '0%', hint: '退款监控', tone: 'pink', icon: 'pie' },
        ]);

        const monthlyMap: Record<string, { revenue: number }> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          monthlyMap[`${d.getMonth() + 1}月`] = { revenue: 0 };
        }
        (txList.data || []).forEach((tx) => {
          const key = `${new Date(tx.happenedAt).getMonth() + 1}月`;
          if (monthlyMap[key]) {
            const amount = (tx.amountCents || 0) / 100;
            monthlyMap[key].revenue += amount;
          }
        });
        setFinanceBar(
          Object.entries(monthlyMap).map(([month, values]) => ({
            month,
            revenue: Math.round(values.revenue),
          }))
        );

        const colorMap: Record<string, string> = {
          MEMBERSHIP_PURCHASE: '#43c7ab',
          MEMBERSHIP_RENEWAL: '#8b7cff',
          CLASS_PACKAGE_PURCHASE: '#ff8da8',
          PRIVATE_CLASS_PURCHASE: '#ffb760',
          REFUND: '#73a7ff',
          ADJUSTMENT: '#73a7ff',
        };
        const totalKindRevenue = (report.transactionsByKind || []).reduce((sum, item) => sum + Number(item._sum?.amountCents || 0), 0);
        const structure = (report.transactionsByKind || []).map((item) => {
          const mappedKind = item.kind;
          const amount = Number(item._sum?.amountCents || 0);
          const ratio = totalKindRevenue ? Number(((amount / totalKindRevenue) * 100).toFixed(1)) : 0;
          return {
            name: kindLabelMap[mappedKind] || mappedKind,
            value: ratio,
            fill: colorMap[mappedKind] || '#999',
          };
        });
        setRevenueStructure(structure);
        setTransactions(txList.data || []);
      } catch (err) {
        messageApi.error(getErrorMessage(err, '加载财务数据失败，请稍后重试'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className={`${pageCls.page} ${pageCls.centeredState} ${pageCls.centeredStateTop}`}><Spin /></div>;
  }

  return (
    <div className={`${pageCls.page} ${pageCls.showcasePage}`}>
      {contextHolder}
      <PageHeader
        title="财务趋势钻取"
        subtitle="聚焦营收变化与收入结构。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <div className={pageCls.heroGrid}>
        {financeStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={pageCls.financeTwoCol}>
        <SectionCard title="营收趋势" subtitle="近 7 个月真实营收走势">
          <div className={pageCls.chartPanelTall}>
            <ResponsiveContainer>
              <BarChart data={financeBar}>
                <defs>
                  <linearGradient id="dashboardFinanceRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#43c7ab" stopOpacity={0.96} />
                    <stop offset="100%" stopColor="#6be0c8" stopOpacity={0.78} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={chartGrid} strokeDasharray="3 5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip content={<DashboardFinanceTrendTooltip />} />
                <Bar dataKey="revenue" fill="url(#dashboardFinanceRevenue)" radius={[10, 10, 0, 0]} barSize={isMobile ? 16 : 26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={widgetCls.smallText}>利润趋势待接入真实支出或成本数据后展示，当前不再使用固定利润率估算。</div>
        </SectionCard>

        <SectionCard title="营收构成占比" subtitle="会员与课程收入结构">
          <div className={pageCls.chartPanelTall}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={revenueStructure} dataKey="value" nameKey="name" innerRadius={isMobile ? 52 : 74} outerRadius={isMobile ? 82 : 108} paddingAngle={3} stroke="rgba(255,255,255,0.9)">
                  {revenueStructure.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Pie>
                <Tooltip content={<DashboardFinanceStructureTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={widgetCls.recordList}>
            {revenueStructure.map((item) => (
              <div key={item.name} className={pageCls.rowBetween}>
                <div className={pageCls.legendLabelRow}>
                  <span className={pageCls.legendDot} style={{ background: item.fill }} />
                  <span>{item.name}</span>
                </div>
                <strong>{item.value}%</strong>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="最近交易" subtitle="用于快速核对现金流" extra={<Button type="text" onClick={() => go('/finance')}>进入完整财务模块</Button>}>
        <div className={widgetCls.recordList}>
          {transactions.map((item, idx) => (
            <div key={item.id} className={`${widgetCls.recordItem} ${widgetCls.showcaseRecordItem}`}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={item.member?.name || '-'} tone={['mint', 'violet', 'orange', 'pink'][idx % 4] as any} />
                <div>
                  <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                    {item.member?.name || '-'}
                    <StatusTag status={item.status === 'COMPLETED' ? '已完成' : item.status === 'PENDING' ? '处理中' : item.status === 'REFUNDED' ? '已取消' : '处理中'} />
                  </div>
                  <div className={widgetCls.recordSub}>{kindLabelMap[item.kind] || item.kind}</div>
                  <div className={widgetCls.recordSub}>{new Date(item.happenedAt).toLocaleDateString('zh-CN')}</div>
                </div>
              </div>
              <div className={pageCls.metricValueStrong}>{formatCurrency(item.amountCents / 100)}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
