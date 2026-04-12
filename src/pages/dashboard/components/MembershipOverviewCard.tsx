import { Button, Progress } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import SectionCard from '@/components/SectionCard';
import styles from '../index.module.css';

export type MembershipOverviewCardProps = {
  tierLabel: string;
  planName: string;
  conclusionText: string;
  supportMetricOneLabel: string;
  supportMetricOneText: string;
  supportMetricTwoLabel: string;
  supportMetricTwoText: string;
  progressPercent?: number;
  progressText: string;
  onViewDetail?: () => void;
};

export default function MembershipOverviewCard({
  tierLabel,
  planName,
  conclusionText,
  supportMetricOneLabel,
  supportMetricOneText,
  supportMetricTwoLabel,
  supportMetricTwoText,
  progressPercent,
  progressText,
  onViewDetail,
}: MembershipOverviewCardProps) {
  return (
    <SectionCard
      title="会员概览"
      subtitle="会员状态摘要"
      extra={
        onViewDetail ? (
          <Button type="text" className={styles.sectionAction} onClick={onViewDetail}>
            详情
          </Button>
        ) : null
      }
    >
      <div className={styles.membershipCard}>
        <div className={styles.membershipCardTop}>
          <div>
            <div className={styles.membershipTierRow}>
              <span className={styles.membershipTierBadge}>
                <CrownOutlined />
                {tierLabel}
              </span>
              <span className={styles.membershipPlanName}>{planName}</span>
            </div>
            <div className={styles.membershipConclusion}>{conclusionText}</div>
          </div>
        </div>

        <div className={styles.membershipMetaGrid}>
          <div className={styles.membershipMetaCard}>
            <div className={styles.membershipDetailLabel}>{supportMetricOneLabel}</div>
            <div className={styles.membershipPrimaryValue}>{supportMetricOneText}</div>
          </div>
          <div className={styles.membershipMetaCard}>
            <div className={styles.membershipDetailLabel}>{supportMetricTwoLabel}</div>
            <div className={styles.membershipSecondaryValue}>{supportMetricTwoText}</div>
          </div>
        </div>

        <div className={styles.membershipProgressWrap}>
          <Progress
            percent={progressPercent ?? 0}
            showInfo={false}
            strokeColor="linear-gradient(90deg, var(--mint) 0%, var(--control-primary-end) 100%)"
            trailColor="rgba(31, 42, 51, 0.06)"
            className={styles.membershipProgress}
          />
          <span className={styles.membershipProgressText}>{progressText}</span>
        </div>
      </div>
    </SectionCard>
  );
}
