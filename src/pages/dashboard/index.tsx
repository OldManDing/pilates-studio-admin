import { Button, Col, Progress, Row } from 'antd';
import {
  ArrowUpOutlined,
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
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { dashboardStats, memberTrend, scheduleCards, todayBookings, todayCourses } from '@/mock';

const iconMap = {
  wallet: <WalletOutlined />,
  team: <TeamOutlined />,
  calendar: <CalendarOutlined />,
  rise: <RiseOutlined />
};

export default function DashboardPage() {
  return (
    <div className={pageCls.page}>
      <PageHeader
        title="仪表盘"
        subtitle="欢迎回来，今天门店运营状态健康，课程、预约与会员增长都在稳定上升。"
        extra={<ActionButton icon={<ArrowUpOutlined />}>本周概览</ActionButton>}
      />

      <div className={pageCls.heroGrid}>
        {dashboardStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={pageCls.balancedTwoCol}>
        <SectionCard title="今日课程" subtitle="2026 年 4 月 1 日 · 共 18 节课程" extra={<StatusTag status="已确认" />}>
          <div className={widgetCls.recordListDense}>
            {todayCourses.map((course) => (
              <div key={`${course.time}-${course.title}`} className={widgetCls.recordItem}>
                <div className={widgetCls.recordMeta}>
                  <div style={{ width: 72, fontWeight: 800, fontSize: 22 }}>{course.time}</div>
                  <div>
                    <div className={widgetCls.recordTitle}>{course.title}</div>
                    <div className={widgetCls.recordSub}>
                      {course.type} · 教练 {course.coach}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700 }}>{course.booking}</div>
                  <StatusTag status={course.status} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="今日预约" subtitle="实时同步最新预约状态" extra={<Button type="text">查看全部</Button>}>
          <div className={widgetCls.recordList}>
            {todayBookings.map((item) => (
              <div key={item.name} className={widgetCls.recordItem}>
                <div className={widgetCls.recordMeta}>
                  <MemberAvatar name={item.name} tone={item.tone} />
                  <div>
                    <div className={widgetCls.recordTitle} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {item.name}
                      <StatusTag status={item.status} />
                    </div>
                    <div className={widgetCls.recordSub}>{item.course}</div>
                    <div className={widgetCls.recordSub}>{item.phone}</div>
                  </div>
                </div>
                <Button type="text">详情</Button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className={pageCls.balancedTwoCol}>
        <SectionCard title="教练排班" subtitle="本周排班概览" extra={<Button type="text">编辑排班</Button>}>
          <div className={widgetCls.recordListDense}>
            {scheduleCards.map((coach) => (
              <div key={coach.name} className={widgetCls.detailCard}>
                <div className={widgetCls.detailHeader}>
                  <div className={widgetCls.recordMeta}>
                    <MemberAvatar name={coach.name} tone={coach.tone} />
                    <div>
                      <div className={widgetCls.recordTitle}>{coach.name}</div>
                      <div className={widgetCls.recordSub}>本周总课节数 {coach.sessions}</div>
                    </div>
                  </div>
                </div>
                <Row gutter={[12, 12]}>
                  {coach.slots.map((slot) => (
                    <Col span={12} key={`${coach.name}-${slot.day}`}>
                      <div className={widgetCls.metricCard}>
                        <div className={widgetCls.metricLabel}>{slot.day}</div>
                        <div className={widgetCls.metricValue} style={{ fontSize: 16 }}>{slot.time}</div>
                        <div className={widgetCls.smallText}>{slot.count}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="会员增长趋势" subtitle="过去 7 个月数据分析">
          <div style={{ width: '100%', height: 294 }}>
            <ResponsiveContainer>
              <AreaChart data={memberTrend}>
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#43c7ab" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#43c7ab" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b7cff" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#8b7cff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#43c7ab" fill="url(#totalGradient)" strokeWidth={3} />
                <Area type="monotone" dataKey="active" stroke="#8b7cff" fill="url(#activeGradient)" strokeWidth={3} />
                <Line type="monotone" dataKey="active" stroke="#8b7cff" strokeWidth={3} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={pageCls.summaryGrid}>
            <div className={widgetCls.metricCard}>
              <div className={widgetCls.metricLabel}>当前总会员</div>
              <div className={widgetCls.metricValue}>521</div>
            </div>
            <div className={widgetCls.metricCard}>
              <div className={widgetCls.metricLabel}>活跃会员</div>
              <div className={widgetCls.metricValue}>445</div>
            </div>
            <div className={widgetCls.metricCard}>
              <div className={widgetCls.metricLabel}>活跃率</div>
              <div className={widgetCls.metricValue}>85.4%</div>
              <Progress percent={85.4} showInfo={false} strokeColor="#43c7ab" />
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
