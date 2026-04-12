import { useEffect, useMemo, useState } from 'react';
import { Button, Spin, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import { coursesApi, type Course } from '@/services/courses';
import { getErrorMessage } from '@/utils/errors';
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
      } catch (err) {
        messageApi.error(getErrorMessage(err, '加载课程数据失败，请稍后重试'));
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [messageApi]);

  const fullCount = useMemo(() => courses.filter((item) => (item._count?.sessions || 0) >= item.capacity).length, [courses]);
  const openCount = Math.max(0, courses.length - fullCount);

  if (loading) {
    return <div className={`${pageCls.page} ${pageCls.dashboardSubpageLoadingState}`}><Spin /></div>;
  }

  return (
    <div className={`${pageCls.page} ${pageCls.workPage}`}>
      {contextHolder}
      <PageHeader
        title="课程排课快捷入口"
        subtitle="仪表盘二级入口：用于快速判断容量与排期概况，详细排课调整请进入课程管理执行。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <div className={pageCls.balancedTwoCol}>
        <SectionCard title="课程总览（快捷）" subtitle="摘要视图，仅用于分流到课程管理。" extra={<Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/courses')}>进入课程管理</Button>}>
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>这里只用于判断是否需要进入课程管理继续处理，不承担完整排课与配置工作流。</div>
              <span className={pageCls.sectionMetaPill}>{fullCount} 节接近满班</span>
            </div>
          <div className={widgetCls.detailOverviewGrid}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.detailOverviewSummary}>
                <div className={widgetCls.detailInsightLabel}>今日排课节奏</div>
                <div className={widgetCls.detailOverviewLead}>今天共 {courses.length} 节课程，其中 {fullCount} 节已接近满班，{openCount} 节仍有优化空间。</div>
                <div className={widgetCls.detailOverviewText}>具体排课、启停用与配置调整统一在课程管理页完成。</div>
              </div>
            </div>
          </div>
          </div>
        </SectionCard>

        <SectionCard title="动作建议（辅助）" subtitle="在快捷页判断优先级，具体执行统一进入课程管理。">
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>先判断是否存在容量风险，再决定是否进入课程管理做后续调整。</div>
              <span className={pageCls.sectionMetaPill}>{openCount} 节可优化</span>
            </div>
            <div className={widgetCls.infoStack}>
            <div>• 先判断满班风险，再决定是否进入课程管理。</div>
            <div>• 对低上座课程评估时段与教练配置。</div>
            <div>• 所有具体调整都在课程管理页执行并留痕。</div>
          </div>
          </div>
        </SectionCard>
      </div>

       <SectionCard title="课程摘要列表" subtitle="仅保留摘要字段，不替代课程管理完整工作流。">
        <div className={pageCls.sectionContentStack}>
          <div className={pageCls.sectionSummaryRow}>
            <div className={pageCls.sectionSummaryText}>这里只保留最少字段帮助判断密度是否异常，详情与编辑统一进入课程管理。</div>
            <span className={pageCls.sectionMetaPill}>实时容量摘要</span>
          </div>
        <div className={widgetCls.recordListDense}>
          {courses.map((course) => {
            const sessionCount = course._count?.sessions || 0;
            const status = course.isActive ? (sessionCount >= course.capacity ? '已满' : '已确认') : '已取消';
            return (
             <div key={course.id} className={`${widgetCls.recordItem} ${widgetCls.workRecordItem}`}>
                <div className={widgetCls.detailCourseMeta}>
                  <div className={widgetCls.recordTitle}>{course.name}</div>
                  <div className={widgetCls.recordSub}>{course.type} · {course.level} · 教练 {course.coach?.name || '待分配'}</div>
                </div>
                <div className={widgetCls.dashboardCourseAside}>
                  <div className={widgetCls.dashboardNumberText}>{sessionCount}/{course.capacity}</div>
                  <StatusTag status={status} />
                  <Button size="large" className={pageCls.cardActionSecondary} onClick={() => go('/courses')}>前往课程管理</Button>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </SectionCard>
    </div>
  );
}
