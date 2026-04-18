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
  scheduleHintText?: string;
};

export type UpcomingBookingsPanelProps = {
  items: UpcomingBookingItem[];
  onViewDetail?: (id: string) => void;
};

export default function UpcomingBookingsPanel({ items, onViewDetail }: UpcomingBookingsPanelProps) {
  return (
    <SectionCard
      title="近期排程"
      subtitle="优先显示非今日的最近 4 条预约。"
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
                  <span className={styles.upcomingTitle} title={item.title}>{item.title}</span>
                  {item.tagText ? <StatusTag status={item.tagText} /> : null}
                </div>
                <div className={styles.upcomingMeta}>{item.metaText}</div>
                {item.scheduleHintText ? <div className={styles.upcomingHint}>{item.scheduleHintText}</div> : null}
              </div>
            </button>
            ))}
        </div>
      ) : (
        <EmptyState size="compact" title="近期暂无排程" description="未来几天暂无可展示的预约安排。" />
      )}
    </SectionCard>
  );
}
