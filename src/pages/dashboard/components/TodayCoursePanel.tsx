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
};

export type TodayCoursePanelProps = {
  items: TodayCourseItem[];
  onViewAll?: () => void;
  onViewDetail?: (id: string) => void;
};

export default function TodayCoursePanel({ items, onViewAll, onViewDetail }: TodayCoursePanelProps) {
  return (
    <SectionCard
      title="今日课程"
      subtitle={`${new Date().toLocaleDateString('zh-CN')} · 今日课程摘要`}
      extra={
        onViewAll ? (
          <Button type="text" className={styles.sectionAction} onClick={onViewAll}>
            查看全部
          </Button>
        ) : null
      }
    >
      {items.length > 0 ? (
        <div className={widgetCls.recordListDense}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${widgetCls.recordItem} ${widgetCls.dashboardCourseItem} ${styles.itemButtonReset}`}
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
                </div>
              </div>
              <div className={widgetCls.dashboardCourseAside}>
                {item.statusText ? <StatusTag status={item.statusText} /> : null}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState size="compact" title="今日暂无课程" description="当前没有可展示的课程安排。" />
      )}
    </SectionCard>
  );
}
