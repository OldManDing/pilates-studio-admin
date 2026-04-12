import { Button, Progress } from 'antd';
import { ArrowRightOutlined, CrownOutlined } from '@ant-design/icons';
import SectionCard from '@/components/SectionCard';
import pageCls from '@/styles/page.module.css';
import styles from '../index.module.css';

export type MembershipOverviewCardProps = {
  tierLabel: string;
  planName: string;
  expiryDateText: string;
  benefitText: string;
  remainingDaysText: string;
  progressPercent?: number;
  onViewDetail?: () => void;
  onPrimaryAction?: () => void;
};

export default function MembershipOverviewCard({
  tierLabel,
  planName,
  expiryDateText,
  benefitText,
  remainingDaysText,
  progressPercent,
  onViewDetail,
  onPrimaryAction,
}: MembershipOverviewCardProps) {
  return (
    <SectionCard
      title="会员概览"
      subtitle="仅保留会员运营摘要。"
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
          </div>
          <div className={styles.membershipDetailGroup}>
            <div className={styles.membershipDetailLabel}>当前摘要</div>
            <div className={styles.membershipDetailValue}>{benefitText}</div>
          </div>
        </div>

        <div className={styles.membershipMetaGrid}>
          <div className={styles.membershipMetaCard}>
            <div className={styles.membershipDetailLabel}>本月变化</div>
            <div className={styles.membershipPrimaryValue}>{expiryDateText}</div>
          </div>
          <div className={styles.membershipMetaCard}>
            <div className={styles.membershipDetailLabel}>运营指标</div>
            <div className={styles.membershipSecondaryValue}>{remainingDaysText}</div>
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
          <span className={styles.membershipProgressText}>{remainingDaysText}</span>
        </div>

        {onPrimaryAction ? (
          <Button
            type="primary"
            size="large"
            className={`${pageCls.cardActionPrimary} ${styles.membershipPrimaryAction}`}
            onClick={onPrimaryAction}
          >
            去预约管理处理
            <ArrowRightOutlined />
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}
