import MemberAvatar from '@/components/MemberAvatar';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import type { AccentTone } from '@/types';
import styles from '../index.module.css';

export type CoachProfileOverviewCardProps = {
  name: string;
  coachCodeText: string;
  statusLabel: string;
  phoneText: string;
  emailText: string;
  experienceText: string;
  ratingText: string;
  specialtiesText: string;
  summaryText: string;
  tone: AccentTone;
};

export default function CoachProfileOverviewCard({
  name,
  coachCodeText,
  statusLabel,
  phoneText,
  emailText,
  experienceText,
  ratingText,
  specialtiesText,
  summaryText,
  tone,
}: CoachProfileOverviewCardProps) {
  return (
    <section className={`${widgetCls.detailOverviewPanel} ${styles.coachProfileOverviewCard}`}>
      <div className={styles.coachProfileTop}>
        <div className={styles.coachProfileIdentity}>
          <MemberAvatar name={name} tone={tone} />
          <div>
            <div className={styles.coachProfileBadges}>
              <span className={styles.coachProfileEyebrow}>教练档案</span>
              <StatusTag status={statusLabel} />
            </div>
            <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>{name}</div>
            <div className={widgetCls.recordSub}>{specialtiesText}</div>
          </div>
        </div>
        <span className={styles.coachCodeBadge}>{coachCodeText}</span>
      </div>

      <div className={styles.coachProfileMetaGrid}>
        <div className={styles.coachProfileMetaCard}>
          <div className={styles.coachMetaLabel}>联系方式</div>
          <div className={styles.coachMetaValue}>{phoneText}</div>
          <div className={styles.coachMetaSub}>{emailText}</div>
        </div>
        <div className={styles.coachProfileMetaCard}>
          <div className={styles.coachMetaLabel}>教练经验</div>
          <div className={styles.coachMetaValue}>{experienceText}</div>
        </div>
        <div className={styles.coachProfileMetaCard}>
          <div className={styles.coachMetaLabel}>学员评分</div>
          <div className={styles.coachMetaValue}>{ratingText}</div>
        </div>
      </div>

      <div className={styles.coachProfileSummaryCard}>
        <div className={styles.coachMetaLabel}>概览摘要</div>
        <div className={widgetCls.detailOverviewText}>{summaryText}</div>
      </div>
    </section>
  );
}
