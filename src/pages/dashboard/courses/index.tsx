import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import { todayCourses } from '@/mock';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';

export default function DashboardCoursesPage() {
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  const fullCount = todayCourses.filter((item) => item.status === '已满').length;
  const openCount = todayCourses.length - fullCount;

  return (
    <div className={`${pageCls.page} ${pageCls.showcasePage}`}>
      <PageHeader
        title="今日课程排期"
        subtitle="从仪表盘快速查看今日课程节奏，优先识别满班时段与待提升场次。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <div className={widgetCls.dashboardSubpageTag}>仪表盘子页 · 课程摘要</div>
      <div className={widgetCls.dashboardSubpageHint}>这里用于放大今日课程概况，帮助你快速判断排期与容量节奏；如需编辑课程或排班，请进入正式课程模块。</div>

      <div className={pageCls.balancedTwoCol}>
        <SectionCard
          title="课程总览"
          subtitle="保留仪表盘摘要逻辑，但把今天的课程状态看得更完整。"
          extra={<Button type="text" className={widgetCls.dashboardCardAction} onClick={() => go('/courses')}>进入完整课程模块</Button>}
        >
          <div className={widgetCls.detailOverviewGrid}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.detailOverviewSummary}>
                <div className={widgetCls.detailInsightLabel}>今日排课节奏</div>
                <div className={widgetCls.detailOverviewLead}>今天共 {todayCourses.length} 节课程，其中 {fullCount} 节已满班，{openCount} 节仍有可优化空间。</div>
                <div className={widgetCls.detailOverviewText}>这类页面保留“仪表盘子页”的快速判断特性：先帮你看全局，再决定是否进入完整课程模块做排课、调整或通知。</div>
              </div>
              <div className={widgetCls.chipRow}>
                <span className={widgetCls.chipPrimary}>今日课程 {todayCourses.length} 节</span>
                <span className={widgetCls.chip}>满班课程 {fullCount} 节</span>
                <span className={widgetCls.chip}>可提升课程 {openCount} 节</span>
              </div>
            </div>

            <div className={widgetCls.detailOverviewAside}>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.metricLabel}>已排课程</div>
                  <div className={widgetCls.detailOverviewStatValue}>{todayCourses.length}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.metricLabel}>满班时段</div>
                  <div className={widgetCls.detailOverviewStatValue}>{fullCount}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.metricLabel}>待优化</div>
                  <div className={widgetCls.detailOverviewStatValue}>{openCount}</div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="今日动作建议" subtitle="作为钻取页，它只解决优先级判断，不替代完整课程模块。">
          <div className={widgetCls.infoStack}>
            <div>• 先处理已满课程的候补与通知安排。</div>
            <div>• 重点关注上座率偏低的时段，判断是否调整课程类型或教练配置。</div>
            <div>• 若需要编辑课程结构、容量或周期，请进入完整课程模块处理。</div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="课程时段列表" subtitle="保留轻量预览形式，支持快速跳入正式模块。">
        <div className={widgetCls.recordListDense}>
          {todayCourses.map((course) => (
            <div key={`${course.time}-${course.title}`} className={`${widgetCls.recordItem} ${widgetCls.showcaseRecordItem}`}>
              <div className={widgetCls.detailCourseMeta}>
                <div className={widgetCls.recordTitle}>{course.time} · {course.title}</div>
                <div className={widgetCls.recordSub}>{course.type} · 教练 {course.coach}</div>
              </div>
              <div className={widgetCls.dashboardCourseAside}>
                <div className={widgetCls.dashboardNumberText}>{course.booking}</div>
                <StatusTag status={course.status} />
                <Button size="large" className={pageCls.cardActionSecondary} onClick={() => go('/courses')}>进入课程模块</Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
