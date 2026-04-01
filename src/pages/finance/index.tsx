import { DownloadOutlined, LineChartOutlined, PieChartOutlined, WalletOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { financeBar, financeStats, revenueStructure, transactions } from '@/mock';
import { useIsMobile } from '@/utils/useResponsive';

const chartGrid = 'rgba(148, 163, 184, 0.14)';
const axisTick = { fill: '#6f8198', fontSize: 12, fontWeight: 600 };
const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.84)',
  boxShadow: '0 12px 28px rgba(28, 45, 71, 0.12)',
  background: 'rgba(255,255,255,0.97)',
  padding: '8px 10px'
};

const iconMap = {
  wallet: <WalletOutlined />,
  pay: <WalletOutlined />,
  line: <LineChartOutlined />,
  pie: <PieChartOutlined />
};

export default function FinancePage() {
  const isMobile = useIsMobile();

  return (
    <div className={pageCls.page}>
      <PageHeader title="财务报表" subtitle="查看营收、支出与门店财务分析。" extra={<ActionButton icon={<DownloadOutlined />}>导出报表</ActionButton>} />

      <div className={pageCls.heroGrid}>
        {financeStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={pageCls.financeTwoCol}>
        <SectionCard title="营收趋势" subtitle="过去 7 个月营收与利润对比">
          <div className={pageCls.chartPanelTall}>
            <ResponsiveContainer>
              <BarChart data={financeBar}>
                <defs>
                  <linearGradient id="financeRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#43c7ab" stopOpacity={0.96} />
                    <stop offset="100%" stopColor="#6be0c8" stopOpacity={0.78} />
                  </linearGradient>
                  <linearGradient id="financeProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b7cff" stopOpacity={0.96} />
                    <stop offset="100%" stopColor="#b2a8ff" stopOpacity={0.76} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={chartGrid} strokeDasharray="3 5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip cursor={{ fill: 'rgba(139, 124, 255, 0.08)' }} contentStyle={tooltipStyle} />
                <Bar dataKey="revenue" fill="url(#financeRevenue)" radius={[10, 10, 0, 0]} barSize={isMobile ? 16 : 26} />
                <Bar dataKey="profit" fill="url(#financeProfit)" radius={[10, 10, 0, 0]} barSize={isMobile ? 16 : 26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="营收构成" subtitle="按会员类型分类">
          <div className={pageCls.chartPanelTall}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={revenueStructure} dataKey="value" nameKey="name" innerRadius={isMobile ? 52 : 74} outerRadius={isMobile ? 82 : 108} paddingAngle={3} stroke="rgba(255,255,255,0.9)">
                  {revenueStructure.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
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

      <SectionCard title="最近交易" subtitle="最新收款记录" extra={<Button type="text">查看全部</Button>}>
        <div className={widgetCls.recordList}>
          {transactions.map((item) => (
            <div key={`${item.name}-${item.date}`} className={widgetCls.recordItem}>
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
