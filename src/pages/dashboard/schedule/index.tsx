import { Col, Row } from 'antd';
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import { scheduleCards } from '@/mock';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { useNavigate } from 'react-router-dom';

export default function DashboardSchedulePage() {
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);

  return (
    <div className={pageCls.page}>
      <PageHeader
        title="教练排班明细"
        subtitle="查看本周关键教练时段分布，快速识别高峰与空档。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <SectionCard title="本周排班卡片" subtitle="按教练维度查看班表强度" extra={<ActionButton ghost onClick={() => go('/coaches')}>进入教练模块</ActionButton>}>
        <div className={widgetCls.courseGrid}>
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
    </div>
  );
}
