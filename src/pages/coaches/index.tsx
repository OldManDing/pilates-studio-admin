import { CalendarOutlined, HeartOutlined, PlusOutlined, StarOutlined, TeamOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { coachStats, coaches } from '@/mock';

const iconMap = {
  team: <TeamOutlined />,
  star: <StarOutlined />,
  calendar: <CalendarOutlined />,
  heart: <HeartOutlined />
};

export default function CoachesPage() {
  return (
    <div className={pageCls.page}>
      <PageHeader
        title="教练管理"
        subtitle="管理教练信息、排班和绩效。"
        extra={<ActionButton icon={<PlusOutlined />}>添加教练</ActionButton>}
      />

      <div className={pageCls.heroGrid}>
        {coachStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={widgetCls.coachGrid}>
        {coaches.map((coach) => (
          <div key={coach.name} className={widgetCls.detailCard}>
            <div className={widgetCls.detailHeader}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={coach.name} tone={coach.tone} />
                <div>
                  <div className={widgetCls.recordTitle} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {coach.name}
                    <StatusTag status={coach.status} />
                  </div>
                  <div className={widgetCls.recordSub}>{coach.experience} · 评分 {coach.rating}</div>
                </div>
              </div>
            </div>

            <div className={widgetCls.infoStack}>
              <div>电话：{coach.phone}</div>
              <div>邮箱：{coach.email}</div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className={widgetCls.smallText}>专长领域</div>
              <div className={widgetCls.chipRow} style={{ marginTop: 8 }}>
                {coach.specialties.map((item) => (
                  <span key={item} className={widgetCls.chip}>{item}</span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className={widgetCls.smallText}>资质认证</div>
              <div className={widgetCls.chipRow} style={{ marginTop: 8 }}>
                {coach.certificates.map((item) => (
                  <span key={item} className={widgetCls.chip}>{item}</span>
                ))}
              </div>
            </div>

            <div className={widgetCls.metricGrid} style={{ marginTop: 18 }}>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>总课程数</div>
                <div className={widgetCls.metricValue}>{coach.totalCourses}</div>
              </div>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>本周课程</div>
                <div className={widgetCls.metricValue}>{coach.weeklyCourses}</div>
              </div>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>满意度</div>
                <div className={widgetCls.metricValue}>{coach.rating}</div>
              </div>
            </div>

            <div className={widgetCls.twoButtons}>
              <Button type="primary" size="large" className={pageCls.cardActionHalf}>编辑资料</Button>
              <Button size="large" className={pageCls.cardActionHalf}>排班管理</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
