import { Button } from 'antd';
import EmptyState from '@/components/EmptyState';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import widgetCls from '@/styles/widgets.module.css';
import styles from '../index.module.css';

export type TodayCourseItem = {
  id: string;
  title: string;
  timeText: string;
  durationText: string;
  coachName: string;
  locationText: string;
  statusText?: string;
  queueHintText?: string;
  actionText?: string;
};

export type TodayCoursePanelProps = {
  items: TodayCourseItem[];
  anomalyCount?: number;
  onViewAll?: () => void;
  onViewDetail?: (id: string) => void;
};

const isAnomalyStatus = (statusText?: string) => statusText === '未到场' || statusText === '已取消';

export default function TodayCoursePanel({
  items,
  anomalyCount = 0,
  onViewAll,
  onViewDetail,
}: TodayCoursePanelProps) {
  return (
    <SectionCard
      title="今日执行队列"
      subtitle={`${new Date().toLocaleDateString('zh-CN')} · 先确认，再签到，再回访`}
      extra={
        onViewAll ? (
          <Button type="text" className={styles.sectionAction} onClick={onViewAll}>
            去预约管理
          </Button>
        ) : null
      }
    >
      {anomalyCount > 0 ? (
        <div className={styles.todayAlertBar}>存在异常任务 {anomalyCount} 项，建议优先处理回访与补位。</div>
      ) : null}

      {items.length > 0 ? (
        <div className={`${widgetCls.recordListDense} ${styles.todayList}`}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${widgetCls.recordItem} ${widgetCls.dashboardCourseItem} ${styles.itemButtonReset} ${styles.todayItem} ${isAnomalyStatus(item.statusText) ? styles.todayItemAnomaly : ''}`}
              onClick={() => onViewDetail?.(item.id)}
            >
              <div className={widgetCls.recordMeta}>
                <div className={widgetCls.dashboardTimeBadge}>{item.timeText}</div>
                <div className={widgetCls.dashboardCourseInfo}>
                  <div className={widgetCls.recordTitle}>{item.title}</div>
                  <div className={widgetCls.recordSub}>
                    {item.coachName} · {item.locationText}
                  </div>
                  <div className={widgetCls.recordSub}>{item.durationText}</div>
                  {item.queueHintText ? <div className={styles.executionHint}>{item.queueHintText}</div> : null}
                </div>
              </div>
              <div className={widgetCls.dashboardCourseAside}>
                {item.statusText ? <StatusTag status={item.statusText} /> : null}
                {item.actionText ? <span className={styles.executionActionPill}>{item.actionText}</span> : null}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState size="compact" title="今日执行队列为空" description="当前没有可执行的课程或预约任务。" />
      )}
    </SectionCard>
  );
}
