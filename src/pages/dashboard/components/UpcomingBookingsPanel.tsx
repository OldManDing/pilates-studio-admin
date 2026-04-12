import { Button } from 'antd';
import EmptyState from '@/components/EmptyState';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import styles from '../index.module.css';

export type UpcomingBookingItem = {
  id: string;
  dayText: string;
  weekdayText: string;
  title: string;
  metaText: string;
  tagText?: string;
};

export type UpcomingBookingsPanelProps = {
  items: UpcomingBookingItem[];
  onViewAll?: () => void;
  onViewDetail?: (id: string) => void;
};

export default function UpcomingBookingsPanel({ items, onViewAll, onViewDetail }: UpcomingBookingsPanelProps) {
  return (
    <SectionCard
      title="近期安排"
      subtitle="最近预约摘要。"
      extra={
        onViewAll ? (
          <Button type="text" className={styles.sectionAction} onClick={onViewAll}>
            全部预约
          </Button>
        ) : null
      }
    >
      {items.length > 0 ? (
        <div className={styles.upcomingList}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.upcomingItem}
              onClick={() => onViewDetail?.(item.id)}
            >
              <div className={styles.upcomingDateBlock}>
                <div className={styles.upcomingDay}>{item.dayText}</div>
                <div className={styles.upcomingWeekday}>{item.weekdayText}</div>
              </div>
              <div className={styles.upcomingDivider} />
              <div className={styles.upcomingBody}>
                <div className={styles.upcomingTitleRow}>
                  <span className={styles.upcomingTitle}>{item.title}</span>
                  {item.tagText ? <StatusTag status={item.tagText} /> : null}
                </div>
                <div className={styles.upcomingMeta}>{item.metaText}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState size="compact" title="近期暂无预约" description="当前没有可展示的预约安排。" />
      )}
    </SectionCard>
  );
}
