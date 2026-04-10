import widgetCls from '@/styles/widgets.module.css';
import styles from '../index.module.css';

export type CourseDetailOverviewCardProps = {
  eyebrow: string;
  name: string;
  summaryText: string;
  typeLabel: string;
  levelLabel: string;
  statusLabel: string;
  statusTone: 'active' | 'inactive';
  coachName: string;
  durationText: string;
  capacityText: string;
  sessionCountText: string;
};

export default function CourseDetailOverviewCard({
  eyebrow,
  name,
  summaryText,
  typeLabel,
  levelLabel,
  statusLabel,
  statusTone,
  coachName,
  durationText,
  capacityText,
  sessionCountText,
}: CourseDetailOverviewCardProps) {
  return (
    <section className={styles.courseOverviewCard}>
      <div className={styles.courseOverviewHeader}>
        <div className={styles.courseOverviewCopy}>
          <div className={styles.courseEyebrow}>{eyebrow}</div>
          <h2 className={styles.courseOverviewTitle}>{name}</h2>
          <p className={styles.courseOverviewSummary}>{summaryText}</p>
        </div>

        <div className={styles.courseOverviewAside}>
          <div className={`${widgetCls.chipRow} ${styles.courseChipGroup}`}>
            <span className={widgetCls.chipPrimary}>{typeLabel}</span>
            <span className={widgetCls.chipLevel}>{levelLabel}</span>
            <span className={statusTone === 'active' ? styles.courseStatusChipActive : styles.courseStatusChipInactive}>
              {statusLabel}
            </span>
          </div>
          <span className={styles.courseScheduleBadge}>{sessionCountText}</span>
        </div>
      </div>

      <div className={widgetCls.detailOverviewStatGrid}>
        <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
          <div className={widgetCls.detailInsightLabel}>授课教练</div>
          <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{coachName}</div>
        </div>
        <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
          <div className={widgetCls.detailInsightLabel}>课程时长</div>
          <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{durationText}</div>
        </div>
        <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
          <div className={widgetCls.detailInsightLabel}>课程容量</div>
          <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{capacityText}</div>
        </div>
      </div>
    </section>
  );
}
