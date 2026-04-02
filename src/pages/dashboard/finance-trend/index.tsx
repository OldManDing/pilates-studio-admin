import { LineChartOutlined, PieChartOutlined, WalletOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ActionButton from '@/components/ActionButton';
import { createChartTooltip } from '@/components/ChartTooltip';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { financeBar, financeStats, revenueStructure, transactions } from '@/mock';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { formatCurrency, formatPercent } from '@/utils/format';
import { useIsMobile } from '@/utils/useResponsive';
import { useNavigate } from 'react-router-dom';

const iconMap = {
  wallet: <WalletOutlined />,
  pay: <WalletOutlined />,
  line: <LineChartOutlined />,
  pie: <PieChartOutlined />
};

const DashboardFinanceTrendTooltip = createChartTooltip({
  labelMap: {
    revenue: '营收',
    profit: '利润'
  },
  valueFormatter: (value) => (typeof value === 'number' ? formatCurrency(value * 1000) : value)
});

const DashboardFinanceStructureTooltip = createChartTooltip({
  labelMap: {
    value: '占比'
  },
  titleFormatter: (_, payload) => (typeof payload[0]?.name === 'string' ? payload[0].name : '营收构成'),
  valueFormatter: (value) => (typeof value === 'number' ? formatPercent(value) : value)
});

export default function DashboardFinanceTrendPage() {
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  const isMobile = useIsMobile();

  return (
    <div className={`${pageCls.page} ${pageCls.showcasePage}`}>
      <PageHeader
        title="财务趋势钻取"
        subtitle="来自仪表盘的财务摘要页，聚焦营收变化与结构分布。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <div className={widgetCls.dashboardSubpageTag}>仪表盘子页 · 财务摘要</div>
      <div className={widgetCls.dashboardSubpageHint}>这里用于快速放大营收趋势和收入结构，帮助你判断是否需要进入正式财务模块继续核对交易与明细。</div>

      <div className={pageCls.heroGrid}>
        {financeStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={pageCls.financeTwoCol}>
        <SectionCard title="营收与利润趋势" subtitle="近 7 个月走势">
          <div className={pageCls.chartPanelTall}>
            <ResponsiveContainer>
              <BarChart data={financeBar}>
                <defs>
                  <linearGradient id="dashboardFinanceRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#43c7ab" stopOpacity={0.96} />
                    <stop offset="100%" stopColor="#6be0c8" stopOpacity={0.78} />
                  </linearGradient>
                  <linearGradient id="dashboardFinanceProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b7cff" stopOpacity={0.96} />
                    <stop offset="100%" stopColor="#b2a8ff" stopOpacity={0.76} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(148, 163, 184, 0.14)" strokeDasharray="3 5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip content={<DashboardFinanceTrendTooltip />} />
                <Bar dataKey="revenue" fill="url(#dashboardFinanceRevenue)" radius={[10, 10, 0, 0]} barSize={isMobile ? 16 : 26} />
                <Bar dataKey="profit" fill="url(#dashboardFinanceProfit)" radius={[10, 10, 0, 0]} barSize={isMobile ? 16 : 26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: item.fill, display: 'inline-block' }} />
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
          {transactions.map((item) => (
            <div key={`${item.name}-${item.date}`} className={`${widgetCls.recordItem} ${widgetCls.showcaseRecordItem}`}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={item.name} tone={item.tone} />
                <div>
                  <div className={widgetCls.recordTitle} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {item.name}
                    <StatusTag status={item.status} />
                  </div>
                  <div className={widgetCls.recordSub}>{item.type}</div>
                  <div className={widgetCls.recordSub}>{item.date}</div>
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{item.amount}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
