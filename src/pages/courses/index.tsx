import { AppstoreOutlined, CalendarOutlined, PlusOutlined, StarOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { courseStats, courses } from '@/mock';

const iconMap = {
  calendar: <CalendarOutlined />,
  app: <AppstoreOutlined />,
  percent: <CalendarOutlined />,
  star: <StarOutlined />
};

export default function CoursesPage() {
  return (
    <div className={pageCls.page}>
      <PageHeader
        title="课程管理"
        subtitle="管理所有课程设置和排期。"
        extra={<ActionButton icon={<PlusOutlined />}>创建课程</ActionButton>}
      />

      <div className={pageCls.heroGrid}>
        {courseStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={widgetCls.courseGrid}>
        {courses.map((course) => (
          <div key={course.name} className={widgetCls.detailCard}>
            <div className={widgetCls.detailHeader}>
              <div>
                <h3 className={widgetCls.detailTitle}>{course.name}</h3>
                <div className={widgetCls.chipRow} style={{ marginTop: 10 }}>
                  <span className={widgetCls.chipPrimary}>{course.type}</span>
                </div>
              </div>
              <span className={widgetCls.chipLevel}>{course.level}</span>
            </div>

            <div className={widgetCls.metricGrid}>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>教练</div>
                <div className={widgetCls.metricValue}>{course.coach}</div>
              </div>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>时长</div>
                <div className={widgetCls.metricValue}>{course.duration}</div>
              </div>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>容量</div>
                <div className={widgetCls.metricValue}>{course.capacity}</div>
              </div>
            </div>

            <div className={widgetCls.infoStack} style={{ marginTop: 18 }}>
              <div>频次：{course.weekly}</div>
              <div className={widgetCls.chipRow}>
                {course.schedule.map((item) => (
                  <span key={item} className={widgetCls.chip}>{item}</span>
                ))}
              </div>
            </div>

            <div className={widgetCls.twoButtons}>
              <Button type="primary" size="large" className={pageCls.cardActionPrimary}>编辑课程</Button>
              <Button size="large" className={pageCls.cardActionSecondary}>查看详情</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
