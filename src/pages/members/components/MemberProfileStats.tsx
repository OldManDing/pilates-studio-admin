import SectionCard from '@/components/SectionCard';
import styles from '../index.module.css';

export type MemberProfileStatsProps = {
  items: Array<{
    key: string;
    label: string;
    value: string;
    hint?: string;
  }>;
};

export default function MemberProfileStats({ items }: MemberProfileStatsProps) {
  return (
    <SectionCard title="会员概览" subtitle="提炼当前会籍、身份与训练节奏的核心信息。">
      <div className={styles.profileStatGrid}>
        {items.map((item) => (
          <div key={item.key} className={styles.profileStatCard}>
            <div className={styles.profileMetaLabel}>{item.label}</div>
            <div className={styles.profileStatValue}>{item.value}</div>
            <div className={styles.profileMetaSub}>{item.hint || '—'}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
