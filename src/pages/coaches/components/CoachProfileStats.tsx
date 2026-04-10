import SectionCard from '@/components/SectionCard';
import styles from '../index.module.css';

export type CoachProfileStatItem = {
  key: string;
  label: string;
  value: string;
  hint: string;
};

export type CoachProfileStatsProps = {
  items: CoachProfileStatItem[];
};

export default function CoachProfileStats({ items }: CoachProfileStatsProps) {
  return (
    <SectionCard title="教练概览" subtitle="用紧凑指标快速查看评分、专长与资质信息是否完整。">
      <div className={styles.coachStatGrid}>
        {items.map((item) => (
          <div key={item.key} className={styles.coachStatCard}>
            <div className={styles.coachStatLabel}>{item.label}</div>
            <div className={styles.coachStatValue}>{item.value}</div>
            <div className={styles.coachStatHint}>{item.hint}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
