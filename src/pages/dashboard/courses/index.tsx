import { Button } from 'antd';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import { todayCourses } from '@/mock';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { useNavigate } from 'react-router-dom';

export default function DashboardCoursesPage() {
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  const fullCount = todayCourses.filter((item) => item.status === '已满').length;

  return (
    <div className={pageCls.page}>
      <PageHeader
        title="今日课程排期"
        subtitle="仪表盘内课程钻取视图，关注今日排班与容量状态。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <SectionCard title="课程时段列表" subtitle="按开课时间排序" extra={<Button type="text" onClick={() => go('/courses')}>进入完整课程模块</Button>}>
        <div className={widgetCls.recordListDense}>
          {todayCourses.map((course) => (
            <div key={`${course.time}-${course.title}`} className={widgetCls.recordItem}>
              <div>
                <div className={widgetCls.recordTitle}>{course.time} · {course.title}</div>
                <div className={widgetCls.recordSub}>{course.type} · 教练 {course.coach}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>{course.booking}</strong>
                <StatusTag status={course.status} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className={pageCls.threeCol}>
        <div className={widgetCls.metricCard}>
          <div className={widgetCls.metricLabel}>今日课程数</div>
          <div className={widgetCls.metricValue}>{todayCourses.length}</div>
        </div>
        <div className={widgetCls.metricCard}>
          <div className={widgetCls.metricLabel}>满班课程</div>
          <div className={widgetCls.metricValue}>{fullCount}</div>
        </div>
        <div className={widgetCls.metricCard}>
          <div className={widgetCls.metricLabel}>待提升时段</div>
          <div className={widgetCls.metricValue}>{todayCourses.length - fullCount}</div>
        </div>
      </div>
    </div>
  );
}
