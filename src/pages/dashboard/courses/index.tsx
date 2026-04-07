import { useEffect, useMemo, useState } from 'react';
import { Button, Spin, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import { coursesApi, type Course } from '@/services/courses';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';

export default function DashboardCoursesPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const data = await coursesApi.getAll();
        setCourses(data || []);
      } catch (err: any) {
        messageApi.error(err.message || '加载课程数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const fullCount = useMemo(() => courses.filter((item) => (item._count?.sessions || 0) >= item.capacity).length, [courses]);
  const openCount = Math.max(0, courses.length - fullCount);

  if (loading) {
    return <div className={pageCls.page} style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><Spin /></div>;
  }

  return (
    <div className={`${pageCls.page} ${pageCls.showcasePage}`}>
      {contextHolder}
      <PageHeader
        title="今日课程排期"
        subtitle="从仪表盘快速查看今日课程节奏，优先识别满班时段与待提升场次。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <div className={pageCls.balancedTwoCol}>
        <SectionCard title="课程总览" subtitle="真实课程数据驱动" extra={<Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/courses')}>进入完整课程模块</Button>}>
          <div className={widgetCls.detailOverviewGrid}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.detailOverviewSummary}>
                <div className={widgetCls.detailInsightLabel}>今日排课节奏</div>
                <div className={widgetCls.detailOverviewLead}>今天共 {courses.length} 节课程，其中 {fullCount} 节已接近满班，{openCount} 节仍有优化空间。</div>
                <div className={widgetCls.detailOverviewText}>这页用于快速判断课程排期结构，具体排课调整请在课程管理页完成。</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="动作建议" subtitle="按容量优先级处理课程">
          <div className={widgetCls.infoStack}>
            <div>• 优先检查满班课程的候补策略与提醒通知。</div>
            <div>• 对低上座课程评估时段与教练配置。</div>
            <div>• 具体调整在课程管理页执行，确保流程可追踪。</div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="课程时段列表" subtitle="真实课程列表（摘要）">
        <div className={widgetCls.recordListDense}>
          {courses.map((course) => {
            const sessionCount = course._count?.sessions || 0;
            const status = course.isActive ? (sessionCount >= course.capacity ? '已满' : '已确认') : '已取消';
            return (
              <div key={course.id} className={`${widgetCls.recordItem} ${widgetCls.showcaseRecordItem}`}>
                <div className={widgetCls.detailCourseMeta}>
                  <div className={widgetCls.recordTitle}>{course.name}</div>
                  <div className={widgetCls.recordSub}>{course.type} · {course.level} · 教练 {course.coach?.name || '待分配'}</div>
                </div>
                <div className={widgetCls.dashboardCourseAside}>
                  <div className={widgetCls.dashboardNumberText}>{sessionCount}/{course.capacity}</div>
                  <StatusTag status={status} />
                  <Button size="large" className={pageCls.cardActionSecondary} onClick={() => go('/courses')}>进入课程模块</Button>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
